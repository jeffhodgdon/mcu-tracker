/**
 * The HTML shell every page shares: <head>, the nav rail, and the client-side
 * runtime.
 *
 * Pages are static HTML and fetch their data from the existing JSON API. The
 * helpers below are serialised into the page with Function.prototype.toString()
 * rather than being retyped as strings, so the browser runs exactly the code
 * that format.js unit tests cover — there is no second implementation of the
 * runtime formatting to drift out of sync.
 *
 * Two things Wrangler's esbuild bundling does to that source text before we
 * ever see it, both handled by reflect()/normalizeNames() below:
 *
 * 1. "keepNames" bookkeeping. Workers bundling preserves Function.name
 *    through minification/renaming by appending a call like
 *    `__name(fn, "fn")` immediately after every declaration — including
 *    ones nested inside another function's body, which become part of that
 *    outer function's own toString() output. __name itself is defined once,
 *    at the top of the Worker's OWN bundle; it never ships to the browser,
 *    so a reflected function that references it throws
 *    `ReferenceError: __name is not defined` the moment it runs standalone.
 *    These calls are dead weight outside the bundle and are stripped.
 *
 * 2. Identifier renaming for module isolation. Every ui/*.js page file
 *    calls helpers like formatRuntime() or esc() as bare, un-imported
 *    references — deliberately, since they are meant to be satisfied by
 *    the OTHER reflected functions concatenated into the same browser
 *    <script>, not by any real import graph. esbuild does not know that:
 *    from its perspective a free reference to `formatRuntime` in
 *    dashboard.js is a module that never imported it, and per real ES
 *    module semantics that reference must stay unresolved. Since Wrangler
 *    bundles every module into one flat top-level scope, the only way
 *    esbuild can guarantee dashboard.js's free reference keeps failing to
 *    resolve (as true module isolation requires) is to rename shell.js's
 *    OWN import binding for formatRuntime out of the way — here, to
 *    formatRuntime2. fn.name still correctly reports "formatRuntime"
 *    (that is exactly what keepNames is for), but toString() reflects the
 *    renamed identifier verbatim, in both the function's own signature and
 *    any place it calls a similarly-renamed sibling. Left alone, the
 *    browser would define formatRuntime2 while every page still calls
 *    formatRuntime(), and it would fail exactly like case 1 — a
 *    ReferenceError, just for a different function per page depending on
 *    which helper it happens to call. normalizeNames() rewrites every
 *    renamed identifier back to the name keepNames says it should be,
 *    consistently across the whole concatenated script, so cross-function
 *    calls line up again.
 */

import { STYLES } from "./styles.js";
import { formatRuntime, formatHours, isRealDate, daysUntil } from "./format.js";

export const NAV = [
  { href: "/", id: "dashboard", label: "Dashboard" },
  { href: "/release", id: "release", label: "Release Order" },
  { href: "/chronological", id: "chronological", label: "Chronological" },
  { href: "/consolidated", id: "consolidated", label: "Consolidated" },
  { href: "/other", id: "other", label: "Other Universes" },
  // Visible to every signed-in user (unlike Admin below) — the settings page
  // itself handles the signed-out case, same as other.js does.
  { href: "/settings", id: "settings", label: "⚙ Settings" },
  { href: "/admin", id: "admin", label: "Admin", adminOnly: true },
];

/* ------------------------------------------------- client-side runtime ---- */

/** Fetches JSON, treating 401 as "signed out" rather than an error. */
async function apiGet(path) {
  const res = await fetch(path, { credentials: "same-origin" });
  if (res.status === 401) return { signedIn: false, data: null, status: 401 };
  if (!res.ok) throw new Error(path + " failed (" + res.status + ")");
  return { signedIn: true, data: await res.json(), status: res.status };
}

async function apiPut(path, body) {
  const res = await fetch(path, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.status;
    try {
      detail = (await res.json()).error || detail;
    } catch (e) {}
    throw new Error(String(detail));
  }
  return res.json();
}

