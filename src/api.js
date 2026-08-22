/**
 * API route handlers.
 *
 * Sign-in lives in oauth.js; /api/items is public because the catalogue is not
 * user data and Phase 3 needs to render it before login. Everything
 * user-scoped is gated on a session by worker.js.
 */

import {
  authenticate,
  deleteSession,
  readCookie,
  SESSION_COOKIE,
  clearedSessionCookie,
} from "./auth.js";
import { consolidateItems } from "./consolidate.js";

const DEFAULT_TIMEZONE = "America/New_York";

const WATCH_STATUSES = new Set(["unwatched", "watched", "want_rewatch", "skip"]);
const WATCHLIST_SORTS = new Set(["release", "chronological"]);
const SOURCES = new Set(["mcu", "other"]);
const TIMEZONES = new Set([
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
]);
const FEEDBACK_TYPES = new Set(["Wrong data", "Missing data", "Bug report", "Other"]);

/**
 * True only for real calendar dates in YYYY-MM-DD form.
 *
 * Date.parse alone is not enough: when the strict ISO parse fails, V8 falls
 * back to a lenient legacy parser that happily turns "2027-02-31" into March
 * 3rd instead of reporting it as invalid. Round-tripping the components back
 * out of the Date is what actually catches an overflowed day or month.
 */
function isCalendarDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

/**
 * Marks a response as belonging to one specific signed-in user.
 *
 * Nothing caches these today, but a zone-level "cache everything" rule added
 * later would otherwise be free to store one user's watch list and serve it to
 * the next caller. `private` bars shared caches outright and `no-store` stops
 * even the browser writing it to disk, so the guarantee does not depend on the
 * zone's cache configuration staying as it is.
 *
 * Deliberately NOT applied to /api/items: the catalogue is identical for
 * everyone and benefits from being cacheable.
 */
export const PRIVATE_CACHE_CONTROL = "private, no-store";

export function privateJson(data, status = 200, headers = {}) {
  return json(data, status, { "cache-control": PRIVATE_CACHE_CONTROL, ...headers });
}

export function error(message, status = 400, headers = {}) {
  return json({ error: message }, status, headers);
}

async function readJsonBody(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    throw new HttpError("Expected content-type: application/json", 415);
  }
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw new HttpError("Request body must be a JSON object", 400);
    }
    return body;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError("Request body is not valid JSON", 400);
  }
}

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/* -------------------------------------------------------------------- auth */

export async function handleLogout(request, env) {
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (sessionId) await deleteSession(env, sessionId);
  // Always clear the cookie, even if the session was already gone.
  return privateJson({ ok: true }, 200, { "set-cookie": clearedSessionCookie() });
}

/* ------------------------------------------------------------------- items */

export async function handleListItems(request, env) {
  // Ordered by id: the seed preserves the spreadsheet's curated running order,
  // which is more meaningful than sorting by a partially-known release date.
  // Pages that need a different order (release date, chronological) sort
  // client-side from this one response rather than each fetching their own
  // shape — /api/items stays the single source of catalogue data.
  const { results } = await env.DB.prepare(
    `SELECT id, title, type, release_date, phase, runtime_min, notes, is_estimate,
            chrono_order, chrono_setting
       FROM items
      ORDER BY id`
  ).all();

  return json({
    items: results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1 })),
  });
}

/**
 * Franchises collapsed to one row each: entry count, first release date, and
 * the ids of every member so the client can still show/link individual
 * entries on demand. Grouped in JS from a plain items query — there is no
 * separate consolidated table, so this and /api/items can never disagree
 * about what a franchise contains. See consolidate.js for the grouping rules
 * and their known, documented divergence from the original spreadsheet.
 */
