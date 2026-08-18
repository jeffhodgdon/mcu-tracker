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
  handleConsolidated,
  handleDeleteWatchlistItem,
  handleGetSettings,
  handleGetStats,
  handleGetWatchlist,
  handleGetWatchStatus,
  handleListItems,
  handleLogout,
  handleOtherUniverses,
  handlePostWatchlist,
  handlePutSettings,
  handlePutWatchStatus,
  HttpError,
  PRIVATE_CACHE_CONTROL,
} from "./api.js";
import { handleGoogleCallback, startGoogleAuth } from "./oauth.js";
import { dashboardPage } from "./ui/dashboard.js";
import { releasePage } from "./ui/release.js";
import { chronologicalPage } from "./ui/chronological.js";
import { consolidatedPage } from "./ui/consolidated.js";
import { otherPage } from "./ui/other.js";
import { htmlResponse } from "./ui/shell.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        return await handleApi(request, env, ctx, url);
      }

      const page = handlePage(url);
      if (page) return page;

      // Kept as a plain-text probe now that / serves the UI.
      if (url.pathname === "/health") return await health(request, env, url);

      return notFoundPage();
    } catch (err) {
      if (err instanceof HttpError) {
        return error(err.message, err.status);
      }
      console.error("unhandled error", err?.stack || String(err));
      return error("Internal error", 500);
    }
  },
};

/**
 * The UI lives at the domain root: mcu(-dev).kjserver.dev IS the app, so
 * there is no /mcu/ prefix to carry. The OAuth callback's success redirect
 * (oauth.js) lands on "/", which is the dashboard.
 */
function handlePage(url) {
  const path = url.pathname;

  if (path === "/" || path === "") return htmlResponse(dashboardPage());
  if (path === "/release") return htmlResponse(releasePage());
  if (path === "/chronological") return htmlResponse(chronologicalPage());
  if (path === "/consolidated") return htmlResponse(consolidatedPage());
  if (path === "/other") return htmlResponse(otherPage());

  return null;
}

function notFoundPage() {
  return new Response("Not found\n", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "private, no-store" },
  });
}

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

  if (pathname === "/api/consolidated") {
    return method === "GET" ? handleConsolidated(request, env) : methodNotAllowed("GET");
  }

  if (pathname === "/api/other-universes") {
    return method === "GET" ? handleOtherUniverses(request, env) : methodNotAllowed("GET");
  }

  if (pathname === "/api/stats") {
    return method === "GET" ? handleGetStats(request, env) : methodNotAllowed("GET");
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
    return handlePutWatchStatus(
      request,
      env,
      user,
      Number(watchMatch[1]),
      url.searchParams.get("source") || "mcu"
    );
  }

  if (pathname === "/api/watchlist") {
    if (!user) return unauthorized();
    if (method === "GET") return handleGetWatchlist(request, env, user);
    if (method === "POST") return handlePostWatchlist(request, env, user);
    return methodNotAllowed("GET, POST");
  }

  const watchlistMatch = /^\/api\/watchlist\/(.+)$/.exec(pathname);
  if (watchlistMatch) {
    if (method !== "DELETE") return methodNotAllowed("DELETE");
    if (!user) return unauthorized();
    return handleDeleteWatchlistItem(
      request,
      env,
      user,
      Number(watchlistMatch[1]),
      url.searchParams.get("source") || "mcu"
    );
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
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": PRIVATE_CACHE_CONTROL,
      },
    }
  );
}

/**
 * Also marked private: a cached 401 on a user-scoped path would be served to
 * signed-in callers too, locking them out of their own data.
 */
function unauthorized() {
  return error("Authentication required", 401, {
    "cache-control": PRIVATE_CACHE_CONTROL,
  });
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

/**
 * The health page reports which account is signed in, so it varies per user
 * and must never be cached either — despite not living under /api/.
 */
function text(lines, status) {
  return new Response(lines.join("\n") + "\n", {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": PRIVATE_CACHE_CONTROL,
    },
  });
}