function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Catalogue dates may be partial placeholders, so never hand them to Date(). */
function displayDate(value) {
  if (!value) return "TBD";
  if (!isRealDate(value)) return String(value).replace(/-00/g, "-??");
  const d = new Date(value + "T00:00:00Z");
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

const STATUSES = [
  ["unwatched", "Unwatched"],
  ["watched", "Watched"],
  ["want_rewatch", "Rewatch"],
  ["skip", "Skip"],
];

/**
 * Items still costing the viewer time: never-watched plus deliberate rewatches.
 * "watched" is done and "skip" is an explicit opt-out, so neither counts.
 */
function countsAsRemaining(status) {
  return status !== "watched" && status !== "skip";
}

function showError(message) {
  const box = document.getElementById("err");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("hide");
}

/**
 * Episode display/tracking, shared by every page that shows a TV season row
 * (release.js, chronological.js, consolidated.js, dashboard.js watchlist).
 * Each page owns its own season row markup and status control; this only
 * covers the expand toggle and the episode rows underneath it.
 *
 * Usage: a season row gets an `episodeToggle(itemId)` button (or any element
 * with data-episode-toggle="<itemId>"), and an empty following `<tr
 * class="episode-rows" data-episode-rows="<itemId>">` container row that
 * episode rows get injected into on first expand. Call
 * `wireEpisodeToggles(container, colspan)` once after rendering rows, and
 * `episodeMarkAll(itemId, watched)` from a season-level "mark all" control.
 */
function episodeToggleHtml(itemId) {
  return (
    '<button type="button" class="episode-toggle" data-episode-toggle="' +
    itemId +
    '" aria-expanded="false" aria-label="Show episodes">▶</button>'
  );
}

function episodeRowsContainerHtml(itemId, colspan) {
  return (
    '<tr class="episode-rows hide" data-episode-rows="' +
    itemId +
    '"><td colspan="' +
    colspan +
    '" style="padding:0"></td></tr>'
  );
}

function needsReviewBadge() {
  return '<span class="badge needs-review" title="Episode title looks generic — check admin panel">needs review</span>';
}

function looksGeneric(title, episodeNumber) {
  if (!title) return true;
  const t = title.trim().toLowerCase();
  return t === "" || t === "episode " + episodeNumber || /^episode\s+0*\d+$/.test(t);
}

function episodeRowHtml(itemId, ep, watched) {
  const numLabel = "E" + String(ep.episode_number).padStart(2, "0");
  const title = ep.title && !looksGeneric(ep.title, ep.episode_number) ? ep.title : "Episode " + String(ep.episode_number).padStart(2, "0");
  const review = looksGeneric(ep.title, ep.episode_number) ? " " + needsReviewBadge() : "";
  const estimate = ep.is_estimate ? ' <span class="badge est" title="Runtime is an estimate">est</span>' : "";

  return (
    '<div class="episode-row' +
    (watched ? " watched" : "") +
    '" data-episode-id="' +
    ep.id +
    '">' +
    '<span class="episode-num">' +
    numLabel +
    "</span>" +
    '<span class="episode-title">' +
    esc(title) +
    "</span>" +
    review +
    '<span class="episode-runtime">' +
    (ep.runtime_min === null || ep.runtime_min === undefined ? "—" : formatRuntime(ep.runtime_min)) +
    "</span>" +
    estimate +
    '<label class="episode-watch"><input type="checkbox" class="episode-watch-cb" data-item-id="' +
    itemId +
    '" data-episode-id="' +
    ep.id +
    '"' +
    (watched ? " checked" : "") +
    ' aria-label="Mark episode watched"></label>' +
    "</div>"
  );
}

function episodeNoDataHtml() {
  return (
    '<div class="episode-row episode-no-data">' +
    '<span class="episode-title muted">No episode data — check admin panel</span> ' +
    needsReviewBadge() +
    "</div>"
  );
}

function episodeLoadingHtml() {
  return '<div class="episode-row episode-no-data"><span class="muted">Loading episodes…</span></div>';
}

function episodeProgressLabel(itemId) {
  const cached = EPISODE_CACHE.get(itemId);
  if (!cached) return null;
  const watchedCount = cached.episodes.filter(function (ep) {
    return cached.statuses.get(ep.id) === "watched";
  }).length;
  return "(" + watchedCount + "/" + cached.episodes.length + " watched)";
}

async function loadEpisodeData(itemId) {
  if (EPISODE_CACHE.has(itemId)) return EPISODE_CACHE.get(itemId);

  const [epRes, statusRes] = await Promise.all([
    apiGet("/api/items/" + itemId + "/episodes"),
    apiGet("/api/watch/episodes?item_id=" + itemId),
  ]);

  const episodes = (epRes.data && epRes.data.episodes) || [];
  const statuses = new Map();
  for (const row of (statusRes.data && statusRes.data.watch_status) || []) {
    statuses.set(row.episode_id, row.status);
  }

  const entry = { episodes: episodes, statuses: statuses };
  EPISODE_CACHE.set(itemId, entry);
  return entry;
}

async function renderEpisodeRows(itemId, cell, onProgressChange) {
  const data = await loadEpisodeData(itemId);
  if (!data.episodes.length) {
    cell.innerHTML = episodeNoDataHtml();
    return;
  }

  cell.innerHTML = data.episodes
    .map(function (ep) {
      return episodeRowHtml(itemId, ep, data.statuses.get(ep.id) === "watched");
    })
    .join("");

  for (const cb of cell.querySelectorAll(".episode-watch-cb")) {
    cb.addEventListener("change", function (ev) {
      onEpisodeWatchToggle(ev, onProgressChange);
    });
  }
}

async function onEpisodeWatchToggle(ev, onProgressChange) {
  const cb = ev.target;
  const itemId = Number(cb.getAttribute("data-item-id"));
  const episodeId = Number(cb.getAttribute("data-episode-id"));
  const next = cb.checked ? "watched" : "unwatched";
  const data = EPISODE_CACHE.get(itemId);
  const previous = data ? data.statuses.get(episodeId) || "unwatched" : "unwatched";

  cb.disabled = true;
  try {
    await apiPost("/api/watch", { item_id: itemId, episode_id: episodeId, status: next });
    if (data) data.statuses.set(episodeId, next);
    const row = cb.closest(".episode-row");
    if (row) row.classList.toggle("watched", next === "watched");
    if (onProgressChange) onProgressChange(itemId);
  } catch (e) {
    cb.checked = previous === "watched";
    showError("Could not save that change: " + e.message);
  } finally {
    cb.disabled = false;
  }
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = res.status;
    try {
      detail = (await res.json()).error || detail;
    } catch (e) {}
    throw new Error(String(detail));
  }
  return res.json();
}