export async function handleConsolidated(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, type, release_date, phase, runtime_min, is_estimate
       FROM items
      ORDER BY id`
  ).all();

  const items = results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1 }));

  // /api/consolidated is deliberately public (no unauthorized() gate — see
  // the module doc comment), so the caller may or may not be signed in;
  // resolve the optional session here rather than requiring one, and fall
  // back to the same default every unauthenticated caller gets.
  const user = await authenticate(request, env);
  const timezone = user ? await lookupUserTimezone(env, user.user_id) : DEFAULT_TIMEZONE;

  return json({ groups: consolidateItems(items, timezone) });
}

async function lookupUserTimezone(env, userId) {
  const row = await env.DB.prepare("SELECT timezone FROM user_settings WHERE user_id = ?")
    .bind(userId)
    .first();
  return row?.timezone ?? DEFAULT_TIMEZONE;
}

/* ------------------------------------------------------------ other universes */

export async function handleOtherUniverses(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT id, universe, title, setting, release_date, runtime_min, notes
       FROM other_universes
      ORDER BY id`
  ).all();

  // Flagged so a watchlist form merging this with /api/items can tell the two
  // id spaces apart — other_universes.id is independent of items.id and is
  // not a valid watchlist item_id (the FK only accepts items.id).
  return json({ other_universes: results.map((r) => ({ ...r, source: "other" })) });
}

/* ------------------------------------------------------------ watch status */

// Season-level rows only, matching the pre-episode-tracking shape every
// existing caller (release.js, chronological.js, dashboard.js) expects.
export async function handleGetWatchStatus(request, env, user) {
  const { results } = await env.DB.prepare(
    `SELECT item_id, source, status, episode_progress, updated_at
       FROM watch_status
      WHERE user_id = ? AND episode_id = 0
      ORDER BY source, item_id`
  )
    .bind(user.user_id)
    .all();

  return privateJson({
    watch_status: results.map((r) => ({
      ...r,
      episode_progress: parseProgress(r.episode_progress),
    })),
  });
}

function parseProgress(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Stored value predates validation or was written by hand — surface it as
    // raw text rather than failing the whole request.
    return raw;
  }
}

export async function handlePutWatchStatus(request, env, user, itemId, source) {
  const body = await readJsonBody(request);

  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);
  if (!SOURCES.has(source)) {
    return error(`source must be one of: ${[...SOURCES].join(", ")}`, 400);
  }

  const table = source === "other" ? "other_universes" : "items";
  const exists = await env.DB.prepare(`SELECT 1 AS ok FROM ${table} WHERE id = ?`)
    .bind(itemId)
    .first();
  if (!exists) return error("No such item", 404);

  const hasStatus = Object.hasOwn(body, "status");
  const hasProgress = Object.hasOwn(body, "episode_progress");
  if (!hasStatus && !hasProgress) {
    return error("Provide at least one of: status, episode_progress", 400);
  }

  let status;
  if (hasStatus) {
    status = String(body.status);
    if (!WATCH_STATUSES.has(status)) {
      return error(
        `status must be one of: ${[...WATCH_STATUSES].join(", ")}`,
        400
      );
    }
  }

  let progress;
  if (hasProgress) {
    const p = body.episode_progress;
    if (p === null) {
      progress = null;
    } else if (typeof p === "object") {
      progress = JSON.stringify(p);
    } else {
      return error("episode_progress must be a JSON object, array, or null", 400);
    }
  }

  // A partial update must not clobber the field it did not mention, so the
  // current row supplies the defaults for whatever the caller omitted.
  const existing = await env.DB.prepare(
    "SELECT status, episode_progress FROM watch_status WHERE user_id = ? AND item_id = ? AND source = ? AND episode_id = 0"
  )
    .bind(user.user_id, itemId, source)
    .first();

  const finalStatus = hasStatus ? status : existing?.status ?? "unwatched";
  const finalProgress = hasProgress ? progress : existing?.episode_progress ?? null;

  await env.DB.prepare(
    `INSERT INTO watch_status (user_id, item_id, source, episode_id, status, episode_progress, updated_at)
     VALUES (?, ?, ?, 0, ?, ?, datetime('now'))
     ON CONFLICT(user_id, item_id, source, episode_id) DO UPDATE SET
       status = excluded.status,
       episode_progress = excluded.episode_progress,
       updated_at = excluded.updated_at`
  )
    .bind(user.user_id, itemId, source, finalStatus, finalProgress)
    .run();

  const row = await env.DB.prepare(
    `SELECT item_id, source, status, episode_progress, updated_at
       FROM watch_status WHERE user_id = ? AND item_id = ? AND source = ? AND episode_id = 0`
  )
    .bind(user.user_id, itemId, source)
    .first();

  return privateJson({ watch_status: { ...row, episode_progress: parseProgress(row.episode_progress) } });
}

