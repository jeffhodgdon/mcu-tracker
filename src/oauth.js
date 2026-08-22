/**
 * Google OAuth2 / OpenID Connect sign-in, implemented directly in the Worker.
 *
 * Flow:
 *   GET /api/auth/google           -> redirect to Google's consent screen
 *   GET /api/auth/google/callback  -> exchange code, verify ID token, sign in
 *
 * The ID token's signature is verified against Google's published JWKS before
 * any claim in it is trusted. Decoding the payload without checking the
 * signature would let anyone mint a token for any email address.
 */

import { createSession, deleteSessionsForUser, normalizeEmail, sessionCookie } from "./auth.js";
// Every response here either issues or clears a credential cookie, so none of
// them may be stored by any cache.
import { PRIVATE_CACHE_CONTROL as PRIVATE_CACHE } from "./api.js";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

const STATE_COOKIE = "mcu_oauth_state";
const STATE_TTL_SECONDS = 600; // 10 minutes to complete the consent screen
const CLOCK_SKEW_SECONDS = 60;

/* ------------------------------------------------------------------ base64 */

function b64urlEncode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------------------------------------------------------- signed state ---
 * The state value is echoed back by Google and must match what we issued, or
 * the callback is someone else's login being replayed at our user. It is kept
 * in a cookie rather than server-side storage so the flow needs no writes
 * before the user has actually signed in.
 *
 * SameSite must be Lax, not Strict: the callback arrives as a top-level
 * navigation from accounts.google.com, and Strict would withhold the cookie
 * exactly when it is needed.
 */

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function signState(state, secret) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(state));
  return `${state}.${b64urlEncode(new Uint8Array(sig))}`;
}

async function verifyStateCookie(cookieValue, secret) {
  if (!cookieValue) return null;
  const dot = cookieValue.lastIndexOf(".");
  if (dot === -1) return null;

  const state = cookieValue.slice(0, dot);
  const provided = cookieValue.slice(dot + 1);

  const key = await hmacKey(secret);
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlDecode(provided),
    new TextEncoder().encode(state)
  );
  return ok ? state : null;
}

function stateCookie(value) {
  return `${STATE_COOKIE}=${value}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${STATE_TTL_SECONDS}`;
}

