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
import { TIMEZONE_VALUES } from "./timezones.js";

const DEFAULT_TIMEZONE = "America/New_York";

const WATCH_STATUSES = new Set(["unwatched", "watched", "want_rewatch", "skip"]);
const WATCHLIST_SORTS = new Set(["release", "chronological"]);
const SOURCES = new Set(["mcu", "other"]);
const FEEDBACK_TYPES = new Set(["Wrong data", "Missing data", "Bug report", "Other"]);
// Each submission also fires the n8n webhook, so this caps notification spam
// from any one account, not just rows in the table.
const FEEDBACK_LIMIT_PER_HOUR = 3;

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
            chrono_order, chrono_setting, crossover_universe
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
  const [{ results }, { results: crossoverResults }] = await Promise.all([
    env.DB.prepare(
      `SELECT id, universe, title, setting, release_date, runtime_min, notes
         FROM other_universes
        ORDER BY id`
    ).all(),
    // MCU items with a crossover_universe browse alongside the reference
    // other_universes rows — flagged source: "mcu" (not "other") so watch
    // status and the watchlist keep using the item's real items.id/mcu
    // identity rather than treating it as a second, independent entry.
    env.DB.prepare(
      `SELECT id, title, crossover_universe, release_date, runtime_min, notes
         FROM items
        WHERE crossover_universe IS NOT NULL
        ORDER BY id`
    ).all(),
  ]);

  // Flagged so a watchlist form merging this with /api/items can tell the two
  // id spaces apart — other_universes.id is independent of items.id and is
  // not a valid watchlist item_id (the FK only accepts items.id).
  const other = results.map((r) => ({ ...r, source: "other" }));
  const crossovers = crossoverResults.map((r) => ({
    id: r.id,
    universe: r.crossover_universe,
    title: r.title,
    setting: null,
    release_date: r.release_date,
    runtime_min: r.runtime_min,
    notes: r.notes,
    source: "mcu",
  }));

  return json({ other_universes: [...other, ...crossovers] });
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
/**
 * Shape-checks one { item_id, source, episode_id, status } update, shared by
 * POST /api/watch and POST /api/watch/batch so both accept exactly the same
 * input. Throws HttpError(400); existence of the item/episode is checked by
 * each caller (one row vs. bulk lookups).
 */
function parseWatchUpdate(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError("Each update must be an object", 400);
  }

  const itemId = Number(raw.item_id);
  if (!Number.isInteger(itemId) || itemId < 1) {
    throw new HttpError("item_id must be a positive integer", 400);
  }

  const source = String(raw.source ?? "mcu");
  if (!SOURCES.has(source)) {
    throw new HttpError(`source must be one of: ${[...SOURCES].join(", ")}`, 400);
  }

  const hasEpisodeId = Object.hasOwn(raw, "episode_id") && raw.episode_id !== null;
  const episodeId = hasEpisodeId ? Number(raw.episode_id) : 0;
  if (!Number.isInteger(episodeId) || episodeId < 0) {
    throw new HttpError("episode_id must be a positive integer or null", 400);
  }

  if (!Object.hasOwn(raw, "status")) throw new HttpError("status is required", 400);
  const status = String(raw.status);
  if (!WATCH_STATUSES.has(status)) {
    throw new HttpError(`status must be one of: ${[...WATCH_STATUSES].join(", ")}`, 400);
  }

  return { itemId, source, episodeId, status };
}

function upsertWatchStatement(env, userId, u) {
  return env.DB.prepare(
    `INSERT INTO watch_status (user_id, item_id, source, episode_id, status, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, item_id, source, episode_id) DO UPDATE SET
       status = excluded.status,
       updated_at = excluded.updated_at`
  ).bind(userId, u.itemId, u.source, u.episodeId, u.status);
}

export async function handlePostWatch(request, env, user) {
  const body = await readJsonBody(request);
  const update = parseWatchUpdate(body);
  const { itemId, source, episodeId } = update;

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

  await upsertWatchStatement(env, user.user_id, update).run();

  const row = await env.DB.prepare(
    `SELECT item_id, source, episode_id, status, updated_at
       FROM watch_status WHERE user_id = ? AND item_id = ? AND source = ? AND episode_id = ?`
  )
    .bind(user.user_id, itemId, source, episodeId)
    .first();

  return privateJson({ watch_status: row });
}

// Comfortably above the largest season in the catalogue (10 episodes), and
// keeps each bulk IN (...) lookup below within D1's 100-bound-parameter limit.
const WATCH_BATCH_MAX = 100;

