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
  handleAdminCreateItem,
  handleAdminCreateOtherUniverse,
  handleAdminDeleteItem,
  handleAdminDeleteOtherUniverse,
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

const MANIFEST_JSON = JSON.stringify({
  name: "MCU Tracker",
  short_name: "MCU",
  description: "Track your journey through the Marvel Cinematic Universe",
  start_url: "/",
  display: "standalone",
  background_color: "#0b0d14",
  theme_color: "#e0313b",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
});

// Embedded as base64 rather than served from static assets — this Worker has
// no static file binding, so the icons ship inside the bundle itself.
const ICON_192_BASE64 =
  "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";

const ICON_512_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAB7GkOtAAABgmlDQ1BzUkdCIElFQzYxOTY2LTIuMQAAKJF1kbtLA0EQhz8TJcEHCopaKASJVhpihKCNRYJGQS2SCL6a5MxDyOO4S5BgK9gGFEQbX4X+BdoK1oKgKIJYi6Wijco5lwgRMbPMzre/3Rl2Z8ESTilpvdYN6UxOCwZ8jrn5BYftGTvtdNCNK6Lo6nRoPExVe7+lxozXA2at6uf+tYblmK5AjV14VFG1nPCE8NRqTjV5S7hNSUaWhU+E+zW5oPCNqUfL/GRyosyfJmvhoB8sLcKOxC+O/mIlqaWF5eU406m88nMf8yWNscxsSGKPeBc6QQL4cDDJGH68DDIis5cBPLhkRZV8dyl/hqzkKjKrFNBYIUGSHP2i5qV6TGJc9JiMFAWz/3/7qseHPOXqjT6oezSM116wbcJX0TA+Dgzj6xCsD3CeqeRn92H4TfRiRXPuQfM6nF5UtOg2nG1A570a0SIlySpuicfh5Ria5qH1CuoXyz372efoDsJr8lWXsLMLfXK+eekbtqFoCl9AJyUAAAAJcEhZcwAALiMAAC4jAXilP3YAACAASURBVHic7d19cBXV/cfxDQ+XEPIAhBDkSSyPpS2K9bHQQWjBcapWEDtKixVsFQehiqNTcWplKspo66ggLW0VFQ0jRZlaFBSkoDhoFQTKcwiEBAMRktwk5Ca5geT3R37Dj18IN3vvPXu+Z/e8X390Kuzd/eZq9rN7dr/nOA4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwEIp0gW0rnNKSoqptQFAXJqcptqmJukqWmHiSfaJrtmzMrpJVwEAyiysrngiXCZdRUvtpAtoxXWpadIlAIBKZp7WOkgXcEE/P3lsU11EugoASMqY1LQ3e1wkXUXrzA2A+iZDR80AwL16g89jJg4BAQA0IAAAwFIEAABYigAAAEsRAABgKQIAACxFAACApQgAALAUAQAAliIAAMBSBAAAWIoAAABLEQAAYCkCAAAsRQAAgKUIAACwFAEAAJYiAADAUgQAAFiKAAAASxEAAGApAgAALEUAAIClCAAAsBQBAACWIgAAwFIEAABYigAAAEsRAABgKQIAACxFAACApQgAALAUAQAAliIAAMBSBAAAWIoAAABLEQAAYCkCAAAsRQAAgKUIAACwFAEAAJYiAADAUgQAAFiKAAAASxEAAGApAgAALNVBugDAOMOHDx89evT3vve93Nzc9PT0LucIhUI1NTWnTp2qrq6uqqpq/t/KysqKioqDBw+uX7++rKxMunzALQIAcHJycu64444rr7xyyJAhl1xySU5OTmL7qa+vP3jw4K5du7Zu3frRRx9t27ZNbZ1A8G3s1a+s36CxqWnShSDgcnNzH3zwwXXr1p06darJA8ePH9+wYcMjjzzStWtX6Z8VYsamppX1G7SxVz/pQnyCAIDXpk6d+tFHH9XU1Hhx3j/fyZMnly5devXVV0v/3BBgcgBYOgS0YMGCzMxM6SouaMOGDStXrkzss/fff//w4cPV1qPWvHnzSktLpY4+bdq02bNnX3bZZToPmp2dfdddd02dOnXLli3Lli179dVXo9GozgKa/eAHP/jFL36h/7iO49TW1j700EOxt7nuuut+9rOf6amnhaqqqt/+9rcih0ZLGu4ASkpK9Fz6Jea1115L+Ef79NNPpctvw+DBgxX+q3Tv7rvv3r59u/RP39TU1FRcXCxyurnrrrukfuTy8vI2y7v//vulyispKfHuazf5DoDXQE3Us2fPhD/bvXt3hZUEwzXXXPP555///e9/v/TSS6VrcRzH6du379NPP7158+Yrr7xSuhZYjQAwUTIB0K1bN4WV+F0oFHriiSfWrVt31VVXSdfS0qhRozZs2DB//vxQKCRdCyxFAJioR48eiX0wFAoRAGeNHDlyw4YNv//979PT06VraV16evrcuXO3bNkyZswY6VpgIwLARAkHwMUXX8zlZLP77rvv3//+96hRo6QLadvll1++du3a+fPnSxcC6xAAJkpLSxs4cGACHxw0aJDyYvxo3rx5CxcuzMrKki7ErdTU1Llz5y5ZskS6ENiFADDUt7/97QQ+1bdvX+WV+M7ixYsff/zx9u3b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hoaGp59+WroKUxAApvBo1Ua/LwbZqpdffllwTmMR0Wj0D3/4gxd7Xrx4cQJLS/rXe++9Z8K8UoYgAExBAMTl2WeflS5Bq7y8PI96ICKRyKOPPio1QbRm0Wj0qaeekq7CIASAKTzq15VaANZrb7311ubNm6Wr0OS///3v7Nmzvdv/ypUrLXm0npeXl9gyakFFAJjCo3XBpFZS1GDBggVnzpyRrsJz4XD47rvv9rpr9+GHH9awNKmsI0eOPPLII9JVmIUAMIVHS3UHqQ24hffee2/RokXSVXirsbHx0Ucf1XDRWlRU5NEzBkM0NjbOnTs3qCOiCSMATHHkyBEvdhuA1YBjeOSRR4L9Pt+yZcu0var/0ksvBXgg6J133snLy5OuwjgEgCm8OFNHIpFDhw4p3605otHotGnTgnqXs3379lmzZuk84i9/+ctAzpBcWlr60EMPSVdhIgLAFAUFBcpnuQleF9j5CgsL77333kgkIl2IYkVFRdOnT9c8YWckErn99tsDdtdYV1c3c+bMoF4lJIkAMEU0GlXetFVRUaF2h2Zau3btvHnzpKtQ6ciRI7fccstXX32l/9BFRUVTpkwJzFh580MUJv68EALAIMrXBQvMYpBteuaZZ/76179KV6FGYWHhxIkTRc7+zb788svp06cH4/Zx4cKFzz//vHQV5iIADKL8ssueAHAc595773366af93tB0+PBhqWv/c61evfqnP/2p34dN/vnPfz7wwAPSVRiNADCI8l6wwCwG6dLcuXPnzJlTX18vXUiCms/+O3bskC7EcRxn8+bNEyZM8O980e+9997UqVOlqzAdAWAQ5V27QW0DjuGFF16YPn16ZWWldCFx27dv380337xz507pQv7P/v37J0yYsG7dOulC4vbyyy9PmjTJ8jUv3SAADKJ8hQo7l7zIy8ubPHmyj8KvsbFx2bJl11577a5du6RraenEiRM33njjokWLotGodC2unDlz5sknn/zVr37ll4JlEQAGUT7k6vcx3IStX7/++uuv98Wl64kTJ37961/feeed4XBYupbWRaPRWbNm3XTTTbt375aupQ3V1dW/+c1vfve730kX4hsEgEGUz8pr4VofZ+3cuXPChAl33323ySn4ySefjBkz5pVXXpEupG0ffvjhVVdd9cILLxj7iGXz5s3jxo176aWXpAtBcjb26lfWb9DY1DTvDlFSUtKky9VXX+2yqlAo1NDQoOq4p06dcv+FlJeXqzpumwYPHpzQv7QEZWdnL168uLa2VtsP6EZtbe38+fNDoZDOr0KJH/3oR1988YX09/f/hMPhRx99VPqLuaCxqWll/QZt7NVPuhCfsDYAHMc5fvy4quPGdeUb4ABoNmrUqE8++UTbzxhDbW3typUrR40apf9LUOiOO+7YsmWL9HfZdPr06Q8++GDEiBHS30csJgdAB+kCZLz++uuZmZl6jhXX2/1LlizJyclRcty4noIuXbq0c+fOSo7bpqqqKj0HOtenn376wx/+8Oabb77zzjvHjx+v7d/+uSorK1euXPncc88FYE3j5cuXL1++fNKkSQ888MDo0aNTUlI0F1BfX79mzZrnn39+06ZNmg8Nb2m4A4DNcnJy5s6d++WXXzY2Nuq5UC0pKXn22Wd79+4t/aN74ic/+cmKFSsU3rzGVlVV9dprr1166aXSP7dbJt8BmIgAgB6jR49+5ZVX8vPzFT56OVdhYeGqVavmzJmTkZEh/bN6LhQKTZ48+Y033iguLvbiy/zmm29WrVo1Y8aM7Oxs6Z81PiYHgO4bNzc29ur3vY6dJp8o+Xdd0KZ4hJlyc3N//OMfX3HFFd/97neHDRvWp0+fhMc0ioqKtm/f/tlnn73//vuG9PTqd+ONN44dO3bo0KEDBw4cMGBAampqYvspLS09cuTI3r17V69e/e677/r01f6x2OJxSQAAApRJREFUqWkrc3r/t6H+uuPF0rW0RAAALQ0ePHjcuHH9+/fPzMzMzMzMyMjIyMhIT09PT0/v0qVLWlpaTU1NVVVVZWVlOByurKwsLy8vLy8vKyv77LPPtm3bJl2+WdLS0q699trvf//7Q4YMycrKav4Om7/GLl26hEKh2traSCRSW1tbU1MTiUSqq6sPHjy4e/fuLVu2BGM1C5MDwEQMAQEIDJOHgGgEAwBLEQAAYCkCAAAsRQAAgKUIAACwFAEAAJYiAADAUgQAAFiKAAAASxEAAGApAgAALEUAAIClCAAAsBQBAACWIgAAwFIEAABYigAAAEsRAABgKQIAACxFAACApQgAALAUAQAAliIAAMBSBAAAWIoAAABLEQAAYCkCAAAsRQAAgKUIAACwFAEAAJYiAADAUgQAAFiKAAAASxEAAGApAgAALEUAAIClCAAAsBQBAACWIgAAwFIEAABYigAAAEsRAABgKQIAACxFAACApQgAALAUAQAAluogXcAFdUpJ6ZySIl0FACSlk8HnMXMD4M0eF0mXAABBZuIQ0Ma6iHQJAKCSmac1Q+9NOqekpJhaGwDEpclpqm1qkq4CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBm/wOzWqdgka39AQAAAABJRU5ErkJggg==";

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

      if (url.pathname === "/manifest.json") return withSecurityHeaders(manifestResponse());
      if (url.pathname === "/icons/icon-192.png") return withSecurityHeaders(iconResponse(ICON_192_BASE64));
      if (url.pathname === "/icons/icon-512.png") return withSecurityHeaders(iconResponse(ICON_512_BASE64));

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