/* -------------------------------------------------------------- episodes */

export async function handleGetItemEpisodes(request, env, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);

  const { results } = await env.DB.prepare(
    `SELECT id, episode_number, title, runtime_min, is_estimate
       FROM episodes
      WHERE item_id = ?
      ORDER BY episode_number`
  )
    .bind(itemId)
    .all();

  return json({
    episodes: results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1 })),
  });
}

/**
 * Episode-aware watch status save. Same contract as PUT /api/watch-status/:id
 * but accepts an optional episode_id — omitted or 0 means season-level,
 * matching the sentinel the 0009 migration standardized on.
 */
export async function handlePostWatch(request, env, user) {
  const body = await readJsonBody(request);

  const itemId = Number(body.item_id);
  if (!Number.isInteger(itemId) || itemId < 1) return error("item_id must be a positive integer", 400);

  const source = String(body.source ?? "mcu");
  if (!SOURCES.has(source)) {
    return error(`source must be one of: ${[...SOURCES].join(", ")}`, 400);
  }

  const hasEpisodeId = Object.hasOwn(body, "episode_id") && body.episode_id !== null;
  const episodeId = hasEpisodeId ? Number(body.episode_id) : 0;
  if (!Number.isInteger(episodeId) || episodeId < 0) {
    return error("episode_id must be a positive integer or null", 400);
  }

  const table = source === "other" ? "other_universes" : "items";
  const exists = await env.DB.prepare(`SELECT 1 AS ok FROM ${table} WHERE id = ?`)
    .bind(itemId)
    .first();
  if (!exists) return error("No such item", 404);

  if (episodeId !== 0) {
    const episodeExists = await env.DB.prepare(
      "SELECT 1 AS ok FROM episodes WHERE id = ? AND item_id = ?"
    )
      .bind(episodeId, itemId)
      .first();
    if (!episodeExists) return error("No such episode for this item", 404);
  }

  if (!Object.hasOwn(body, "status")) return error("status is required", 400);
  const status = String(body.status);
  if (!WATCH_STATUSES.has(status)) {
    return error(`status must be one of: ${[...WATCH_STATUSES].join(", ")}`, 400);
  }

  await env.DB.prepare(
    `INSERT INTO watch_status (user_id, item_id, source, episode_id, status, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, item_id, source, episode_id) DO UPDATE SET
       status = excluded.status,
       updated_at = excluded.updated_at`
  )
    .bind(user.user_id, itemId, source, episodeId, status)
    .run();

  const row = await env.DB.prepare(
    `SELECT item_id, source, episode_id, status, updated_at
       FROM watch_status WHERE user_id = ? AND item_id = ? AND source = ? AND episode_id = ?`
  )
    .bind(user.user_id, itemId, source, episodeId)
    .first();

  return privateJson({ watch_status: row });
}

/** All episode-level watch statuses for one item, for the signed-in user. */
export async function handleGetWatchEpisodes(request, env, user, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);

  const { results } = await env.DB.prepare(
    `SELECT episode_id, status, updated_at
       FROM watch_status
      WHERE user_id = ? AND item_id = ? AND episode_id != 0
      ORDER BY episode_id`
  )
    .bind(user.user_id, itemId)
    .all();

  return privateJson({ watch_status: results });
}

/* --------------------------------------------------------------- watchlist */

const WATCHLIST_SOURCES = SOURCES;

async function selectWatchlist(env, userId) {
  const { results } = await env.DB.prepare(
    "SELECT item_id, source FROM watchlist WHERE user_id = ? ORDER BY source, item_id"
  )
    .bind(userId)
    .all();
  return results.map((r) => ({ item_id: r.item_id, source: r.source }));
}

export async function handleGetWatchlist(request, env, user) {
  return privateJson({ watchlist: await selectWatchlist(env, user.user_id) });
}