/** Marks every episode of an item watched/unwatched, mirroring a season-level "mark all". */
async function episodeMarkAll(itemId, watched) {
  const data = await loadEpisodeData(itemId);
  const next = watched ? "watched" : "unwatched";
  for (const ep of data.episodes) {
    await apiPost("/api/watch", { item_id: itemId, episode_id: ep.id, status: next });
    data.statuses.set(ep.id, next);
  }
  const cell = document.querySelector('tr[data-episode-rows="' + itemId + '"] td');
  if (cell && !cell.querySelector(".episode-no-data")) {
    for (const row of cell.querySelectorAll(".episode-row")) {
      row.classList.toggle("watched", watched);
      const cb = row.querySelector(".episode-watch-cb");
      if (cb) cb.checked = watched;
    }
  }
}

/** Wires every episode-toggle button under `container` to lazily expand its episode row. */
function wireEpisodeToggles(container, onProgressChange) {
  for (const btn of container.querySelectorAll("[data-episode-toggle]")) {
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      onEpisodeToggleClick(btn, container, onProgressChange);
    });
  }
}

async function onEpisodeToggleClick(btn, container, onProgressChange) {
  const itemId = btn.getAttribute("data-episode-toggle");
  const row = container.querySelector('tr[data-episode-rows="' + itemId + '"]');
  if (!row) return;

  const expanded = btn.getAttribute("aria-expanded") === "true";
  if (expanded) {
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "▶";
    row.classList.add("hide");
    return;
  }

  btn.setAttribute("aria-expanded", "true");
  btn.textContent = "▼";
  row.classList.remove("hide");

  const cell = row.querySelector("td");
  if (!cell.dataset.loaded) {
    cell.innerHTML = episodeLoadingHtml();
    try {
      await renderEpisodeRows(Number(itemId), cell, onProgressChange);
      cell.dataset.loaded = "1";
    } catch (e) {
      cell.innerHTML = '<div class="episode-row muted">Could not load episodes.</div>';
    }
  }
}