function clearedStateCookie() {
  return `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/* -------------------------------------------------------------------- JWKS */

// Google rotates signing keys, so the set is cached briefly rather than pinned.
let jwksCache = { keys: null, fetchedAt: 0 };
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getSigningKey(kid, { forceRefresh = false } = {}) {
  const stale = Date.now() - jwksCache.fetchedAt > JWKS_TTL_MS;
  if (forceRefresh || !jwksCache.keys || stale) {
    const res = await fetch(GOOGLE_JWKS_URI);
    if (!res.ok) throw new Error(`Could not fetch Google signing keys (${res.status})`);
    const body = await res.json();
    jwksCache = { keys: body.keys || [], fetchedAt: Date.now() };
  }

  const key = jwksCache.keys.find((k) => k.kid === kid);
  if (!key && !forceRefresh) {
    // Unknown kid usually means Google rotated keys since the last fetch.
    return getSigningKey(kid, { forceRefresh: true });
  }
  return key ?? null;
}

/**
 * Verifies an ID token end to end and returns its claims.
 * Throws if the signature, issuer, audience or expiry is wrong.
 */
export async function verifyIdToken(idToken, clientId) {
  const parts = String(idToken).split(".");
  if (parts.length !== 3) throw new Error("Malformed ID token");

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(new TextDecoder().decode(b64urlDecode(headerB64)));

  if (header.alg !== "RS256") throw new Error(`Unexpected ID token algorithm: ${header.alg}`);

  const jwk = await getSigningKey(header.kid);
  if (!jwk) throw new Error("No matching Google signing key for this token");

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlDecode(signatureB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!verified) throw new Error("ID token signature is not valid");

  const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
  const now = Math.floor(Date.now() / 1000);

  if (!GOOGLE_ISSUERS.has(claims.iss)) throw new Error(`Unexpected token issuer: ${claims.iss}`);
  if (claims.aud !== clientId) throw new Error("ID token was issued for a different client");
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_SECONDS < now) {
    throw new Error("ID token has expired");
  }
  if (typeof claims.iat === "number" && claims.iat - CLOCK_SKEW_SECONDS > now) {
    throw new Error("ID token was issued in the future");
  }
  if (!claims.email) throw new Error("ID token carries no email address");
  if (claims.email_verified === false) {
    throw new Error("Google has not verified this email address");
  }

  return claims;
}

/* ------------------------------------------------------------------ config */

function requireConfig(env) {
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not configured");
  if (!clientSecret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return { clientId, clientSecret };
}

/**
 * Built from the incoming request so each environment sends its own hostname,
 * and must byte-match a redirect URI registered on the Google client.
 */
export function redirectUri(url) {
  return `${url.origin}/api/auth/google/callback`;
}

/* ------------------------------------------------------------------- start */

export async function startGoogleAuth(request, env, url) {
  const { clientId, clientSecret } = requireConfig(env);

  const state = b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const signed = await signState(state, clientSecret);

  const authUrl = new URL(GOOGLE_AUTH_ENDPOINT);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri(url));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  // Without this, a user already signed in to exactly one Google account is
  // sent straight through with no way to pick a different one.
  authUrl.searchParams.set("prompt", "select_account");

  return new Response(null, {
    status: 302,
    headers: {
      location: authUrl.toString(),
      "set-cookie": stateCookie(signed),
      "cache-control": PRIVATE_CACHE,
    },
  });
}

/* ---------------------------------------------------------------- callback */

export async function handleGoogleCallback(request, env, url, readCookie) {
  const { clientId, clientSecret } = requireConfig(env);

  // Google reports user-facing failures (e.g. consent denied) in the query.
  const oauthError = url.searchParams.get("error");
  if (oauthError) {
    return failure(`Google sign-in was cancelled or refused (${oauthError})`, 400);
  }

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code) return failure("Google did not return an authorization code", 400);

  const expectedState = await verifyStateCookie(readCookie(request, STATE_COOKIE), clientSecret);
  if (!expectedState) {
    return failure(
      "Sign-in state cookie missing or invalid — start again at /api/auth/google",
      400
    );
  }
  if (!returnedState || returnedState !== expectedState) {
    return failure("Sign-in state did not match — request rejected", 400);
  }

  // --- exchange the code for tokens, server side ---------------------------
  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(url),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    // Surfaces redirect_uri_mismatch and invalid_client, which are the two
    // misconfigurations worth seeing directly rather than as a generic 500.
    console.error("google token exchange failed", tokenRes.status, detail.slice(0, 500));
    return failure(`Token exchange with Google failed (${tokenRes.status})`, 502);
  }

  const tokens = await tokenRes.json();
  if (!tokens.id_token) return failure("Google's response contained no ID token", 502);

  let claims;
  try {
    claims = await verifyIdToken(tokens.id_token, clientId);
  } catch (err) {
    console.error("id token verification failed", err.message);
    return failure(`Could not verify Google's ID token: ${err.message}`, 401);
  }

  // --- find or create the user --------------------------------------------
  const email = normalizeEmail(claims.email);
  const userId = await findOrCreateUser(env, email);

  // Every sign-in invalidates any session(s) already issued to this user
  // (a stale browser tab, a previously stolen/leaked cookie, etc.) before
  // minting a fresh one — session fixation protection on re-authentication,
  // not just a fresh id for this one request.
  await deleteSessionsForUser(env, userId);
  const sessionId = await createSession(env, userId);

  // Land on the root page so a browser test ends somewhere visible.
  return new Response(null, {
    status: 302,
    headers: [
      ["location", "/"],
      ["set-cookie", sessionCookie(sessionId)],
      ["set-cookie", clearedStateCookie()],
      ["cache-control", PRIVATE_CACHE],
    ],
  });
}

/**
 * First Google sign-in for an address creates the account; there is no
 * separate signup step. The UNIQUE index on users.email is the authority on
 * duplicates, so a concurrent first login for the same address resolves to a
 * single row rather than racing.
 */
async function findOrCreateUser(env, email) {
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) return existing.id;

  try {
    const created = await env.DB.prepare(
      "INSERT INTO users (email) VALUES (?) RETURNING id"
    )
      .bind(email)
      .first();
    return created.id;
  } catch (err) {
    if (String(err.message || "").includes("UNIQUE")) {
      const row = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
        .bind(email)
        .first();
      if (row) return row.id;
    }
    throw err;
  }
}

/** Plain-text so a failure mid-redirect is readable in the browser. */
function failure(message, status) {
  return new Response(`Google sign-in failed: ${message}\n`, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "set-cookie": clearedStateCookie(),
      "cache-control": PRIVATE_CACHE,
    },
  });
}