export async function handlePostWatchlist(request, env, user) {
  const body = await readJsonBody(request);

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return error("items must be a non-empty array of { item_id, source }", 400);
  }

  const entries = [];
  for (const raw of body.items) {
    if (raw === null || typeof raw !== "object") {
      return error("Each item must be an object with item_id and source", 400);
    }
    const id = Number(raw.item_id);
    if (!Number.isInteger(id) || id < 1) {
      return error("item_id must be a positive integer", 400);
    }
    const source = String(raw.source ?? "mcu");
    if (!WATCHLIST_SOURCES.has(source)) {
      return error(`source must be one of: ${[...WATCHLIST_SOURCES].join(", ")}`, 400);
    }
    entries.push({ id, source });
  }

  // INSERT OR IGNORE makes duplicate entries in the batch, and entries
  // already on the watchlist, silent no-ops rather than errors — the
  // UNIQUE(user_id, item_id, source) constraint is what "ignores duplicates"
  // leans on.
  const statements = entries.map((entry) =>
    env.DB.prepare(
      "INSERT OR IGNORE INTO watchlist (user_id, item_id, source) VALUES (?, ?, ?)"
    ).bind(user.user_id, entry.id, entry.source)
  );
  await env.DB.batch(statements);

  return privateJson({ watchlist: await selectWatchlist(env, user.user_id) });
}

export async function handleDeleteWatchlistItem(request, env, user, itemId, source) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);
  if (!WATCHLIST_SOURCES.has(source)) {
    return error(`source must be one of: ${[...WATCHLIST_SOURCES].join(", ")}`, 400);
  }

  await env.DB.prepare(
    "DELETE FROM watchlist WHERE user_id = ? AND item_id = ? AND source = ?"
  )
    .bind(user.user_id, itemId, source)
    .run();

  return privateJson({ ok: true });
}

/* ------------------------------------------------------------------- admin */

const ADMIN_ITEM_FIELDS = new Set([
  "title",
  "type",
  "release_date",
  "phase",
  "runtime_min",
  "is_estimate",
  "chrono_order",
  "chrono_setting",
  "notes",
]);

// Same "generic placeholder" rule shell.js's looksGeneric() uses client-side
// for episode rows — kept in sync by hand since one runs in the Worker and
// the other is inlined into the browser bundle.
function episodeTitleIsGeneric(title, episodeNumber) {
  if (!title) return true;
  const t = String(title).trim().toLowerCase();
  return t === "" || t === "episode " + episodeNumber || /^episode\s+0*\d+$/.test(t);
}

export async function handleAdminAudit(request, env) {
  const [
    missingRuntime,
    estimatedRuntime,
    missingReleaseDate,
    missingPhase,
    missingChrono,
    episodeRows,
  ] = await Promise.all([
    env.DB.prepare(
      "SELECT id, title, type, runtime_min FROM items WHERE runtime_min IS NULL ORDER BY id"
    ).all(),
    env.DB.prepare(
      "SELECT id, title, type, runtime_min FROM items WHERE is_estimate = 1 ORDER BY id"
    ).all(),
    env.DB.prepare(
      "SELECT id, title, type, release_date FROM items WHERE release_date IS NULL ORDER BY id"
    ).all(),
    env.DB.prepare(
      "SELECT id, title, type, phase FROM items WHERE phase IS NULL ORDER BY id"
    ).all(),
    // "Known unplaced" mirrors chronological.js: items with no announced
    // in-universe setting are expected to lack chrono_order, so only flag
    // items that DO have a setting but are still missing their order.
    env.DB.prepare(
      `SELECT id, title, type, chrono_order FROM items
        WHERE chrono_order IS NULL AND chrono_setting IS NOT NULL
        ORDER BY id`
    ).all(),
    env.DB.prepare(
      `SELECT e.id, e.item_id, e.episode_number, e.title, i.title AS item_title, i.type AS item_type
         FROM episodes e
         JOIN items i ON i.id = e.item_id
        ORDER BY e.item_id, e.episode_number`
    ).all(),
  ]);

  const byItem = new Map();
  for (const row of episodeRows.results) {
    if (!episodeTitleIsGeneric(row.title, row.episode_number)) continue;
    if (!byItem.has(row.item_id)) {
      byItem.set(row.item_id, {
        item_id: row.item_id,
        item_title: row.item_title,
        item_type: row.item_type,
        episodes: [],
      });
    }
    byItem.get(row.item_id).episodes.push({
      id: row.id,
      episode_number: row.episode_number,
      title: row.title,
    });
  }
  const missingEpisodeNames = [...byItem.values()].sort((a, b) => a.item_id - b.item_id);

  return privateJson({
    audit: {
      missing_runtime: missingRuntime.results,
      estimated_runtime: estimatedRuntime.results,
      missing_release_date: missingReleaseDate.results,
      missing_phase: missingPhase.results,
      missing_chrono_order: missingChrono.results,
      missing_episode_names: missingEpisodeNames,
    },
  });
}