/** Rows of `sql` (which must end in `IN`) for the given ids, or [] for none. */
async function selectWhereIdIn(env, sql, ids) {
  if (!ids.length) return [];
  const { results } = await env.DB.prepare(`${sql} (${ids.map(() => "?").join(", ")})`)
    .bind(...ids)
    .all();
  return results;
}

/**
 * Many watch-status changes in one request — e.g. "mark all episodes
 * watched" — validated per entry exactly like POST /api/watch, then written
 * in a single D1 batch (one implicit transaction), so the request either
 * applies every update or none of them. Any invalid entry rejects the whole
 * batch, with its index in the error message.
 */
export async function handlePostWatchBatch(request, env, user) {
  const body = await readJsonBody(request);

  if (!Array.isArray(body.updates) || body.updates.length === 0) {
    return error("updates must be a non-empty array of { item_id, source, episode_id, status }", 400);
  }
  if (body.updates.length > WATCH_BATCH_MAX) {
    return error(`updates may contain at most ${WATCH_BATCH_MAX} entries`, 400);
  }

  const updates = [];
  for (const [i, raw] of body.updates.entries()) {
    try {
      updates.push(parseWatchUpdate(raw));
    } catch (err) {
      if (err instanceof HttpError) return error(`updates[${i}]: ${err.message}`, err.status);
      throw err;
    }
  }

  const unique = (values) => [...new Set(values)];
  const [mcuRows, otherRows, episodeRows] = await Promise.all([
    selectWhereIdIn(
      env,
      "SELECT id FROM items WHERE id IN",
      unique(updates.filter((u) => u.source === "mcu").map((u) => u.itemId))
    ),
    selectWhereIdIn(
      env,
      "SELECT id FROM other_universes WHERE id IN",
      unique(updates.filter((u) => u.source === "other").map((u) => u.itemId))
    ),
    selectWhereIdIn(
      env,
      "SELECT id, item_id FROM episodes WHERE id IN",
      unique(updates.filter((u) => u.episodeId !== 0).map((u) => u.episodeId))
    ),
  ]);
  const mcuIds = new Set(mcuRows.map((r) => r.id));
  const otherIds = new Set(otherRows.map((r) => r.id));
  const episodeItem = new Map(episodeRows.map((r) => [r.id, r.item_id]));

  for (const [i, u] of updates.entries()) {
    const itemExists = u.source === "other" ? otherIds.has(u.itemId) : mcuIds.has(u.itemId);
    if (!itemExists) return error(`updates[${i}]: No such item`, 404);
    if (u.episodeId !== 0 && episodeItem.get(u.episodeId) !== u.itemId) {
      return error(`updates[${i}]: No such episode for this item`, 404);
    }
  }

  await env.DB.batch(updates.map((u) => upsertWatchStatement(env, user.user_id, u)));

  return privateJson({ ok: true, count: updates.length });
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
// Above the whole catalogue (items + other_universes, ~160 rows), so the
// dashboard picker's "select everything" still fits in one save.
const WATCHLIST_SAVE_MAX = 200;

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
  if (body.items.length > WATCHLIST_SAVE_MAX) {
    return error(`items may contain at most ${WATCHLIST_SAVE_MAX} entries`, 400);
  }

  const entries = [];
  for (const raw of body.items) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
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
  "crossover_universe",
]);

// Other Universes rows have no type/phase (it's a browse-only reference
// table, not the MCU catalogue — see the other_universes migration) and use
// "universe"/"setting" in place of a franchise phase.
const ADMIN_OTHER_FIELDS = new Set([
  "title",
  "universe",
  "release_date",
  "runtime_min",
  "is_estimate",
  "chrono_order",
  "setting",
  "notes",
]);

// NOT NULL text columns: an explicit null or blank must be a 400 here rather
// than reaching the DB, where it would fail as a 500 (or, for null passed
// through String(), be stored as the literal title "null").
const ADMIN_REQUIRED_TEXT_FIELDS = new Set(["title", "type", "universe"]);

/**
 * Validates and normalizes one admin-editable column value. Shared by the
 * create and patch handlers for both tables so they accept exactly the same
 * input. Throws HttpError(400).
 */