function initNav() {
  const btn = document.getElementById("menu-btn");
  const drawer = document.getElementById("drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (!btn || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.add("open");
    overlay.classList.remove("hide");
    btn.setAttribute("aria-expanded", "true");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    overlay.classList.add("hide");
    btn.setAttribute("aria-expanded", "false");
  }

  btn.addEventListener("click", function () {
    if (drawer.classList.contains("open")) closeDrawer();
    else openDrawer();
  });
  overlay.addEventListener("click", closeDrawer);
  for (const link of drawer.querySelectorAll(".nav a")) {
    link.addEventListener("click", closeDrawer);
  }
}

async function initSignedInLabel() {
  try {
    const me = await apiGet("/api/me");
    // The nav rail is duplicated into the mobile drawer (shell.js's markup),
    // so every "whoami"/"nav-admin" target is a class shared by both copies
    // rather than a single id — querySelectorAll keeps them in sync instead
    // of only ever updating whichever copy happened to match getElementById.
    const boxes = [...document.querySelectorAll(".whoami")];

    if (me.signedIn) {
      try {
        const settings = await apiGet("/api/settings");
        if (settings.data && settings.data.settings && settings.data.settings.timezone) {
          window.userTimezone = settings.data.settings.timezone;
        }
      } catch (e) {
        // Keep the America/New_York default set above if this fails.
      }
    }

    if (!boxes.length) return me;
    for (const box of boxes) {
      if (me.signedIn) {
        box.innerHTML =
          '<div class="who">' +
          esc(me.data.user.email) +
          '</div><button class="logout" style="margin-top:8px;padding:5px 9px;font-size:12px">Sign out</button>';
        const out = box.querySelector(".logout");
        out.addEventListener("click", async function () {
          await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
          location.reload();
        });
        if (me.data.user.is_admin) {
          for (const adminLink of document.querySelectorAll(".nav-admin")) {
            adminLink.classList.remove("hide");
          }
        }
      } else {
        box.innerHTML = '<a class="btn-link" href="/api/auth/google">Sign in with Google</a>';
      }
    }

    try {
      const stats = await apiGet("/api/stats");
      const count = stats.data.user_count;
      for (const box of boxes) {
        const line = document.createElement("div");
        line.className = "muted";
        line.style.fontSize = "11px";
        line.style.marginBottom = "8px";
        line.textContent = "Users Tracking: " + count;
        box.insertBefore(line, box.firstChild);
      }
    } catch (e) {
      // stats are decorative; skip silently if unavailable
    }

    return me;
  } catch (e) {
    return { signedIn: false, data: null };
  }
}

/**
 * Extracts a function's source text with esbuild's keepNames bookkeeping
 * removed, plus whatever identifier it actually got declared under (which
 * may differ from fn.name — see the module doc comment above).
 */