/* --------------------------------------------------------- admin episodes */

function validateEpisodeInput(raw) {
  const episodeNumber = Number(raw.episode_number);
  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    throw new HttpError("episode_number must be a positive integer", 400);
  }
  const title = raw.title === null || raw.title === undefined ? null : String(raw.title).trim() || null;

  let runtimeMin = null;
  if (raw.runtime_min !== null && raw.runtime_min !== undefined && raw.runtime_min !== "") {
    runtimeMin = Number(raw.runtime_min);
    if (!Number.isFinite(runtimeMin)) throw new HttpError("runtime_min must be a number or null", 400);
  }

  const isEstimate = raw.is_estimate ? 1 : 0;

  return { episode_number: episodeNumber, title, runtime_min: runtimeMin, is_estimate: isEstimate };
}

/** Replaces every episode of one item with the given list — delete then bulk insert. */
export async function handleAdminReplaceEpisodes(request, env, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);

  const body = await readJsonBody(request);
  if (!Array.isArray(body.episodes)) return error("episodes must be an array", 400);

  const exists = await env.DB.prepare("SELECT 1 AS ok FROM items WHERE id = ?").bind(itemId).first();
  if (!exists) return error("No such item", 404);

  let parsed;
  try {
    parsed = body.episodes.map(validateEpisodeInput);
  } catch (err) {
    if (err instanceof HttpError) return error(err.message, err.status);
    throw err;
  }

  const statements = [
    env.DB.prepare("DELETE FROM episodes WHERE item_id = ?").bind(itemId),
    ...parsed.map((ep) =>
      env.DB.prepare(
        "INSERT INTO episodes (item_id, episode_number, title, runtime_min, is_estimate) VALUES (?, ?, ?, ?, ?)"
      ).bind(itemId, ep.episode_number, ep.title, ep.runtime_min, ep.is_estimate)
    ),
  ];
  await env.DB.batch(statements);

  const { results } = await env.DB.prepare(
    `SELECT id, episode_number, title, runtime_min, is_estimate
       FROM episodes WHERE item_id = ? ORDER BY episode_number`
  )
    .bind(itemId)
    .all();

  return privateJson({
    episodes: results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1 })),
  });
}

export async function handleAdminListItems(request, env) {
  const { results } = await env.DB.prepare(
    `SELECT id, title, type, release_date, phase, runtime_min, notes, is_estimate,
            chrono_order, chrono_setting
       FROM items
      ORDER BY id`
  ).all();

  return privateJson({
    items: results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1 })),
  });
}