function coerceAdminField(field, value) {
  if (ADMIN_REQUIRED_TEXT_FIELDS.has(field)) {
    const text = value === null || value === undefined ? "" : String(value).trim();
    if (text === "") throw new HttpError(`${field} is required`, 400);
    return text;
  }
  if (field === "is_estimate") return value ? 1 : 0;
  if (value === null || value === undefined) return null;

  if (field === "runtime_min") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new HttpError("runtime_min must be a number or null", 400);
    return n;
  }
  if (field === "chrono_order") {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) {
      throw new HttpError("chrono_order must be a non-negative integer or null", 400);
    }
    return n;
  }
  if (field === "release_date") {
    const date = String(value).trim();
    if (!isCalendarDate(date) && !/^\d{4}-\d{2}(-00)?$/.test(date)) {
      throw new HttpError("release_date must be a YYYY-MM-DD date or null", 400);
    }
    return date;
  }
  return String(value);
}

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
    otherMissingRuntime,
    otherEstimatedRuntime,
    otherMissingReleaseDate,
    otherMissingChrono,
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
    env.DB.prepare(
      "SELECT id, title, universe, runtime_min FROM other_universes WHERE runtime_min IS NULL ORDER BY id"
    ).all(),
    env.DB.prepare(
      "SELECT id, title, universe, runtime_min FROM other_universes WHERE is_estimate = 1 ORDER BY id"
    ).all(),
    env.DB.prepare(
      "SELECT id, title, universe, release_date FROM other_universes WHERE release_date IS NULL ORDER BY id"
    ).all(),
    // Same "known unplaced" rule as items above — only flag rows that DO have
    // a setting but are still missing their chrono_order.
    env.DB.prepare(
      `SELECT id, title, universe, chrono_order FROM other_universes
        WHERE chrono_order IS NULL AND setting IS NOT NULL
        ORDER BY id`
    ).all(),
  ]);

  // Other Universes rows have no "type" column — the audit table's Type
  // column instead shows the universe name, tagged with source: "other" so
  // the client can render it distinctly (see admin.js's auditRowHtml).
  const tagOther = (rows) => rows.map((r) => ({ ...r, type: r.universe, source: "other" }));

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
      missing_runtime: [...missingRuntime.results, ...tagOther(otherMissingRuntime.results)],
      estimated_runtime: [...estimatedRuntime.results, ...tagOther(otherEstimatedRuntime.results)],
      missing_release_date: [...missingReleaseDate.results, ...tagOther(otherMissingReleaseDate.results)],
      // Other Universes has no phase concept — missing_phase stays MCU-only.
      missing_phase: missingPhase.results,
      missing_chrono_order: [...missingChrono.results, ...tagOther(otherMissingChrono.results)],
      missing_episode_names: missingEpisodeNames,
    },
  });
}

/* --------------------------------------------------------- admin episodes */

function validateEpisodeInput(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpError("Each episode must be an object", 400);
  }
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

/**
 * Makes one item's episodes match the given list, matched by episode_number:
 * existing episodes are updated in place, new numbers are inserted, and
 * numbers no longer in the list are deleted.
 *
 * Updating in place (rather than delete-all-then-insert) is what keeps each
 * episode's id stable — watch_status.episode_id points at episodes.id, so a
 * fresh id would silently orphan every user's per-episode progress for the
 * season on any admin edit, even a title fix.
 */
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

  // episode_number is the match key, so it must be unique within the request.
  const incomingNumbers = new Set();
  for (const ep of parsed) {
    if (incomingNumbers.has(ep.episode_number)) {
      return error(`Duplicate episode_number: ${ep.episode_number}`, 400);
    }
    incomingNumbers.add(ep.episode_number);
  }

  const { results: current } = await env.DB.prepare(
    "SELECT id, episode_number FROM episodes WHERE item_id = ? ORDER BY id"
  )
    .bind(itemId)
    .all();

  // The table has no UNIQUE(item_id, episode_number), so legacy duplicates
  // are possible: the oldest row for a number is the one kept and updated,
  // any later duplicates are treated as removed.
  const idByNumber = new Map();
  const removedIds = [];
  for (const row of current) {
    if (incomingNumbers.has(row.episode_number) && !idByNumber.has(row.episode_number)) {
      idByNumber.set(row.episode_number, row.id);
    } else {
      removedIds.push(row.id);
    }
  }

  const statements = [
    ...removedIds.map((id) => env.DB.prepare("DELETE FROM episodes WHERE id = ?").bind(id)),
    ...parsed.map((ep) => {
      const id = idByNumber.get(ep.episode_number);
      return id === undefined
        ? env.DB.prepare(
            "INSERT INTO episodes (item_id, episode_number, title, runtime_min, is_estimate) VALUES (?, ?, ?, ?, ?)"
          ).bind(itemId, ep.episode_number, ep.title, ep.runtime_min, ep.is_estimate)
        : env.DB.prepare(
            "UPDATE episodes SET title = ?, runtime_min = ?, is_estimate = ? WHERE id = ?"
          ).bind(ep.title, ep.runtime_min, ep.is_estimate, id);
    }),
  ];
  if (statements.length) await env.DB.batch(statements);

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
  const [items, otherItems] = await Promise.all([
    env.DB.prepare(
      `SELECT id, title, type, release_date, phase, runtime_min, notes, is_estimate,
              chrono_order, chrono_setting, crossover_universe
         FROM items
        ORDER BY id`
    ).all(),
    env.DB.prepare(
      `SELECT id, title, universe, release_date, setting, runtime_min, notes, is_estimate,
              chrono_order
         FROM other_universes
        ORDER BY id`
    ).all(),
  ]);

  return privateJson({
    items: [
      ...items.results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1, source: "mcu" })),
      ...otherItems.results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1, source: "other" })),
    ],
  });
}

