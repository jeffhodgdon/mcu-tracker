/**
 * MCU Tracker — Phase 2: schema, auth and the tracker API.
 *
 * Routing is per-subdomain (mcu / mcu-dev), so the Worker owns the whole
 * hostname and paths are relative to root — no route prefix to strip.
 *
 * There is no UI yet; anything outside /api/ returns a plain-text health
 * response that also proves the D1 binding resolved.
 */

import { authenticate } from "./auth.js";
import {
  error,
  handleGetSettings,
  handleGetWatchStatus,
  handleListItems,
  handleLogin,
  handleLogout,
  handlePutSettings,
  handlePutWatchStatus,
  handleSignup,
  HttpError,
  json,
} from "./api.js";

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
        const headers = err.status === 429 ? { "retry-after": "600" } : {};
        return error(err.message, err.status, headers);
      }
      console.error("unhandled error", err?.stack || String(err));
      return error("Internal error", 500);
    }
  },
};

async function handleApi(request, env, ctx, url) {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  // --- public endpoints ---------------------------------------------------

  if (pathname === "/api/signup") {
    return method === "POST"
      ? handleSignup(request, env)
      : methodNotAllowed("POST");
  }

  if (pathname === "/api/login") {
    return method === "POST" ? handleLogin(request, env) : methodNotAllowed("POST");
  }

  if (pathname === "/api/logout") {
    return method === "POST" ? handleLogout(request, env) : methodNotAllowed("POST");
  }

  if (pathname === "/api/items") {
    return method === "GET" ? handleListItems(request, env) : methodNotAllowed("GET");
  }

  // --- authenticated endpoints -------------------------------------------

  const user = await authenticate(request, env);

  if (pathname === "/api/watch-status") {
    if (method !== "GET") return methodNotAllowed("GET");
    if (!user) return unauthorized();
    return handleGetWatchStatus(request, env, user);
  }

  const watchMatch = /^\/api\/watch-status\/(.+)$/.exec(pathname);
  if (watchMatch) {
    if (method !== "PUT") return methodNotAllowed("PUT");
    if (!user) return unauthorized();
    const itemId = Number(watchMatch[1]);
    return handlePutWatchStatus(request, env, user, itemId);
  }

  if (pathname === "/api/settings") {
    if (!user) return unauthorized();
    if (method === "GET") return handleGetSettings(request, env, user);
    if (method === "PUT") return handlePutSettings(request, env, user);
    return methodNotAllowed("GET, PUT");
  }

  return error("Not found", 404);
}

function unauthorized() {
  return error("Authentication required", 401);
}

function methodNotAllowed(allow) {
  return error("Method not allowed", 405, { allow });
}

async function health(request, env, url) {
  const lines = [
    "MCU Tracker - Phase 2 API OK",
    `environment: ${env.ENVIRONMENT ?? "unknown"}`,
    `host: ${url.hostname}`,
    `path: ${url.pathname}`,
  ];

  try {
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM items").first();
    lines.push(`d1: OK (${row.n} items)`);
  } catch (err) {
    lines.push(`d1: FAILED (${err.message})`);
    return text(lines, 500);
  }

  return text(lines, 200);
}

function text(lines, status) {
  return new Response(lines.join("\n") + "\n", {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
