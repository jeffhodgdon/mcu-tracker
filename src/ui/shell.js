/**
 * The HTML shell every page shares: <head>, the nav rail, and the client-side
 * runtime.
 *
 * Pages are static HTML and fetch their data from the existing JSON API. The
 * helpers below are serialised into the page with Function.prototype.toString()
 * rather than being retyped as strings, so the browser runs exactly the code
 * that format.js unit tests cover — there is no second implementation of the
 * runtime formatting to drift out of sync.
 */

import { STYLES } from "./styles.js";
import { formatRuntime, formatHours, isRealDate, daysUntil } from "./format.js";

export const NAV = [
  { href: "/", id: "dashboard", label: "Dashboard" },
  { href: "/release", id: "release", label: "Release Order" },
  { href: "/chronological", id: "chronological", label: "Chronological" },
  { href: "/consolidated", id: "consolidated", label: "Consolidated" },
  { href: "/other", id: "other", label: "Other Universes" },
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

function initNav() {
  const btn = document.getElementById("menu-btn");
  const rail = document.getElementById("rail");
  if (!btn || !rail) return;
  btn.addEventListener("click", function () {
    const open = rail.classList.toggle("open");
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

async function initSignedInLabel() {
  try {
    const me = await apiGet("/api/me");
    const box = document.getElementById("whoami");
    if (!box) return me;
    if (me.signedIn) {
      box.innerHTML =
        '<div class="who">' +
        esc(me.data.user.email) +
        '</div><button id="logout" style="margin-top:8px;padding:5px 9px;font-size:12px">Sign out</button>';
      const out = document.getElementById("logout");
      out.addEventListener("click", async function () {
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        location.reload();
      });
    } else {
      box.innerHTML = '<a class="btn-link" href="/api/auth/google">Sign in with Google</a>';
    }
    return me;
  } catch (e) {
    return { signedIn: false, data: null };
  }
}

const CLIENT_RUNTIME = [
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
]
  .map((fn) => fn.toString())
  .join("\n\n");

/* ------------------------------------------------------------- rendering -- */

function navHtml(active) {
  return NAV.map((item) => {
    const current = item.id === active ? ' aria-current="page"' : "";
    return '<a href="' + item.href + '"' + current + ">" + item.label + "</a>";
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
  const script = CLIENT_RUNTIME + "\n\n" + page.main.toString() + "\n\n" + page.main.name + "();";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${page.title} · MCU Tracker</title>
<style>${STYLES}</style>
</head>
<body>
<nav class="rail" id="rail">
  <div class="topbar">
    <div class="brand"><span class="dot"></span><span>MCU Tracker</span></div>
    <button class="menu-btn" id="menu-btn" aria-expanded="false" aria-label="Toggle navigation">Menu</button>
  </div>
  <div class="brand desktop-brand"><span class="dot"></span><span>MCU Tracker<small>watch tracker</small></span></div>
  <div class="nav">
      ${navHtml(page.active)}
  </div>
  <div class="rail-foot" id="whoami"></div>
</nav>
<main>
<div class="err hide" id="err"></div>
${page.body}
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