/**
 * Makes room for a chrono_order value about to be written to `table` by
 * shifting every existing row at that position and above up by 1 — so two
 * rows never silently share a position. `excludeId` is the row being saved
 * itself (edit path only; create has no id yet), since it will get the new
 * value in the caller's own INSERT/UPDATE and must not also be caught by
 * this shift.
 */
async function shiftChronoOrder(env, table, newOrder, excludeId) {
  if (newOrder === null || newOrder === undefined) return;
  const existing = await env.DB.prepare(
    `SELECT 1 AS ok FROM ${table} WHERE chrono_order = ? AND id != ?`
  )
    .bind(newOrder, excludeId ?? -1)
    .first();
  if (!existing) return;

  await env.DB.prepare(
    `UPDATE ${table} SET chrono_order = chrono_order + 1 WHERE chrono_order >= ? AND id != ?`
  )
    .bind(newOrder, excludeId ?? -1)
    .run();
}

/** Inserts a new MCU catalogue row. Required: title, type. Returns { id, title }. */
export async function handleAdminCreateItem(request, env) {
  const body = await readJsonBody(request);

  const title = coerceAdminField("title", body.title);
  const type = coerceAdminField("type", body.type);

  const fields = Object.keys(body).filter((k) => ADMIN_ITEM_FIELDS.has(k) && k !== "title" && k !== "type");
  const values = fields.map((field) => coerceAdminField(field, body[field]));

  const chronoOrderIdx = fields.indexOf("chrono_order");
  if (chronoOrderIdx !== -1) {
    await shiftChronoOrder(env, "items", values[chronoOrderIdx], null);
  }

  const columns = ["title", "type", ...fields];
  const placeholders = columns.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `INSERT INTO items (${columns.join(", ")}) VALUES (${placeholders})`
  )
    .bind(title, type, ...values)
    .run();

  return privateJson({ id: result.meta.last_row_id, title }, 201);
}

/** Inserts a new Other Universes row. Required: title, universe. Returns { id, title }. */
export async function handleAdminCreateOtherUniverse(request, env) {
  const body = await readJsonBody(request);

  const title = coerceAdminField("title", body.title);
  const universe = coerceAdminField("universe", body.universe);

  const fields = Object.keys(body).filter(
    (k) => ADMIN_OTHER_FIELDS.has(k) && k !== "title" && k !== "universe"
  );
  const values = fields.map((field) => coerceAdminField(field, body[field]));

  const chronoOrderIdx = fields.indexOf("chrono_order");
  if (chronoOrderIdx !== -1) {
    await shiftChronoOrder(env, "other_universes", values[chronoOrderIdx], null);
  }

  const columns = ["title", "universe", ...fields];
  const placeholders = columns.map(() => "?").join(", ");
  const result = await env.DB.prepare(
    `INSERT INTO other_universes (${columns.join(", ")}) VALUES (${placeholders})`
  )
    .bind(title, universe, ...values)
    .run();

  return privateJson({ id: result.meta.last_row_id, title }, 201);
}

/** Deletes an MCU item and every row that references it (watch_status, watchlist, episodes). */
export async function handleAdminDeleteItem(request, env, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);

  const exists = await env.DB.prepare("SELECT 1 AS ok FROM items WHERE id = ?").bind(itemId).first();
  if (!exists) return error("No such item", 404);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM watch_status WHERE item_id = ? AND source = 'mcu'").bind(itemId),
    env.DB.prepare("DELETE FROM watchlist WHERE item_id = ? AND source = 'mcu'").bind(itemId),
    env.DB.prepare("DELETE FROM episodes WHERE item_id = ?").bind(itemId),
    env.DB.prepare("DELETE FROM items WHERE id = ?").bind(itemId),
  ]);

  return privateJson({ ok: true });
}