// Static assets (manifest, icons never change per-request), safe to cache
// publicly rather than the "private, no-store" pages use for signed-in state.
const STATIC_ASSET_CACHE_CONTROL = "public, max-age=86400";

function manifestResponse() {
  return new Response(MANIFEST_JSON, {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": STATIC_ASSET_CACHE_CONTROL,
    },
  });
}

function iconResponse(base64) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: {
      "content-type": "image/png",
      "cache-control": STATIC_ASSET_CACHE_CONTROL,
    },
  });
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
      if (method === "GET") return handleAdminListItems(request, env);
      if (method === "POST") return handleAdminCreateItem(request, env);
      return methodNotAllowed("GET, POST");
    }

    if (pathname === "/api/admin/other-universes") {
      return method === "POST"
        ? handleAdminCreateOtherUniverse(request, env)
        : methodNotAllowed("POST");
    }

    const itemMatch = /^\/api\/admin\/items\/(\d+)$/.exec(pathname);
    if (itemMatch) {
      if (method === "PATCH") {
        return handleAdminPatchItem(request, env, Number(itemMatch[1]), url.searchParams.get("source") || "mcu");
      }
      if (method === "DELETE") {
        return handleAdminDeleteItem(request, env, Number(itemMatch[1]));
      }
      return methodNotAllowed("PATCH, DELETE");
    }

    const otherUniverseMatch = /^\/api\/admin\/other-universes\/(\d+)$/.exec(pathname);
    if (otherUniverseMatch) {
      return method === "DELETE"
        ? handleAdminDeleteOtherUniverse(request, env, Number(otherUniverseMatch[1]))
        : methodNotAllowed("DELETE");
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
