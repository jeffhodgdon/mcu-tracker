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

const WATCH_STATUSES = new Set(["unwatched", "watched", "want_rewatch", "skip"]);

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
  return json({ ok: true }, 200, { "set-cookie": clearedSessionCookie() });
}

/* ------------------------------------------------------------------- items */

export async function handleListItems(request, env) {
  // Ordered by id: the seed preserves the spreadsheet's curated running order,
  // which is more meaningful than sorting by a partially-known release date.
  const { results } = await env.DB.prepare(
    `SELECT id, title, type, release_date, phase, runtime_min, notes, is_estimate
       FROM items
      ORDER BY id`
  ).all();

  return json({
    items: results.map((r) => ({ ...r, is_estimate: r.is_estimate === 1 })),
  });
}

/* ------------------------------------------------------------ watch status */

export async function handleGetWatchStatus(request, env, user) {
  const { results } = await env.DB.prepare(
    `SELECT item_id, status, episode_progress, updated_at
       FROM watch_status
      WHERE user_id = ?
      ORDER BY item_id`
  )
    .bind(user.user_id)
    .all();

  return json({
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

export async function handlePutWatchStatus(request, env, user, itemId) {
  const body = await readJsonBody(request);

  if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);

  const exists = await env.DB.prepare("SELECT 1 AS ok FROM items WHERE id = ?")
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
    "SELECT status, episode_progress FROM watch_status WHERE user_id = ? AND item_id = ?"
  )
    .bind(user.user_id, itemId)
    .first();

  const finalStatus = hasStatus ? status : existing?.status ?? "unwatched";
  const finalProgress = hasProgress ? progress : existing?.episode_progress ?? null;

  await env.DB.prepare(
    `INSERT INTO watch_status (user_id, item_id, status, episode_progress, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, item_id) DO UPDATE SET
       status = excluded.status,
       episode_progress = excluded.episode_progress,
       updated_at = excluded.updated_at`
  )
    .bind(user.user_id, itemId, finalStatus, finalProgress)
    .run();

  const row = await env.DB.prepare(
    `SELECT item_id, status, episode_progress, updated_at
       FROM watch_status WHERE user_id = ? AND item_id = ?`
  )
    .bind(user.user_id, itemId)
    .first();

  return json({ watch_status: { ...row, episode_progress: parseProgress(row.episode_progress) } });
}

/* ---------------------------------------------------------------- settings */

export async function handleGetSettings(request, env, user) {
  const row = await env.DB.prepare(
    "SELECT countdown_target_date, countdown_label FROM user_settings WHERE user_id = ?"
  )
    .bind(user.user_id)
    .first();

  return json({
    settings: {
      countdown_target_date: row?.countdown_target_date ?? null,
      countdown_label: row?.countdown_label ?? null,
    },
  });
}

export async function handlePutSettings(request, env, user) {
  const body = await readJsonBody(request);

  let date = null;
  if (body.countdown_target_date !== null && body.countdown_target_date !== undefined) {
    date = String(body.countdown_target_date).trim();
    if (!isCalendarDate(date)) {
      return error("countdown_target_date must be a YYYY-MM-DD date or null", 400);
    }
  }

  let label = null;
  if (body.countdown_label !== null && body.countdown_label !== undefined) {
    label = String(body.countdown_label).trim().slice(0, 200);
    if (label === "") label = null;
  }

  await env.DB.prepare(
    `INSERT INTO user_settings (user_id, countdown_target_date, countdown_label)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       countdown_target_date = excluded.countdown_target_date,
       countdown_label = excluded.countdown_label`
  )
    .bind(user.user_id, date, label)
    .run();

  return json({ settings: { countdown_target_date: date, countdown_label: label } });
}