function reflect(fn) {
  const src = stripNameCalls(fn.toString());

  const m = /^(async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(/.exec(src);
  return { name: fn.name, declaredAs: m ? m[2] : null, src };
}

/**
 * Removes esbuild's `__name(fn, "fn")` bookkeeping wrapper (optionally
 * preceded by a PURE-annotation comment), including cases wrapping a
 * multi-statement arrow function passed inline — e.g. a
 * `const x = __name((item) => { ...; ...; }, "x");` assignment, whose body
 * contains semicolons of its own.
 *
 * Two shapes both occur in esbuild's output and need different treatment:
 *   - a standalone statement, `__name(someFn, "someFn");` — removed entirely.
 *   - an expression position, `const x = __name((item) => {...}, "x");` —
 *     only the wrapper is removed, leaving `const x = (item) => {...};` so
 *     the assignment survives.
 *
 * A single regex can't do this correctly: `__name(...)`'s argument list may
 * itself contain semicolons, so a naive `[^;]*` stops at the first one
 * inside the wrapped function body rather than at the call's actual closing
 * paren. This walks the source character by character, tracking paren depth
 * and skipping over string/template/regex literals and comments (so
 * anything quoted or nested inside the first argument doesn't throw off the
 * depth count or the split point), to find where the first argument ends
 * and the call's true closing paren is.
 */
function stripNameCalls(src) {
  const PURE_PREFIX = "/* @__PURE__ */ ";
  let out = "";
  let i = 0;

  while (i < src.length) {
    let start = i;
    if (src.startsWith(PURE_PREFIX, i) && src.startsWith("__name(", i + PURE_PREFIX.length)) {
      start = i + PURE_PREFIX.length;
    }

    if (src.startsWith("__name(", start)) {
      const callStart = start + "__name(".length;
      const call = scanNameCall(src, callStart);
      if (call) {
        let end = call.closeIdx + 1;
        if (src[end] === ";") end += 1;

        if (isStatementPosition(out)) {
          // Standalone `__name(someFn, "someFn");` bookkeeping statement —
          // drop it entirely, including the blank line it would otherwise
          // leave behind.
          while (out.length > 0 && /[ \t]/.test(out[out.length - 1])) out = out.slice(0, -1);
          if (out.endsWith("\n")) {
            let end2 = end;
            while (end2 < src.length && (src[end2] === " " || src[end2] === "\t")) end2 += 1;
            if (src[end2] === "\n") end = end2 + 1;
          }
        } else {
          // Expression position, e.g. `const x = __name((item) => {...}, "x")`
          // — keep the wrapped first argument, drop only the wrapper.
          out += call.firstArg;
        }

        i = end;
        continue;
      }
    }

    out += src[i];
    i += 1;
  }

  return out;
}

/**
 * True when the text already emitted to `out` ends right where a new
 * statement would begin — i.e. the upcoming `__name(...)` call is a
 * standalone statement rather than sitting inside an expression (an
 * assignment's right-hand side, a function argument, etc). Determined by the
 * last non-whitespace character written so far: `;`, `{`, `}`, or nothing at
 * all (start of source) all mean "a new statement starts here."
 */
function isStatementPosition(out) {
  let j = out.length - 1;
  while (j >= 0 && /\s/.test(out[j])) j -= 1;
  if (j < 0) return true;
  return out[j] === ";" || out[j] === "{" || out[j] === "}";
}

/**
 * Scans a `__name(` call's argument list starting just after the opening
 * paren. Returns the source text of the first argument (trimmed) and the
 * index of the call's matching closing paren, or null if the source runs
 * out before the call closes (defensive — should not happen on real output).
 *
 * The first argument's end is the last top-level comma before the matching
 * close paren — "top-level" meaning not inside a nested paren/brace/bracket
 * or a string/template/regex literal, since `__name`'s second argument is
 * always a plain string literal with no parens or commas of its own.
 */
function scanNameCall(src, callStart) {
  let depth = 1;
  let i = callStart;
  let lastTopLevelComma = -1;

  while (i < src.length) {
    const ch = src[i];

    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipStringLiteral(src, i, ch);
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && src[i + 1] === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i += 1;
      i += 2;
      continue;
    }
    if (ch === "(" || ch === "{" || ch === "[") {
      depth += 1;
    } else if (ch === ")" || ch === "}" || ch === "]") {
      depth -= 1;
      if (depth === 0) {
        const end = lastTopLevelComma === -1 ? i : lastTopLevelComma;
        return { firstArg: src.slice(callStart, end).trim(), closeIdx: i };
      }
    } else if (ch === "," && depth === 1) {
      lastTopLevelComma = i;
    }
    i += 1;
  }
  return null;
}

/** Returns the index just past the closing quote of the literal starting at `i`. */
function skipStringLiteral(src, i, quote) {
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === "\\") {
      j += 2;
      continue;
    }
    if (src[j] === quote) return j + 1;
    j += 1;
  }
  return j;
}

/**
 * Rewrites every identifier that keepNames says was renamed back to its true
 * name, throughout a whole block of already-concatenated source — including
 * inside functions whose OWN declaration was not itself renamed, since they
 * may still call a sibling that was.
 */
function normalizeNames(reflected, src) {
  let out = src;
  for (const r of reflected) {
    if (r.declaredAs && r.declaredAs !== r.name) {
      out = out.replace(new RegExp("\\b" + r.declaredAs + "\\b", "g"), r.name);
    }
  }
  return out;
}

