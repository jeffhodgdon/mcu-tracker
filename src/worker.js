/**
 * MCU Tracker — schema, Google sign-in and the tracker API.
 *
 * Routing is per-subdomain (mcu / mcu-dev), so the Worker owns the whole
 * hostname and paths are relative to root — no route prefix to strip.
 *
 * There is no UI yet; anything outside /api/ returns a plain-text health
 * response that also reports whether the caller is signed in.
 */

import { authenticate, readCookie } from "./auth.js";
import {
  error,
  handleGetSettings,
  handleGetWatchStatus,
  handleListItems,
  handleLogout,
  handlePutSettings,
  handlePutWatchStatus,
  HttpError,
} from "./api.js";
import { handleGoogleCallback, startGoogleAuth } from "./oauth.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, ctx, url);
      }
      return await health(request, env, url);
    } catch (err) {
      if (err instanceof HttpError) {
        return error(err.message, err.status);
      }
      console.error("unhandled error", err?.stack || String(err));
      return error("Internal error", 500);
    }
  },
};

async function handleApi(request, env, ctx, url) {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  // --- sign-in ------------------------------------------------------------

  if (pathname === "/api/auth/google") {
    return method === "GET" ? startGoogleAuth(request, env, url) : methodNotAllowed("GET");
  }

  if (pathname === "/api/auth/google/callback") {
    return method === "GET"
      ? handleGoogleCallback(request, env, url, readCookie)
      : methodNotAllowed("GET");
  }

  if (pathname === "/api/auth/logout") {
    return method === "POST" ? handleLogout(request, env) : methodNotAllowed("POST");
  }

  // --- public -------------------------------------------------------------

  if (pathname === "/api/items") {
    return method === "GET" ? handleListItems(request, env) : methodNotAllowed("GET");
  }

  // --- authenticated ------------------------------------------------------

  const user = await authenticate(request, env);

  if (pathname === "/api/me") {
    if (method !== "GET") return methodNotAllowed("GET");
    if (!user) return unauthorized();
    return jsonUser(user);
  }

  if (pathname === "/api/watch-status") {
    if (method !== "GET") return methodNotAllowed("GET");
    if (!user) return unauthorized();
    return handleGetWatchStatus(request, env, user);
  }

  const watchMatch = /^\/api\/watch-status\/(.+)$/.exec(pathname);
  if (watchMatch) {
    if (method !== "PUT") return methodNotAllowed("PUT");
    if (!user) return unauthorized();
    return handlePutWatchStatus(request, env, user, Number(watchMatch[1]));
  }

  if (pathname === "/api/settings") {
    if (!user) return unauthorized();
    if (method === "GET") return handleGetSettings(request, env, user);
    if (method === "PUT") return handlePutSettings(request, env, user);
    return methodNotAllowed("GET, PUT");
  }

  return error("Not found", 404);
}

function jsonUser(user) {
  return new Response(
    JSON.stringify({ user: { id: user.user_id, email: user.email } }),
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}

function unauthorized() {
  return error("Authentication required", 401);
}

function methodNotAllowed(allow) {
  return error("Method not allowed", 405, { allow });
}

async function health(request, env, url) {
  const lines = [
    "MCU Tracker - API OK",
    `environment: ${env.ENVIRONMENT ?? "unknown"}`,
    `host: ${url.hostname}`,
  ];

  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM items").first();
    lines.push(`d1: OK (${row.n} items)`);
  } catch (err) {
    lines.push(`d1: FAILED (${err.message})`);
    return text(lines, 500);
  }

  // The visible confirmation that a browser sign-in actually worked.
  try {
    const user = await authenticate(request, env);
    lines.push(
      user
        ? `signed in as: ${user.email}`
        : "signed in as: nobody (visit /api/auth/google to sign in with Google)"
    );
  } catch (err) {
    lines.push(`session check FAILED (${err.message})`);
  }

  return text(lines, 200);
}

function text(lines, status) {
  return new Response(lines.join("\n") + "\n", {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