export async function handleAdminPatchItem(request, env, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);

  const body = await readJsonBody(request);
  const fields = Object.keys(body).filter((k) => ADMIN_ITEM_FIELDS.has(k));
  if (fields.length === 0) {
    return error(`Provide at least one of: ${[...ADMIN_ITEM_FIELDS].join(", ")}`, 400);
  }

  const exists = await env.DB.prepare("SELECT 1 AS ok FROM items WHERE id = ?")
    .bind(itemId)
    .first();
  if (!exists) return error("No such item", 404);

  const values = [];
  for (const field of fields) {
    let value = body[field];
    if (field === "is_estimate") {
      value = value ? 1 : 0;
    } else if (field === "runtime_min" || field === "chrono_order") {
      if (value !== null && value !== undefined) {
        value = Number(value);
        if (!Number.isFinite(value)) return error(`${field} must be a number or null`, 400);
      } else {
        value = null;
      }
    } else if (field === "release_date") {
      if (value !== null && value !== undefined) {
        value = String(value).trim();
        if (!isCalendarDate(value) && !/^\d{4}-\d{2}(-00)?$/.test(value)) {
          return error("release_date must be a YYYY-MM-DD date or null", 400);
        }
      } else {
        value = null;
      }
    } else {
      value = value === null || value === undefined ? null : String(value);
    }
    values.push(value);
  }

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  await env.DB.prepare(`UPDATE items SET ${setClause} WHERE id = ?`)
    .bind(...values, itemId)
    .run();

  const row = await env.DB.prepare(
    `SELECT id, title, type, release_date, phase, runtime_min, notes, is_estimate,
            chrono_order, chrono_setting
       FROM items WHERE id = ?`
  )
    .bind(itemId)
    .first();

  return privateJson({ item: { ...row, is_estimate: row.is_estimate === 1 } });
}

/* ---------------------------------------------------------------- settings */

export async function handleGetStats(request, env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS user_count FROM users").first();
  return json({ user_count: row.user_count });
}

export async function handleGetSettings(request, env, user) {
  const row = await env.DB.prepare(
    "SELECT countdown_target_date, countdown_label, watchlist_sort, timezone FROM user_settings WHERE user_id = ?"
  )
    .bind(user.user_id)
    .first();

  return privateJson({
    settings: {
      countdown_target_date: row?.countdown_target_date ?? null,
      countdown_label: row?.countdown_label ?? null,
      watchlist_sort: row?.watchlist_sort ?? "release",
      timezone: row?.timezone ?? "America/New_York",
    },
  });
}

