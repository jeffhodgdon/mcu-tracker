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
  handleAdminAudit,
  handleAdminListItems,
  handleAdminPatchItem,
  handleAdminReplaceEpisodes,
  handleClearWatchStatus,
  handleConsolidated,
  handleDeleteAccount,
  handleDeleteWatchlistItem,
  handleGetItemEpisodes,
  handleGetSettings,
  handleGetStats,
  handleGetWatchEpisodes,
  handleGetWatchlist,
  handleGetWatchStatus,
  handleListItems,
  handleLogout,
  handleOtherUniverses,
  handlePostWatch,
  handlePostWatchlist,
  handlePutSettings,
  handlePutWatchStatus,
  handleResetAllData,
  handleSubmitFeedback,
  HttpError,
  PRIVATE_CACHE_CONTROL,
} from "./api.js";
import { handleGoogleCallback, startGoogleAuth } from "./oauth.js";
import { dashboardPage } from "./ui/dashboard.js";
import { releasePage } from "./ui/release.js";
import { chronologicalPage } from "./ui/chronological.js";
import { consolidatedPage } from "./ui/consolidated.js";
import { otherPage } from "./ui/other.js";
import { adminPage } from "./ui/admin.js";
import { settingsPage } from "./ui/settings.js";
import { htmlResponse } from "./ui/shell.js";

/**
 * Hardcoded rather than DB-flagged: there is no admin-management UI, so a
 * flag column would just be another place this exact list lives. Keyed by
 * users.id (stable across email changes), not email.
 */
const ADMIN_USER_IDS = [1, 8];

function isAdmin(user) {
  return !!user && ADMIN_USER_IDS.includes(user.user_id);
}

/**
 * Baseline hardening headers applied to every response this Worker returns,
 * regardless of path or content type — added centrally here rather than in
 * each individual handler so nothing can accidentally ship without them.
 */
const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  // Legacy browsers' built-in XSS filter is itself a known source of
  // exploitable behavior (it can be used to disclose content via timing/
  // filter side-channels), so modern guidance is to explicitly disable it
  // rather than tune it — "0" turns it off outright.
  "x-xss-protection": "0",
};

function withSecurityHeaders(response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
        return withSecurityHeaders(await handleApi(request, env, ctx, url));
      }

      if (url.pathname === "/admin") {
        const user = await authenticate(request, env);
        if (!user) return withSecurityHeaders(error("Authentication required", 401, { "cache-control": PRIVATE_CACHE_CONTROL }));
        if (!isAdmin(user)) return withSecurityHeaders(error("Forbidden", 403, { "cache-control": PRIVATE_CACHE_CONTROL }));
        return withSecurityHeaders(htmlResponse(adminPage()));
      }

      const page = handlePage(url);
      if (page) return withSecurityHeaders(page);

      // Kept as a plain-text probe now that / serves the UI.
      if (url.pathname === "/health") return withSecurityHeaders(await health(request, env, url));

      return withSecurityHeaders(notFoundPage());
    } catch (err) {
      if (err instanceof HttpError) {
        return withSecurityHeaders(error(err.message, err.status));
      }
      console.error("unhandled error", err?.stack || String(err));
      return withSecurityHeaders(error("Internal error", 500));
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
  if (path === "/settings") return htmlResponse(settingsPage());
  // /admin is handled separately in fetch() — it needs an auth check before
  // rendering, unlike every other page here.

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

  const episodesMatch = /^\/api\/items\/(\d+)\/episodes$/.exec(pathname);
  if (episodesMatch) {
    return method === "GET"
      ? handleGetItemEpisodes(request, env, Number(episodesMatch[1]))
      : methodNotAllowed("GET");
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

  if (pathname.startsWith("/api/admin/")) {
    if (!user) return unauthorized();
    if (!isAdmin(user)) return error("Forbidden", 403, { "cache-control": PRIVATE_CACHE_CONTROL });

    if (pathname === "/api/admin/audit") {
      return method === "GET" ? handleAdminAudit(request, env) : methodNotAllowed("GET");
    }

    if (pathname === "/api/admin/items") {
      return method === "GET" ? handleAdminListItems(request, env) : methodNotAllowed("GET");
    }

    const itemMatch = /^\/api\/admin\/items\/(\d+)$/.exec(pathname);
    if (itemMatch) {
      return method === "PATCH"
        ? handleAdminPatchItem(request, env, Number(itemMatch[1]))
        : methodNotAllowed("PATCH");
    }

    const episodesMatch = /^\/api\/admin\/episodes\/(\d+)$/.exec(pathname);
    if (episodesMatch) {
      return method === "PUT"
        ? handleAdminReplaceEpisodes(request, env, Number(episodesMatch[1]))
        : methodNotAllowed("PUT");
    }

    return error("Not found", 404);
  }

  if (pathname === "/api/watch-status") {
    if (method !== "GET") return methodNotAllowed("GET");
    if (!user) return unauthorized();
    return handleGetWatchStatus(request, env, user);
  }

  if (pathname === "/api/watch") {
    if (method !== "POST") return methodNotAllowed("POST");
    if (!user) return unauthorized();
    return handlePostWatch(request, env, user);
  }

  if (pathname === "/api/watch/episodes") {
    if (method !== "GET") return methodNotAllowed("GET");
    if (!user) return unauthorized();
    const itemId = Number(url.searchParams.get("item_id"));
    if (!Number.isInteger(itemId) || itemId < 1) return error("Invalid item id", 400);
    return handleGetWatchEpisodes(request, env, user, itemId);
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

  if (pathname === "/api/settings/clear-watch-status") {
    if (method !== "POST") return methodNotAllowed("POST");
    if (!user) return unauthorized();
    return handleClearWatchStatus(request, env, user);
  }

  if (pathname === "/api/settings/reset-all") {
    if (method !== "POST") return methodNotAllowed("POST");
    if (!user) return unauthorized();
    return handleResetAllData(request, env, user);
  }

  if (pathname === "/api/settings/feedback") {
    if (method !== "POST") return methodNotAllowed("POST");
    if (!user) return unauthorized();
    return handleSubmitFeedback(request, env, user);
  }

  if (pathname === "/api/settings/delete-account") {
    if (method !== "POST") return methodNotAllowed("POST");
    if (!user) return unauthorized();
    return handleDeleteAccount(request, env, user);
  }

  return error("Not found", 404);
}

function jsonUser(user) {
  return new Response(
    JSON.stringify({ user: { id: user.user_id, email: user.email, is_admin: isAdmin(user) } }),
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
    // /health is public and unauthenticated — the raw driver error (schema
    // hints, D1 error codes) is logged server-side only, never in the
    // response body.
    console.error("health check d1 query failed", err?.stack || String(err));
    lines.push("d1: FAILED (Database unavailable)");
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
