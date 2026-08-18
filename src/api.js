/**
 * API route handlers.
 *
 * Sign-in lives in oauth.js; /api/items is public because the catalogue is not
 * user data and Phase 3 needs to render it before login. Everything
 * user-scoped is gated on a session by worker.js.
 */

import {
  deleteSession,
  readCookie,
  SESSION_COOKIE,
  clearedSessionCookie,
} from "./auth.js";
import { consolidateItems } from "./consolidate.js";

const WATCH_STATUSES = new Set(["unwatched", "watched", "want_rewatch", "skip"]);
const WATCHLIST_SORTS = new Set(["release", "chronological"]);
const SOURCES = new Set(["mcu", "other"]);

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
  return json({ groups: consolidateItems(items) });
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

export async function handleGetWatchStatus(request, env, user) {
  const { results } = await env.DB.prepare(
    `SELECT item_id, source, status, episode_progress, updated_at
       FROM watch_status
      WHERE user_id = ?
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
    "SELECT status, episode_progress FROM watch_status WHERE user_id = ? AND item_id = ? AND source = ?"
  )
    .bind(user.user_id, itemId, source)
    .first();

  const finalStatus = hasStatus ? status : existing?.status ?? "unwatched";
  const finalProgress = hasProgress ? progress : existing?.episode_progress ?? null;

  await env.DB.prepare(
    `INSERT INTO watch_status (user_id, item_id, source, status, episode_progress, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, item_id, source) DO UPDATE SET
       status = excluded.status,
       episode_progress = excluded.episode_progress,
       updated_at = excluded.updated_at`
  )
    .bind(user.user_id, itemId, source, finalStatus, finalProgress)
    .run();

  const row = await env.DB.prepare(
    `SELECT item_id, source, status, episode_progress, updated_at
       FROM watch_status WHERE user_id = ? AND item_id = ? AND source = ?`
  )
    .bind(user.user_id, itemId, source)
    .first();

  return privateJson({ watch_status: { ...row, episode_progress: parseProgress(row.episode_progress) } });
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

/* ---------------------------------------------------------------- settings */

export async function handleGetStats(request, env) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS user_count FROM users").first();
  return json({ user_count: row.user_count });
}

export async function handleGetSettings(request, env, user) {
  const row = await env.DB.prepare(
    "SELECT countdown_target_date, countdown_label, watchlist_sort FROM user_settings WHERE user_id = ?"
  )
    .bind(user.user_id)
    .first();

  return privateJson({
    settings: {
      countdown_target_date: row?.countdown_target_date ?? null,
      countdown_label: row?.countdown_label ?? null,
      watchlist_sort: row?.watchlist_sort ?? "release",
    },
  });
}

export async function handlePutSettings(request, env, user) {
  const body = await readJsonBody(request);

  const existing = await env.DB.prepare(
    "SELECT countdown_target_date, countdown_label, watchlist_sort FROM user_settings WHERE user_id = ?"
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

  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, countdown_target_date, countdown_label, watchlist_sort)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       countdown_target_date = excluded.countdown_target_date,
       countdown_label = excluded.countdown_label,
       watchlist_sort = excluded.watchlist_sort`
  )
    .bind(user.user_id, date, label, sort)
    .run();

  return privateJson({
    settings: { countdown_target_date: date, countdown_label: label, watchlist_sort: sort },
  });
}
