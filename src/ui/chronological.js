/**
 * Chronological Order: the catalogue sorted by in-universe placement
 * (items.chrono_order, seeded from chronological-order.csv), with the same
 * per-item status control as Release Order.
 *
 * The main list only ever shows items that are both chronologically placed
 * AND already released (on or before today, Eastern time) — a future release
 * can't meaningfully occupy a spot in "what's happened so far" order even if
 * its eventual chrono_order is already known. Everything else — future-dated
 * items and items with no chronological placement at all (chrono_order NULL,
 * mostly untitled future-film placeholders with no announced setting) — is
 * combined into a trailing "Upcoming Releases" section, sorted by release
 * date, so the catalogue always accounts for every item.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Chronological Order</h1>
<p class="sub" id="subtitle">Loading…</p>

<div class="filter-bar" id="filter-bar">
  <div class="filter-bar-count" id="filter-bar-count">Showing 0 of 0 titles</div>
  <div class="filter-bar-types">
    <button type="button" data-filter="Film" aria-pressed="true">Film</button>
    <button type="button" data-filter="TV Series" aria-pressed="true">TV Series</button>
    <button type="button" data-filter="One-Shot" aria-pressed="true">One-Shot</button>
    <button type="button" data-filter="Special Presentation" aria-pressed="true">Special Presentation</button>
    <button type="button" data-filter="Marvel Television" aria-pressed="true">Marvel Television</button>
    <button type="button" data-filter="Animated Series" aria-pressed="true">Animated Series</button>
    <button type="button" class="filter-bar-ghost" id="filter-select-all">Select All</button>
    <button type="button" class="filter-bar-ghost" id="filter-deselect-all">Deselect All</button>
  </div>
</div>

<div id="signed-out" class="notice hide">
  <strong>Sign in to track your progress.</strong>
  <span class="muted">The catalogue below is public; watch status needs an account.</span>
  <div style="margin-top:12px"><a class="btn-link" href="/api/auth/google">Sign in with Google</a></div>
</div>

<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead>
      <tr>
        <th style="width:40%;text-align:center">Title</th>
        <th class="opt" style="text-align:center">Type</th>
        <th style="text-align:center">In-universe setting</th>
        <th class="num opt" style="text-align:center">Runtime</th>
        <th style="width:130px;text-align:center">Status</th>
      </tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="5" class="muted" style="padding:18px">Loading…</td></tr>
    </tbody>
  </table>
</div>
`;

function chronologicalMain() {
  const state = { items: [], statuses: new Map(), signedIn: false, activeTypes: new Set() };

  function $(id) {
    return document.getElementById(id);
  }

  function statusOptions(current) {
    const opts = [
      ["unwatched", "Unwatched"],
      ["watched", "Watched"],
      ["want_rewatch", "Rewatch"],
      ["skip", "Skip"],
    ];
    return opts
      .map(
        (o) =>
          '<option value="' +
          o[0] +
          '"' +
          (o[0] === current ? " selected" : "") +
          ">" +
          o[1] +
          "</option>"
      )
      .join("");
  }

  function sectionRow(label) {
    return '<tr class="section"><td colspan="5">' + esc(label) + "</td></tr>";
  }

  // Today's date as "YYYY-MM-DD" in America/New_York, consistent with the
  // rest of the app's Eastern-time date handling — mirrors consolidate.js's
  // todayEastern(), reimplemented here since this file runs in the browser
  // bundle rather than the Worker.
  function todayEastern() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function rowHtml(item) {
    const status = state.statuses.get(item.id) || "unwatched";
    const estimate = item.is_estimate
      ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
      : "";

    return (
      '<tr data-id="' +
      item.id +
      '" class="' +
      (status === "watched" ? "watched" : "") +
      '">' +
      '<td><span class="title">' +
      esc(item.title) +
      "</span></td>" +
      '<td class="opt"><span class="badge" data-type="' +
      esc(item.type) +
      '">' +
      esc(item.type) +
      "</span></td>" +
      "<td>" +
      esc(item.chrono_setting || "—") +
      "</td>" +
      '<td class="num opt">' +
      (item.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(item.runtime_min)) +
      estimate +
      "</td>" +
      '<td><select data-id="' +
      item.id +
      '"' +
      (state.signedIn ? "" : " disabled title=\"Sign in to track\"") +
      ">" +
      statusOptions(status) +
      "</select></td>" +
      "</tr>"
    );
  }

  // An item belongs in the main list only if it both has a chronological
  // placement AND has already released (on or before today, Eastern time) —
  // everything else (future-dated, or not yet placed at all) is upcoming.
  function isReleased(item, today) {
    return isRealDate(item.release_date) && item.release_date <= today;
  }

  function render() {
    const today = todayEastern();

    const main = state.items
      .filter((i) => i.chrono_order !== null && i.chrono_order !== undefined && isReleased(i, today))
      .sort((a, b) => a.chrono_order - b.chrono_order);

    const upcoming = state.items
      .filter((i) => !(i.chrono_order !== null && i.chrono_order !== undefined && isReleased(i, today)))
      .sort((a, b) => {
        const da = isRealDate(a.release_date) ? a.release_date : null;
        const db = isRealDate(b.release_date) ? b.release_date : null;
        if (!da && !db) return a.id - b.id;
        if (!da) return 1;
        if (!db) return -1;
        if (da === db) return a.id - b.id;
        return da < db ? -1 : 1;
      });

    let html = main.map(rowHtml).join("");
    if (upcoming.length) {
      html +=
        sectionRow("Upcoming Releases (" + upcoming.length + ")") +
        upcoming.map(rowHtml).join("");
    }
    $("rows").innerHTML = html;

    for (const sel of $("rows").querySelectorAll("select[data-id]")) {
      sel.addEventListener("change", onStatusChange);
    }

    applyTypeFilter();
  }

  function applyTypeFilter() {
    let visible = 0;
    for (const item of state.items) {
      const row = $("rows").querySelector('tr[data-id="' + item.id + '"]');
      if (!row) continue;
      const shown = state.activeTypes.has(item.type);
      row.classList.toggle("filtered-out", !shown);
      if (shown) visible++;
    }
    $("filter-bar-count").textContent =
      "Showing " + visible + " of " + state.items.length + " titles";
  }

  function onFilterToggle(ev) {
    const btn = ev.currentTarget;
    const type = btn.getAttribute("data-filter");
    const nowActive = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", nowActive ? "true" : "false");
    if (nowActive) state.activeTypes.add(type);
    else state.activeTypes.delete(type);
    applyTypeFilter();
  }

  function setAllFilters(active) {
    for (const btn of $("filter-bar").querySelectorAll("[data-filter]")) {
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      const type = btn.getAttribute("data-filter");
      if (active) state.activeTypes.add(type);
      else state.activeTypes.delete(type);
    }
    applyTypeFilter();
  }

  async function onStatusChange(ev) {
    const select = ev.target;
    const id = Number(select.getAttribute("data-id"));
    const next = select.value;
    const previous = state.statuses.get(id) || "unwatched";

    select.disabled = true;
    try {
      await apiPut("/api/watch-status/" + id, { status: next });
      state.statuses.set(id, next);
      const row = select.closest("tr");
      if (row) row.classList.toggle("watched", next === "watched");
    } catch (e) {
      select.value = previous;
      showError("Could not save that change: " + e.message);
    } finally {
      select.disabled = false;
    }
  }

  async function main() {
    initNav();
    const me = await initSignedInLabel();
    state.signedIn = me.signedIn;

    if (!state.signedIn) $("signed-out").classList.remove("hide");

    for (const btn of $("filter-bar").querySelectorAll("[data-filter]")) {
      state.activeTypes.add(btn.getAttribute("data-filter"));
      btn.addEventListener("click", onFilterToggle);
    }
    $("filter-select-all").addEventListener("click", function () {
      setAllFilters(true);
    });
    $("filter-deselect-all").addEventListener("click", function () {
      setAllFilters(false);
    });

    try {
      const items = await apiGet("/api/items");
      state.items = items.data.items;

      if (state.signedIn) {
        const watch = await apiGet("/api/watch-status");
        for (const row of (watch.data && watch.data.watch_status) || []) {
          state.statuses.set(row.item_id, row.status);
        }
      }

      const today = todayEastern();
      const mainCount = state.items.filter(
        (i) => i.chrono_order !== null && i.chrono_order !== undefined && isReleased(i, today)
      ).length;
      const upcomingCount = state.items.length - mainCount;
      $("subtitle").textContent =
        mainCount +
        " titles in in-universe order" +
        (upcomingCount ? " · " + upcomingCount + " upcoming" : "");

      render();
    } catch (e) {
      $("rows").innerHTML =
        '<tr><td colspan="5" class="muted" style="padding:18px">Could not load the catalogue.</td></tr>';
      showError(e.message);
    }
  }

  main();
}

export function chronologicalPage() {
  return renderPage({
    title: "Chronological",
    active: "chronological",
    body: BODY,
    main: chronologicalMain,
  });
}
