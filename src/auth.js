/**
 * Password hashing, session management and cookie handling.
 *
 * Everything here uses only Workers-native WebCrypto — no external libraries.
 */

export const SESSION_COOKIE = "mcu_session";
export const SESSION_TTL_DAYS = 30;

// PBKDF2 work factor. Higher is better against offline cracking but costs CPU
// on every signup and login, and Workers meters CPU time per request. The
// iteration count is stored inside each hash, so this can be changed at any
// time without invalidating existing passwords — verification always uses the
// parameters recorded alongside the hash it is checking.
//
// Measured on workerd (median request time minus a 1.7 ms baseline):
//
//     iterations    PBKDF2 CPU
//         10,000       ~0.8 ms
//         50,000       ~4.6 ms
//        100,000       ~8.3 ms   <- current
//        210,000      ~17.8 ms
//        600,000      ~47.6 ms   (OWASP's recommendation for PBKDF2-SHA256)
//
// This account is on the Workers Free plan, whose limit is 10 ms of CPU per
// request, so 100,000 leaves under 2 ms for everything else in the handler.
// Drop to 50,000 to stay comfortably inside the free limit, or move to the
// paid plan (30 s CPU) to raise it toward the OWASP figure.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const SALT_BYTES = 16;
const KEY_BITS = 256;

const PASSWORD_MIN = 8;
// Guards against absurd inputs; PBKDF2 cost is dominated by iterations, not
// password length, but there is no reason to accept unbounded strings.
const PASSWORD_MAX = 1024;

/* ------------------------------------------------------------------ base64 */

function toBase64(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/* ---------------------------------------------------------------- password */

async function deriveBits(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: PBKDF2_HASH },
    material,
    KEY_BITS
  );
  return new Uint8Array(bits);
}

/**
 * Returns a self-describing hash string:
 *   pbkdf2-sha256$<iterations>$<salt-b64>$<hash-b64>
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveBits(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2-sha256$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time comparison — never short-circuits on the first differing byte. */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, iterations, saltB64, hashB64] = String(stored).split("$");
    if (scheme !== "pbkdf2-sha256") return false;

    const iters = Number(iterations);
    if (!Number.isInteger(iters) || iters < 1) return false;

    const expected = fromBase64(hashB64);
    const actual = await deriveBits(password, fromBase64(saltB64), iters);
    return timingSafeEqual(actual, expected);
  } catch {
    // Malformed hash in the database must read as "does not match", never as a
    // thrown 500 that would distinguish it from a wrong password.
    return false;
  }
}

/* -------------------------------------------------------------- validation */

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

/**
 * Deliberately permissive: the only structural guarantees worth enforcing are
 * a single @ with something either side and no whitespace. Anything stricter
 * rejects addresses that are actually valid.
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function passwordProblem(password) {
  const p = String(password ?? "");
  if (p.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (p.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`;
  return null;
}

/* ---------------------------------------------------------------- sessions */

function newSessionId() {
  return toBase64(crypto.getRandomValues(new Uint8Array(32)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
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