/** Deletes an Other Universes row and every row that references it (watch_status, watchlist). */
export async function handleAdminDeleteOtherUniverse(request, env, itemId) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);

  const exists = await env.DB.prepare("SELECT 1 AS ok FROM other_universes WHERE id = ?")
    .bind(itemId)
    .first();
  if (!exists) return error("No such item", 404);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM watch_status WHERE item_id = ? AND source = 'other'").bind(itemId),
    env.DB.prepare("DELETE FROM watchlist WHERE item_id = ? AND source = 'other'").bind(itemId),
    env.DB.prepare("DELETE FROM other_universes WHERE id = ?").bind(itemId),
  ]);

  return privateJson({ ok: true });
}

export async function handleAdminPatchItem(request, env, itemId, source) {
  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);
  if (!SOURCES.has(source)) {
    return error(`source must be one of: ${[...SOURCES].join(", ")}`, 400);
  }

  const isOther = source === "other";
  const table = isOther ? "other_universes" : "items";
  const allowedFields = isOther ? ADMIN_OTHER_FIELDS : ADMIN_ITEM_FIELDS;

  const body = await readJsonBody(request);
  const fields = Object.keys(body).filter((k) => allowedFields.has(k));
  if (fields.length === 0) {
    return error(`Provide at least one of: ${[...allowedFields].join(", ")}`, 400);
  }

  const exists = await env.DB.prepare(`SELECT chrono_order FROM ${table} WHERE id = ?`)
    .bind(itemId)
    .first();
  if (!exists) return error("No such item", 404);

  const values = fields.map((field) => coerceAdminField(field, body[field]));

  // Only shift when chrono_order is actually moving to a new value — saving
  // the item unchanged (e.g. after an episode edit, see onEpisodeSave in
  // admin.js) must not bump every row below it on every save.
  const chronoOrderIdx = fields.indexOf("chrono_order");
  if (chronoOrderIdx !== -1 && values[chronoOrderIdx] !== exists.chrono_order) {
    await shiftChronoOrder(env, table, values[chronoOrderIdx], itemId);
  }

  const setClause = fields.map((f) => `${f} = ?`).join(", ");
  await env.DB.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`)
    .bind(...values, itemId)
    .run();

  if (isOther) {
    const row = await env.DB.prepare(
      `SELECT id, title, universe, release_date, setting, runtime_min, notes, is_estimate,
              chrono_order
         FROM other_universes WHERE id = ?`
    )
      .bind(itemId)
      .first();
    return privateJson({ item: { ...row, is_estimate: row.is_estimate === 1, source: "other" } });
  }

  const row = await env.DB.prepare(
    `SELECT id, title, type, release_date, phase, runtime_min, notes, is_estimate,
            chrono_order, chrono_setting, crossover_universe
       FROM items WHERE id = ?`
  )
    .bind(itemId)
    .first();

  return privateJson({ item: { ...row, is_estimate: row.is_estimate === 1, source: "mcu" } });
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
    // Same list the Settings dropdown offers (timezones.js), so anything the
    // UI lets you pick saves, and nothing else does.
    if (!TIMEZONE_VALUES.has(timezone)) {
      return error("timezone must be one of the timezones offered in Settings", 400);
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

  // created_at is written by datetime('now'), so comparing against the same
  // SQLite clock keeps the window exact regardless of the Worker's own time.
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM feedback WHERE user_id = ? AND created_at > datetime('now', '-1 hour')"
  )
    .bind(user.user_id)
    .first();
  if (recent.n >= FEEDBACK_LIMIT_PER_HOUR) {
    return error(
      "You've submitted too much feedback recently. Please wait before submitting again.",
      429,
      { "cache-control": PRIVATE_CACHE_CONTROL }
    );
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
 *
 * The webhook URL is public, so X-Webhook-Secret is what lets n8n tell this
 * app's calls apart from anyone else posting to it. FEEDBACK_WEBHOOK_SECRET
 * is a Worker secret (`wrangler secret put FEEDBACK_WEBHOOK_SECRET --env
 * <env>`), not a wrangler.toml var, since the repo is public.
 */
async function notifyFeedbackWebhook(env, { type, itemTitle, message, userId }) {
  try {
    const userRow = await env.DB.prepare("SELECT email FROM users WHERE id = ?").bind(userId).first();

    const headers = { "content-type": "application/json" };
    if (env.FEEDBACK_WEBHOOK_SECRET) {
      headers["x-webhook-secret"] = env.FEEDBACK_WEBHOOK_SECRET;
    } else {
      console.error("FEEDBACK_WEBHOOK_SECRET is not set; feedback webhook sent unauthenticated");
    }

    const res = await fetch(FEEDBACK_WEBHOOK_URL, {
      method: "POST",
      headers,
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
