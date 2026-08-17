/**
 * Session management and cookie handling.
 *
 * Sign-in itself is Google OAuth (see oauth.js). Sessions are deliberately
 * independent of how they were created: everything below works the same
 * regardless of which identity provider issued the login, so protected routes
 * need no knowledge of OAuth.
 */

export const SESSION_COOKIE = "mcu_session";
export const SESSION_TTL_DAYS = 30;

/* -------------------------------------------------------------- identities */

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

/* ---------------------------------------------------------------- sessions */

function newSessionId() {
  let s = "";
  for (const b of crypto.getRandomValues(new Uint8Array(32))) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Expiry is computed by SQLite rather than JS so it is written in exactly the
 * same format as created_at, and so comparisons against datetime('now') are
 * apples to apples.
 */
export async function createSession(env, userId) {
  const id = newSessionId();
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, datetime('now', ?))"
  )
    .bind(id, userId, `+${SESSION_TTL_DAYS} days`)
    .run();
  return id;
}

export async function deleteSession(env, sessionId) {
  await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
}

/** Best-effort cleanup so the table does not grow without bound. */
export async function purgeExpiredSessions(env) {
  await env.DB.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
}

/* ----------------------------------------------------------------- cookies */

export function readCookie(request, name) {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export function sessionCookie(id) {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${id}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/* -------------------------------------------------------------- middleware */

/**
 * Resolves the caller's session, or null when the cookie is absent, unknown or
 * expired. Expiry is enforced in SQL so a stale row can never authenticate.
 */
export async function authenticate(request, env) {
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;

  const row = await env.DB.prepare(
    `SELECT s.id AS session_id, s.user_id, u.email
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > datetime('now')`
  )
    .bind(sessionId)
    .first();

  return row ?? null;
}