export async function handlePutSettings(request, env, user) {
  const body = await readJsonBody(request);

  const existing = await env.DB.prepare(
    "SELECT countdown_target_date, countdown_label, watchlist_sort, timezone FROM user_settings WHERE user_id = ?"
  )
    .bind(user.user_id)
    .first();

  const hasDate = Object.hasOwn(body, "countdown_target_date");
  let date = hasDate ? null : existing?.countdown_target_date ?? null;
  if (hasDate && body.countdown_target_date !== null && body.countdown_target_date !== undefined) {
    date = String(body.countdown_target_date).trim();
    if (!isCalendarDate(date)) {
      return error("countdown_target_date must be a YYYY-MM-DD date or null", 400);
    }
  }

  const hasLabel = Object.hasOwn(body, "countdown_label");
  let label = hasLabel ? null : existing?.countdown_label ?? null;
  if (hasLabel && body.countdown_label !== null && body.countdown_label !== undefined) {
    label = String(body.countdown_label).trim().slice(0, 200);
    if (label === "") label = null;
  }

  const hasSort = Object.hasOwn(body, "watchlist_sort");
  let sort = hasSort ? "release" : existing?.watchlist_sort ?? "release";
  if (hasSort && body.watchlist_sort !== null && body.watchlist_sort !== undefined) {
    sort = String(body.watchlist_sort);
    if (!WATCHLIST_SORTS.has(sort)) {
      return error(`watchlist_sort must be one of: ${[...WATCHLIST_SORTS].join(", ")}`, 400);
    }
  }

  const hasTimezone = Object.hasOwn(body, "timezone");
  let timezone = hasTimezone ? "America/New_York" : existing?.timezone ?? "America/New_York";
  if (hasTimezone && body.timezone !== null && body.timezone !== undefined) {
    timezone = String(body.timezone);
    if (!TIMEZONES.has(timezone)) {
      return error(`timezone must be one of: ${[...TIMEZONES].join(", ")}`, 400);
    }
  }

  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, countdown_target_date, countdown_label, watchlist_sort, timezone)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       countdown_target_date = excluded.countdown_target_date,
       countdown_label = excluded.countdown_label,
       watchlist_sort = excluded.watchlist_sort,
       timezone = excluded.timezone`
  )
    .bind(user.user_id, date, label, sort, timezone)
    .run();

  return privateJson({
    settings: {
      countdown_target_date: date,
      countdown_label: label,
      watchlist_sort: sort,
      timezone,
    },
  });
}

/* ------------------------------------------------------------ settings page */

export async function handleClearWatchStatus(request, env, user) {
  await env.DB.prepare("DELETE FROM watch_status WHERE user_id = ?").bind(user.user_id).run();
  return privateJson({ ok: true });
}

export async function handleResetAllData(request, env, user) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM watch_status WHERE user_id = ?").bind(user.user_id),
    env.DB.prepare("DELETE FROM watchlist WHERE user_id = ?").bind(user.user_id),
  ]);
  return privateJson({ ok: true });
}

export async function handleSubmitFeedback(request, env, user) {
  const body = await readJsonBody(request);

  if (!Object.hasOwn(body, "type")) return error("type is required", 400);
  const type = String(body.type);
  if (!FEEDBACK_TYPES.has(type)) {
    return error(`type must be one of: ${[...FEEDBACK_TYPES].join(", ")}`, 400);
  }

  if (!Object.hasOwn(body, "message")) return error("message is required", 400);
  const message = String(body.message).trim();
  if (!message) return error("message must not be empty", 400);
  if (message.length > 2000) return error("message must be 2000 characters or fewer", 400);

  let itemId = null;
  let itemTitle = null;
  if (body.item_id !== null && body.item_id !== undefined && body.item_id !== "") {
    itemId = Number(body.item_id);
    if (!Number.isInteger(itemId) || itemId < 1) {
      return error("item_id must be a positive integer or null", 400);
    }
    // item_id may point at either items.id or other_universes.id (the two
    // id spaces are independent — see the source flag other.js/api.js use
    // elsewhere), so a miss on items falls back to other_universes before
    // treating the id as genuinely unknown.
    const item = await env.DB.prepare("SELECT title FROM items WHERE id = ?").bind(itemId).first();
    if (item) {
      itemTitle = item.title;
    } else {
      const otherItem = await env.DB.prepare("SELECT title FROM other_universes WHERE id = ?")
        .bind(itemId)
        .first();
      itemTitle = otherItem ? otherItem.title : "Unknown item";
    }
  }

  await env.DB.prepare(
    "INSERT INTO feedback (user_id, type, item_id, message) VALUES (?, ?, ?, ?)"
  )
    .bind(user.user_id, type, itemId, message)
    .run();

  await notifyFeedbackWebhook(env, { type, itemTitle, message, userId: user.user_id });

  return privateJson({ ok: true });
}

const FEEDBACK_WEBHOOK_URL = "https://n8n.kjserver.dev/webhook/mcu-tracker-feedback";

/**
 * Best-effort notification to n8n once feedback is already saved — the
 * feedback row is the thing that matters, so a webhook outage (n8n down,
 * network blip) must never fail the request or roll back the insert that
 * already succeeded. Errors are logged for visibility and swallowed.
 */
async function notifyFeedbackWebhook(env, { type, itemTitle, message, userId }) {
  try {
    const userRow = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();

    const res = await fetch(FEEDBACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        item_title: itemTitle ?? "None",
        message,
        user_email: userRow?.email ?? null,
      }),
    });
    if (!res.ok) {
      console.error("feedback webhook responded with", res.status);
    }
  } catch (err) {
    console.error("feedback webhook failed", err?.stack || String(err));
  }
}

/**
 * Deletes every row this user owns, in dependency order (sessions/watch
 * data before the users row itself), then clears their session cookie. The
 * caller (worker.js) still needs the cookie cleared even though the session
 * row backing it no longer exists — clearedSessionCookie() does that the
 * same way handleLogout does.
 */
export async function handleDeleteAccount(request, env, user) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM watch_status WHERE user_id = ?").bind(user.user_id),
    env.DB.prepare("DELETE FROM watchlist WHERE user_id = ?").bind(user.user_id),
    env.DB.prepare("DELETE FROM user_settings WHERE user_id = ?").bind(user.user_id),
    env.DB.prepare("DELETE FROM feedback WHERE user_id = ?").bind(user.user_id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(user.user_id),
    env.DB.prepare("DELETE FROM users WHERE id = ?").bind(user.user_id),
  ]);

  return privateJson({ ok: true }, 200, { "set-cookie": clearedSessionCookie() });
}