const RUNTIME_FNS = [
  formatRuntime,
  formatHours,
  isRealDate,
  daysUntil,
  apiGet,
  apiPut,
  esc,
  displayDate,
  countsAsRemaining,
  showError,
  initNav,
  initSignedInLabel,
  episodeToggleHtml,
  episodeRowsContainerHtml,
  needsReviewBadge,
  looksGeneric,
  episodeRowHtml,
  episodeNoDataHtml,
  episodeLoadingHtml,
  episodeProgressLabel,
  loadEpisodeData,
  renderEpisodeRows,
  onEpisodeWatchToggle,
  apiPost,
  episodeMarkAll,
  wireEpisodeToggles,
  onEpisodeToggleClick,
].map(reflect);

// Not one of RUNTIME_FNS's reflected functions (those are serialized
// independently via toString() and share no closure once reflected) — this
// module-level cache has to be its own statement in the generated script so
// loadEpisodeData/renderEpisodeRows/episodeMarkAll can all see the same Map.
const EPISODE_CACHE_DECL = "var EPISODE_CACHE = new Map();";

// A plain string, not a reflected function, for the same reason as
// EPISODE_CACHE_DECL above — this assigns to the browser's own `window`,
// which does not exist in the Worker's scope, so it must never appear as a
// literal statement anywhere in shell.js's own module source (only inside
// this serialized string does it ever actually run). initSignedInLabel
// overwrites it once /api/settings resolves for a signed-in user; every page
// reads it as `window.userTimezone || 'America/New_York'`, so the default
// set here also covers a signed-out visitor or a failed settings fetch.
const USER_TIMEZONE_DECL = "window.userTimezone = window.userTimezone || 'America/New_York';";

const CLIENT_RUNTIME =
  EPISODE_CACHE_DECL +
  "\n\n" +
  USER_TIMEZONE_DECL +
  "\n\n" +
  normalizeNames(RUNTIME_FNS, RUNTIME_FNS.map((r) => r.src).join("\n\n"));

/* ------------------------------------------------------------- rendering -- */

function navHtml(active) {
  return NAV.map((item) => {
    const current = item.id === active ? ' aria-current="page"' : "";
    const cls = item.adminOnly ? ' class="hide nav-admin"' : "";
    return '<a href="' + item.href + '"' + current + cls + ">" + item.label + "</a>";
  }).join("\n      ");
}

/**
 * @param {object} page
 * @param {string} page.title    document title
 * @param {string} page.active   nav id to highlight
 * @param {string} page.body     markup for <main>
 * @param {Function} page.main   client entry point, serialised and invoked
 */
export function renderPage(page) {
  const main = reflect(page.main);
  // page.main's OWN declaration is never renamed (each page's entry point has
  // a unique name), but its nested functions can still call a RUNTIME_FNS
  // sibling that was — normalize against the full set, not just this page.
  const mainSrc = normalizeNames(RUNTIME_FNS, main.src);
  const script = CLIENT_RUNTIME + "\n\n" + mainSrc + "\n\n" + main.name + "();";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${page.title} · MCU Tracker</title>
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#e0313b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="MCU Tracker">
<link rel="apple-touch-icon" href="/icons/icon-192.png?v=2">
<style>${STYLES}</style>
</head>
<body>
<div class="topbar">
  <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-label="Toggle navigation" aria-controls="drawer">☰</button>
  <div class="topbar-brand"><span>MCU Tracker</span><small>watch tracker</small></div>
</div>
<nav class="rail" id="rail">
  <div class="brand desktop-brand"><span class="dot"></span><span>MCU Tracker<small>watch tracker</small></span></div>
  <div class="nav">
      ${navHtml(page.active)}
  </div>
  <div class="rail-foot whoami"></div>
</nav>
<div class="drawer-overlay hide" id="drawer-overlay"></div>
<nav class="drawer" id="drawer">
  <div class="nav">
      ${navHtml(page.active)}
  </div>
  <div class="rail-foot whoami"></div>
</nav>
<main>
<div class="content-wrap">
<div class="err hide" id="err"></div>
${page.body}
</div>
</main>
<script>
${script}
</script>
</body>
</html>
`;
}

/** Pages carry no user data themselves, but must not go stale after a deploy. */
export function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}
