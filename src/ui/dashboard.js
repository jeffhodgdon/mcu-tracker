/**
 * Dashboard: countdown, pace and progress.
 *
 * Signed out it shows only a sign-in prompt, per the brief — there is no
 * per-user data to show, and the catalogue has its own pages.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Dashboard</h1>
<p class="sub" id="subtitle">Loading…</p>

<div id="signed-out" class="notice hide">
  <h2 style="text-transform:none;font-size:15px;color:var(--text)">Track your MCU progress</h2>
  <p class="muted" style="margin:0 0 14px">
    Sign in to record what you have watched, see how much is left, and set a countdown.
  </p>
  <a class="btn-link" href="/api/auth/google">Sign in with Google</a>
</div>

<div id="signed-in" class="hide">
  <div class="grid cols-3" style="margin-bottom:14px">
    <div class="card">
      <h2>Watched</h2>
      <div class="stat" id="stat-watched">—</div>
      <div class="stat-note" id="stat-watched-note"></div>
      <div class="bar"><i id="progress-bar" style="width:0%"></i></div>
    </div>
    <div class="card">
      <h2>Time remaining</h2>
      <div class="stat" id="stat-remaining">—</div>
      <div class="stat-note" id="stat-remaining-note"></div>
    </div>
    <div class="card">
      <h2>Pace needed</h2>
      <div class="stat" id="stat-pace">—</div>
      <div class="stat-note" id="stat-pace-note">Set a countdown to see a pace</div>
    </div>
  </div>

  <div class="card">
    <div class="row" style="justify-content:space-between">
      <h2 style="margin:0">Countdown</h2>
      <button type="button" id="countdown-edit-btn" class="hide" title="Edit countdown" aria-label="Edit countdown" style="background:none;border:none;cursor:pointer;font-size:16px;padding:2px 6px">✏</button>
    </div>

    <div id="countdown-summary">
      <div class="stat sm" id="countdown-headline">No target set</div>
      <div class="stat-note" id="countdown-note"></div>
    </div>

    <button type="button" id="countdown-set-btn" class="hide" style="margin-top:10px">Set a countdown</button>
  </div>

  <div class="card" style="margin-top:14px">
    <div class="row" style="justify-content:space-between">
      <h2 style="margin:0">My Watch List</h2>
      <button type="button" id="watchlist-build-btn">Build Watch List</button>
    </div>

    <div id="watchlist-empty" class="stat-note hide" style="margin-top:12px">
      Nothing on your watch list yet — click <strong>Build Watch List</strong> to add items.
    </div>

    <div class="card" id="watchlist-table-wrap" style="padding:0;overflow:hidden;margin-top:14px">
      <table>
        <thead>
          <tr>
            <th style="width:44%;text-align:center">Title</th>
            <th class="opt" style="text-align:center">Type</th>
            <th class="opt" style="text-align:center">Date</th>
            <th class="num" style="text-align:center">Runtime</th>
            <th style="width:130px;text-align:center">Status</th>
            <th style="width:36px;text-align:center"></th>
          </tr>
        </thead>
        <tbody id="watchlist-rows"></tbody>
      </table>
    </div>
  </div>
</div>

<div id="countdown-modal-overlay" class="hide" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px">
  <div id="countdown-modal" class="card" style="max-width:480px;width:100%;max-height:85vh;overflow:auto">
    <div class="row" style="justify-content:space-between">
      <h2 style="margin:0">Countdown</h2>
      <button type="button" id="countdown-modal-close" aria-label="Close" style="background:none;border:none;cursor:pointer;font-size:16px;padding:2px 6px">✕</button>
    </div>

    <div class="row" style="margin-top:14px">
      <input type="date" id="countdown-date" aria-label="Countdown target date">
      <input type="text" id="countdown-label" placeholder="Label (optional)" aria-label="Countdown label" style="flex:1;min-width:180px">
      <button id="countdown-save">Save</button>
      <button id="countdown-clear">Clear</button>
    </div>
    <div class="stat-note" id="countdown-status"></div>

    <h2 style="margin:20px 0 0">Upcoming confirmed releases</h2>
    <div class="stat-note">Pick one to make it the countdown target.</div>
    <div class="upcoming" id="upcoming"></div>
  </div>
</div>

<div id="watchlist-modal-overlay" class="hide" style="position:fixed;inset:0;background:rgba(0,0,0,0.55);display:flex;align-items:center;justify-content:center;z-index:50;padding:16px">
  <div id="watchlist-modal" class="card" style="max-width:640px;width:100%;max-height:85vh;overflow:hidden;display:flex;flex-direction:column">
    <div class="row" style="justify-content:space-between;flex:none">
      <h2 style="margin:0">Build Watch List</h2>
      <button type="button" id="watchlist-modal-close" aria-label="Close" style="background:none;border:none;cursor:pointer;font-size:16px;padding:2px 6px">✕</button>
    </div>

    <div class="row" style="margin-top:14px;flex:none">
      <label class="muted" style="font-size:13px" for="watchlist-sort">Sort by</label>
      <select id="watchlist-sort" aria-label="Sort order">
        <option value="release">Release Date</option>
        <option value="chronological">Chronological</option>
      </select>
    </div>

    <div class="row" style="margin-top:10px;flex:none">
      <button type="button" data-quick="all">All</button>
      <button type="button" data-quick="films">Films Only</button>
      <button type="button" data-quick="shows">Shows Only</button>
      <button type="button" data-quick="sacred">Sacred Timeline</button>
      <label class="switch" style="margin-left:auto">
        <input type="checkbox" id="watchlist-include-other">
        <span class="muted" style="font-size:13px">Include Other Universes</span>
      </label>
    </div>

    <div class="watchlist-picker-scroll" style="flex:1;overflow-y:auto;margin-top:8px">
      <div class="stat-note" id="watchlist-modal-status"></div>

      <div id="watchlist-picker" style="margin-top:12px"></div>
    </div>

    <div class="row" style="justify-content:flex-end;margin-top:16px;flex:none">
      <button type="button" id="watchlist-clear-btn">Clear Watch List</button>
      <button type="button" id="watchlist-cancel-btn">Cancel</button>
      <button type="button" id="watchlist-submit-btn">Save Watch List</button>
    </div>
  </div>
</div>
`;

function dashboardMain() {
  const TV_TYPES = ["TV Series", "Marvel Television", "Animated Series"];
  const MCU_TYPE_ORDER = [
    "Film",
    "TV Series",
    "One-Shot",
    "Special Presentation",
    "Marvel Television",
    "Animated Series",
  ];

  const state = {
    items: [],
    otherItems: [],
    statuses: new Map(),
    settings: null,
    watchlist: [],
    pickerChecked: new Set(),
    consolidatedGroups: [],
  };

  function $(id) {
    return document.getElementById(id);
  }

  function wlKey(source, id) {
    return source + ":" + id;
  }

  function findItem(source, id) {
    const list = source === "other" ? state.otherItems : state.items;
    return list.find((i) => i.id === id) || null;
  }

  // shell.js only exposes apiGet/apiPut as shared runtime helpers — the
  // watchlist needs POST and DELETE too, so those live here rather than
  // touching the shared file for a page-local need.
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

  async function apiDelete(path) {
    const res = await fetch(path, { method: "DELETE", credentials: "same-origin" });
    if (!res.ok) {
      let detail = res.status;
      try {
        detail = (await res.json()).error || detail;
      } catch (e) {}
      throw new Error(String(detail));
    }
    return res.json();
  }

  // Stats are scoped to the MCU catalogue's runtime data, not the whole
  // watch list — "other" source entries have no runtime_min to roll up, so
  // they are excluded from these totals even though their watch status is
  // tracked.
  function computeTotals() {
    let watched = 0;
    let remainingMinutes = 0;
    let unknownRuntime = 0;
    let total = 0;

    for (const entry of state.watchlist) {
      if (entry.source !== "mcu") continue;
      const item = findItem(entry.source, entry.item_id);
      if (!item) continue;

      total++;
      const status = state.statuses.get(wlKey(entry.source, entry.item_id)) || "unwatched";
      if (status === "watched") watched++;
      if (countsAsRemaining(status)) {
        if (typeof item.runtime_min === "number") remainingMinutes += item.runtime_min;
        else unknownRuntime++;
      }
    }
    return { watched, remainingMinutes, unknownRuntime, total };
  }

  function renderStats() {
    const t = computeTotals();
    const pct = t.total ? Math.round((t.watched / t.total) * 100) : 0;

    $("stat-watched").textContent = t.watched + " / " + t.total;
    $("stat-watched-note").textContent = t.total
      ? pct + "% of your watch list"
      : "Add items to your watch list to track progress";
    $("progress-bar").style.width = pct + "%";

    $("stat-remaining").textContent = formatRuntime(t.remainingMinutes);
    $("stat-remaining-note").textContent = !t.total
      ? "Nothing on your watch list yet"
      : t.unknownRuntime > 0
      ? t.unknownRuntime + " unwatched item(s) have no runtime yet"
      : "Across your watch list, not watched or skipped";

    renderPace(t);
  }

  function renderPace(t) {
    if (!t.total) {
      $("stat-pace").textContent = "—";
      $("stat-pace-note").textContent = "Add items to your watch list to see a pace";
      return;
    }

    const target = state.settings && state.settings.countdown_target_date;
    const days = target ? daysUntil(target) : null;

    if (!target || days === null) {
      $("stat-pace").textContent = "—";
      $("stat-pace-note").textContent = "Set a countdown to see a pace";
      return;
    }
    if (days <= 0) {
      $("stat-pace").textContent = "—";
      $("stat-pace-note").textContent =
        days === 0 ? "Target is today" : "Target date has passed";
      return;
    }
    const perDay = t.remainingMinutes / days;
    $("stat-pace").textContent = formatRuntime(perDay) + "/day";
    $("stat-pace-note").textContent =
      "To finish " + formatRuntime(t.remainingMinutes) + " in " + days + " days";
  }

  function renderCountdown() {
    const s = state.settings || {};
    const target = s.countdown_target_date;
    const days = target ? daysUntil(target) : null;

    $("countdown-summary").classList.toggle("hide", !target);
    $("countdown-edit-btn").classList.toggle("hide", !target);
    $("countdown-set-btn").classList.toggle("hide", !!target);

    if (!target) {
      $("countdown-headline").textContent = "No target set";
      $("countdown-note").textContent = "Choose a date, or pick a release below.";
      return;
    }
    const label = s.countdown_label || "Countdown";
    if (days === null) {
      $("countdown-headline").textContent = label;
      $("countdown-note").textContent = "Target date is not a full date.";
    } else if (days > 0) {
      $("countdown-headline").textContent = days + (days === 1 ? " day" : " days") + " to go";
      $("countdown-note").textContent = label + " · " + displayDate(target);
    } else if (days === 0) {
      $("countdown-headline").textContent = "Today";
      $("countdown-note").textContent = label + " · " + displayDate(target);
    } else {
      $("countdown-headline").textContent = Math.abs(days) + " days ago";
      $("countdown-note").textContent = label + " · " + displayDate(target);
    }
  }

  function renderUpcoming() {
    // Only fully-specified future dates: partial placeholders like 2027-07-00
    // are not confirmed releases and cannot anchor a countdown.
    const upcoming = state.items
      .filter((i) => isRealDate(i.release_date) && daysUntil(i.release_date) > 0)
      .sort((a, b) => (a.release_date < b.release_date ? -1 : 1))
      .slice(0, 10);

    const box = $("upcoming");
    if (!upcoming.length) {
      box.innerHTML = '<div class="stat-note">No upcoming dated releases in the catalogue.</div>';
      return;
    }
    box.innerHTML = upcoming
      .map(
        (i) =>
          '<button type="button" data-date="' +
          esc(i.release_date) +
          '" data-label="' +
          esc(i.title) +
          '"><span>' +
          esc(i.title) +
          '</span><span class="d">' +
          esc(displayDate(i.release_date)) +
          " · " +
          daysUntil(i.release_date) +
          "d</span></button>"
      )
      .join("");

    for (const btn of box.querySelectorAll("button")) {
      btn.addEventListener("click", function () {
        saveSettings(btn.getAttribute("data-date"), btn.getAttribute("data-label"));
      });
    }
  }

  async function saveSettings(date, label) {
    const note = $("countdown-status");
    note.textContent = "Saving…";
    try {
      const res = await apiPut("/api/settings", {
        countdown_target_date: date,
        countdown_label: label,
      });
      state.settings = res.settings;
      $("countdown-date").value = res.settings.countdown_target_date || "";
      $("countdown-label").value = res.settings.countdown_label || "";
      note.textContent = date ? "Saved." : "Countdown cleared.";
      renderCountdown();
      renderStats();
      closeCountdownModal();
    } catch (e) {
      note.textContent = "Could not save: " + e.message;
    }
  }

  function openCountdownModal() {
    $("countdown-status").textContent = "";
    $("countdown-modal-overlay").classList.remove("hide");
  }

  function closeCountdownModal() {
    $("countdown-modal-overlay").classList.add("hide");
  }

  /* ------------------------------------------------------- watch list card */

  function watchlistRowHtml(entry, child) {
    const item = findItem(entry.source, entry.item_id);
    if (!item) return "";

    const key = wlKey(entry.source, entry.item_id);
    const status = state.statuses.get(key) || "unwatched";
    const typeLabel =
      entry.source === "mcu"
        ? item.type
        : /Season/.test(item.title || "")
        ? "TV Series"
        : "Film";
    const runtime =
      item.runtime_min === null || item.runtime_min === undefined
        ? '<span class="muted">—</span>'
        : formatRuntime(item.runtime_min);

    const statusCell =
      '<input type="checkbox" class="watchlist-watched-toggle" data-key="' +
      esc(key) +
      '" data-id="' +
      item.id +
      '" data-source="' +
      esc(entry.source) +
      '"' +
      (status === "watched" ? " checked" : "") +
      ' aria-label="Mark watched">';

    const mode = watchlistSortMode();
    const dateLabel =
      mode === "chronological"
        ? (entry.source === "mcu" ? item.chrono_setting : item.setting) || "—"
        : (item.release_date || "").slice(0, 4) || "—";

    const classes = [];
    if (status === "watched") classes.push("watched");
    if (child) classes.push("tv-child", "hide");

    return (
      '<tr data-key="' +
      esc(key) +
      '" data-group="' +
      (child ? "watched" : "") +
      '" class="' +
      classes.join(" ") +
      '">' +
      '<td style="text-align:left"><span class="title">' +
      esc(item.title) +
      "</span></td>" +
      '<td class="opt"><span class="badge" data-type="' +
      esc(typeLabel) +
      '">' +
      esc(typeLabel) +
      "</span></td>" +
      '<td class="opt">' +
      esc(dateLabel) +
      "</td>" +
      '<td class="num">' +
      runtime +
      "</td>" +
      "<td>" +
      statusCell +
      "</td>" +
      '<td><button type="button" class="watchlist-remove" data-key="' +
      esc(key) +
      '" aria-label="Remove from watch list" title="Remove from watch list" style="background:none;border:none;cursor:pointer;font-size:14px">✕</button></td>' +
      "</tr>"
    );
  }

  function watchedGroupParentHtml(count) {
    return (
      '<tr class="tv-parent" data-group="watched-parent" style="cursor:pointer">' +
      '<td style="text-align:left"><span class="collapse-indicator">▶</span> <span class="title">Watched (' +
      count +
      ")</span></td>" +
      '<td class="opt"></td>' +
      '<td class="opt"></td>' +
      '<td class="num"></td>' +
      "<td></td>" +
      "<td></td>" +
      "</tr>"
    );
  }

  function watchlistSortMode() {
    return state.settings && state.settings.watchlist_sort === "chronological"
      ? "chronological"
      : "release";
  }

  // First year found in an other_universes "setting" string, e.g.
  // "1943 / 1993" -> 1943, "1845 - 1979" -> 1845. Settings with no year
  // ("contemporary") sort after everything with a known year.
  function firstSettingYear(setting) {
    const m = /\d{4}/.exec(setting || "");
    return m ? Number(m[0]) : Infinity;
  }

  function sortWatchlistEntries(entries, mode) {
    return entries.slice().sort((a, b) => {
      const itemA = findItem(a.source, a.item_id);
      const itemB = findItem(b.source, b.item_id);

      if (mode === "chronological") {
        const ka =
          a.source === "mcu"
            ? itemA && itemA.chrono_order != null
              ? itemA.chrono_order
              : Infinity
            : firstSettingYear(itemA && itemA.setting);
        const kb =
          b.source === "mcu"
            ? itemB && itemB.chrono_order != null
              ? itemB.chrono_order
              : Infinity
            : firstSettingYear(itemB && itemB.setting);
        if (ka === kb) return 0;
        return ka < kb ? -1 : 1;
      }

      const da = normalizeDateKey((itemA && itemA.release_date) || "");
      const db = normalizeDateKey((itemB && itemB.release_date) || "");
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      if (da === db) return 0;
      return da < db ? -1 : 1;
    });
  }

  function renderWatchlistTable() {
    if (!state.watchlist.length) {
      $("watchlist-empty").classList.remove("hide");
      $("watchlist-table-wrap").classList.add("hide");
      return;
    }
    $("watchlist-empty").classList.add("hide");
    $("watchlist-table-wrap").classList.remove("hide");

    const unwatched = [];
    const watched = [];
    for (const entry of state.watchlist) {
      const item = findItem(entry.source, entry.item_id);
      if (!item) continue;
      const status = state.statuses.get(wlKey(entry.source, entry.item_id)) || "unwatched";
      (status === "watched" ? watched : unwatched).push(entry);
    }

    const sortedUnwatched = sortWatchlistEntries(unwatched, watchlistSortMode());

    let html = sortedUnwatched.map((e) => watchlistRowHtml(e, false)).join("");
    if (watched.length) {
      html += watchedGroupParentHtml(watched.length);
      html += watched.map((e) => watchlistRowHtml(e, true)).join("");
    }

    $("watchlist-rows").innerHTML =
      html || '<tr><td colspan="6" class="muted" style="padding:14px">Nothing here.</td></tr>';

    for (const cb of $("watchlist-rows").querySelectorAll("input.watchlist-watched-toggle")) {
      cb.addEventListener("change", onWatchlistWatchedToggle);
    }
    for (const btn of $("watchlist-rows").querySelectorAll(".watchlist-remove")) {
      btn.addEventListener("click", onWatchlistRemove);
    }
    const parent = $("watchlist-rows").querySelector('tr.tv-parent[data-group="watched-parent"]');
    if (parent) parent.addEventListener("click", onWatchedGroupToggle);
  }

  function onWatchedGroupToggle(ev) {
    if (ev.target.closest("select") || ev.target.closest("button")) return;
    const tr = ev.currentTarget;
    const expanded = tr.classList.toggle("expanded");
    const indicator = tr.querySelector(".collapse-indicator");
    if (indicator) indicator.textContent = expanded ? "▼" : "▶";
    for (const child of $("watchlist-rows").querySelectorAll('tr.tv-child[data-group="watched"]')) {
      child.classList.toggle("hide", !expanded);
    }
  }

  async function onWatchlistWatchedToggle(ev) {
    const checkbox = ev.target;
    const id = Number(checkbox.getAttribute("data-id"));
    const source = checkbox.getAttribute("data-source") || "mcu";
    const key = wlKey(source, id);
    const previous = state.statuses.get(key) || "unwatched";
    const next = checkbox.checked ? "watched" : "unwatched";

    checkbox.disabled = true;
    try {
      await apiPut("/api/watch-status/" + id + "?source=" + encodeURIComponent(source), {
        status: next,
      });
      state.statuses.set(key, next);
      renderStats();
      renderWatchlistTable();
    } catch (e) {
      checkbox.checked = previous === "watched";
      checkbox.disabled = false;
      showError("Could not save that change: " + e.message);
    }
  }

  async function onWatchlistRemove(ev) {
    const btn = ev.currentTarget;
    const key = btn.getAttribute("data-key");
    const entry = state.watchlist.find((e) => wlKey(e.source, e.item_id) === key);
    if (!entry) return;

    btn.disabled = true;
    try {
      await apiDelete(
        "/api/watchlist/" + entry.item_id + "?source=" + encodeURIComponent(entry.source)
      );
      state.watchlist = state.watchlist.filter((e) => e !== entry);
      renderWatchlistTable();
      renderStats();
    } catch (e) {
      btn.disabled = false;
      showError("Could not remove that item: " + e.message);
    }
  }

  /* --------------------------------------------------- build watchlist modal */

  function mcuTypeGroups(items) {
    const byType = new Map();
    for (const item of items || state.items) {
      if (!byType.has(item.type)) byType.set(item.type, []);
      byType.get(item.type).push(item);
    }
    const types = [...byType.keys()].sort((a, b) => {
      const ai = MCU_TYPE_ORDER.indexOf(a);
      const bi = MCU_TYPE_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return types.map((t) => ({ type: t, items: byType.get(t) }));
  }

  function sortByChronoOrder(items) {
    return items.slice().sort((a, b) => {
      const ao = a.chrono_order;
      const bo = b.chrono_order;
      if (ao === null || ao === undefined) return bo === null || bo === undefined ? a.id - b.id : 1;
      if (bo === null || bo === undefined) return -1;
      return ao - bo;
    });
  }

  function sortByReleaseDate(items) {
    return items.slice().sort((a, b) => {
      if (!a.release_date && !b.release_date) return a.id - b.id;
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      if (a.release_date === b.release_date) return a.id - b.id;
      return a.release_date < b.release_date ? -1 : 1;
    });
  }

  // other_universes.release_date may be a bare year ("1986") rather than a
  // full ISO date ("1986-08-01") — normalize so string comparison against
  // full dates still orders correctly.
  function normalizeDateKey(value) {
    if (/^\d{4}$/.test(value)) return value + "-01-01";
    return value;
  }

  // Only real past/present dates are usable as a watch-list anchor: null,
  // partial placeholders ("2027-07-00"), and future dates are excluded.
  // other_universes rows may carry a bare year ("1986") rather than a full
  // ISO date, which isRealDate() rejects outright — normalize to a full date
  // first so those still pass the check. Shared by both the Release Date and
  // Chronological picker modes.
  function isPastOrPresent(item) {
    const value = /^\d{4}$/.test(item.release_date || "")
      ? normalizeDateKey(item.release_date)
      : item.release_date;
    return isRealDate(value) && daysUntil(value) <= 0;
  }

  // Per-type groups, each sorted by release_date, in fixed MCU_TYPE_ORDER.
  // Other Universes is rendered separately by renderPicker so the
  // Consolidated section can sit between the media-type groups and it.
  function releaseModeGroups() {
    const mcuItems = state.items.filter(isPastOrPresent);

    return mcuTypeGroups(mcuItems).map((g) => ({
      label: g.type,
      entries: sortByReleaseDate(g.items).map((item) => ({ item, source: "mcu" })),
    }));
  }

  function pickerGroupHtml(label, entries) {
    if (!entries.length) return "";
    const rows = entries
      .map(({ item, source }) => {
        const key = wlKey(source, item.id);
        const checked = state.pickerChecked.has(key) ? " checked" : "";
        const runtime = item.runtime_min === null || item.runtime_min === undefined ? "—" : formatRuntime(item.runtime_min);
        const secondary = source === "mcu" ? displayDate(item.release_date) : item.setting || "—";
        const type = source === "mcu" ? item.type : /Season/.test(item.title || "") ? "TV Series" : "Film";
        return (
          '<label class="row" style="padding:4px 0;gap:8px;text-align:left">' +
          '<input type="checkbox" data-key="' +
          esc(key) +
          '"' +
          checked +
          ">" +
          '<span style="flex:1;text-align:left">' +
          esc(item.title) +
          "</span>" +
          '<span class="badge" data-type="' +
          esc(type) +
          '">' +
          esc(type) +
          "</span>" +
          '<span class="muted" style="font-size:12px;white-space:nowrap">' +
          esc(secondary) +
          " · " +
          runtime +
          "</span>" +
          "</label>"
        );
      })
      .join("");

    return (
      '<div class="picker-group" style="margin-bottom:10px;text-align:left">' +
      '<div class="picker-group-header" style="cursor:pointer;font-weight:600;padding:6px 0">' +
      '<span class="collapse-indicator">▶</span> ' +
      esc(label) +
      " (" +
      entries.length +
      ")</div>" +
      '<div class="picker-group-body hide" style="padding-left:20px">' +
      rows +
      "</div>" +
      "</div>"
    );
  }

  async function onWatchlistSortChange() {
    const mode = $("watchlist-sort").value;
    renderPicker();
    try {
      const res = await apiPut("/api/settings", { watchlist_sort: mode });
      state.settings = res.settings;
      renderWatchlistTable();
    } catch (e) {
      showError("Could not save sort preference: " + e.message);
    }
  }

  function renderPicker() {
    const mode = $("watchlist-sort").value;
    const includeOther = $("watchlist-include-other").checked;

    let html = "";
    let otherGroupHtml = "";

    if (mode === "release") {
      for (const group of releaseModeGroups()) {
        html += pickerGroupHtml(group.label, group.entries);
      }
    } else {
      const mcuItems = state.items.filter(isPastOrPresent);
      for (const group of mcuTypeGroups(mcuItems)) {
        const entries = sortByChronoOrder(group.items).map((item) => ({ item, source: "mcu" }));
        html += pickerGroupHtml(group.type, entries);
      }
    }

    html += consolidatedSectionHtml();

    if (includeOther) {
      const others = state.otherItems.filter(isPastOrPresent);
      const entries =
        mode === "release"
          ? sortByReleaseDate(others).map((item) => ({ item, source: "other" }))
          : others
              .slice()
              .sort((a, b) => (a.title < b.title ? -1 : 1))
              .map((item) => ({ item, source: "other" }));
      otherGroupHtml = pickerGroupHtml("Other Universes", entries);
    }

    html += otherGroupHtml;

    $("watchlist-picker").innerHTML = html;

    for (const header of $("watchlist-picker").querySelectorAll(".picker-group-header")) {
      header.addEventListener("click", onPickerGroupToggle);
    }
    for (const cb of $("watchlist-picker").querySelectorAll(
      '.picker-group-body > label > input[type="checkbox"]:not(.franchise-item-cb)'
    )) {
      cb.addEventListener("change", onPickerCheckboxChange);
    }

    initConsolidatedSection();
  }

  function onPickerGroupToggle(ev) {
    const header = ev.currentTarget;
    const body = header.nextElementSibling;
    const nowHidden = body.classList.toggle("hide");
    const indicator = header.querySelector(".collapse-indicator");
    if (indicator) indicator.textContent = nowHidden ? "▶" : "▼";
  }

  function onPickerCheckboxChange(ev) {
    const cb = ev.target;
    const key = cb.getAttribute("data-key");
    if (cb.checked) state.pickerChecked.add(key);
    else state.pickerChecked.delete(key);
    syncCheckedStateToDom(key, cb.checked);
  }

  // The flat media-type groups and the Consolidated section each render their
  // own checkbox element for the same mcu item, both keyed off the same
  // state.pickerChecked entry — so a change in one view has to be mirrored
  // onto the other view's element, and the affected franchise's tri-state
  // parent has to be re-synced, or the two views drift out of sight until the
  // next full renderPicker() (a quick-select click, sort change, etc).
  function syncCheckedStateToDom(key, checked) {
    for (const other of $("watchlist-picker").querySelectorAll(
      '[data-key="' + esc(key) + '"]'
    )) {
      if (other.checked !== checked) other.checked = checked;
      const groupEl = other.closest(".franchise-group");
      if (groupEl) syncFranchiseParentCheckbox(groupEl);
    }
  }

  /* ---------------------------------------------------- consolidated section */

  function franchiseItemHtml(item) {
    const key = wlKey("mcu", item.id);
    const checked = state.pickerChecked.has(key) ? " checked" : "";
    const runtime =
      item.runtime_min === null || item.runtime_min === undefined ? "—" : formatRuntime(item.runtime_min);
    return (
      '<label class="row" style="padding:4px 0;gap:8px;text-align:left">' +
      '<input type="checkbox" class="franchise-item-cb" data-key="' +
      esc(key) +
      '"' +
      checked +
      ">" +
      '<span style="flex:1;text-align:left">' +
      esc(item.title) +
      "</span>" +
      '<span class="badge" data-type="' +
      esc(item.type) +
      '">' +
      esc(item.type) +
      "</span>" +
      '<span class="muted" style="font-size:12px;white-space:nowrap">' +
      esc(displayDate(item.release_date)) +
      " · " +
      runtime +
      "</span>" +
      "</label>"
    );
  }

  function franchiseGroupHtml(group) {
    const memberItems = group.member_ids.map((id) => findItem("mcu", id)).filter(Boolean);
    const orderedItems = mcuTypeGroups(memberItems).reduce((acc, g) => acc.concat(g.items), []);
    if (!orderedItems.length) return "";

    const checkedCount = orderedItems.filter((item) =>
      state.pickerChecked.has(wlKey("mcu", item.id))
    ).length;

    const rows = orderedItems.map(franchiseItemHtml).join("");

    return (
      '<div class="picker-group franchise-group" data-franchise="' +
      esc(group.base_title) +
      '" style="margin-bottom:10px;text-align:left">' +
      '<div class="row franchise-group-header" style="cursor:pointer;gap:8px;padding:6px 0">' +
      '<input type="checkbox" class="franchise-parent-cb" data-franchise="' +
      esc(group.base_title) +
      '">' +
      '<span class="collapse-indicator">▶</span>' +
      '<span style="font-weight:600;flex:1">' +
      esc(group.base_title) +
      "</span>" +
      '<span class="muted franchise-count" style="font-size:12px">(' +
      checkedCount +
      " selected / " +
      orderedItems.length +
      " total)</span>" +
      "</div>" +
      '<div class="picker-group-body franchise-items hide">' +
      rows +
      "</div>" +
      "</div>"
    );
  }

  function consolidatedSectionHtml() {
    const rows = state.consolidatedGroups.map(franchiseGroupHtml).join("");
    return (
      '<div class="picker-group consolidated-section" style="margin-bottom:10px;text-align:left">' +
      '<div class="picker-group-header consolidated-section-header" style="cursor:pointer;font-weight:600;padding:6px 0">' +
      '<span class="collapse-indicator">▶</span> Consolidated' +
      "</div>" +
      '<div class="picker-group-body hide" style="padding-left:20px">' +
      rows +
      "</div>" +
      "</div>"
    );
  }

  function initConsolidatedSection() {
    const section = $("watchlist-picker").querySelector(".consolidated-section");
    if (!section) return;

    for (const group of section.querySelectorAll(".franchise-group")) {
      syncFranchiseParentCheckbox(group);
    }

    for (const header of section.querySelectorAll(".franchise-group-header")) {
      header.addEventListener("click", onFranchiseHeaderClick);
    }
    for (const cb of section.querySelectorAll("input.franchise-parent-cb")) {
      cb.addEventListener("click", function (ev) {
        ev.stopPropagation();
      });
      cb.addEventListener("change", onFranchiseParentChange);
    }
    for (const cb of section.querySelectorAll("input.franchise-item-cb")) {
      cb.addEventListener("change", onFranchiseItemChange);
    }
  }

  function syncFranchiseParentCheckbox(groupEl) {
    const items = groupEl.querySelectorAll("input.franchise-item-cb");
    const parent = groupEl.querySelector("input.franchise-parent-cb");
    if (!parent || !items.length) return;

    let checkedCount = 0;
    for (const cb of items) if (cb.checked) checkedCount++;

    parent.checked = checkedCount === items.length;
    parent.indeterminate = checkedCount > 0 && checkedCount < items.length;

    const countLabel = groupEl.querySelector(".franchise-count");
    if (countLabel) {
      countLabel.textContent = "(" + checkedCount + " selected / " + items.length + " total)";
    }
  }

  function onFranchiseHeaderClick(ev) {
    if (ev.target.closest("input")) return;
    const header = ev.currentTarget;
    const body = header.nextElementSibling;
    const nowHidden = body.classList.toggle("hide");
    const indicator = header.querySelector(".collapse-indicator");
    if (indicator) indicator.textContent = nowHidden ? "▶" : "▼";
  }

  function onFranchiseParentChange(ev) {
    const parent = ev.target;
    const groupEl = parent.closest(".franchise-group");
    const checkAll = parent.checked;

    for (const cb of groupEl.querySelectorAll("input.franchise-item-cb")) {
      cb.checked = checkAll;
      const key = cb.getAttribute("data-key");
      if (checkAll) state.pickerChecked.add(key);
      else state.pickerChecked.delete(key);
      syncCheckedStateToDom(key, checkAll);
    }
    syncFranchiseParentCheckbox(groupEl);
  }

  function onFranchiseItemChange(ev) {
    const cb = ev.target;
    const key = cb.getAttribute("data-key");
    if (cb.checked) state.pickerChecked.add(key);
    else state.pickerChecked.delete(key);

    const groupEl = cb.closest(".franchise-group");
    if (groupEl) syncFranchiseParentCheckbox(groupEl);
    syncCheckedStateToDom(key, cb.checked);
  }

  function markActiveQuickSelect(kind) {
    for (const btn of document.querySelectorAll("#watchlist-modal [data-quick]")) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-quick") === kind ? "true" : "false");
    }
  }

  function applyQuickSelect(kind) {
    const includeOther = $("watchlist-include-other").checked;
    markActiveQuickSelect(kind);

    const next = new Set();

    if (kind === "all") {
      for (const item of state.items) next.add(wlKey("mcu", item.id));
      if (includeOther) for (const item of state.otherItems) next.add(wlKey("other", item.id));
    } else if (kind === "films") {
      for (const item of state.items) {
        if (item.type === "Film") next.add(wlKey("mcu", item.id));
      }
    } else if (kind === "shows") {
      for (const item of state.items) {
        if (TV_TYPES.indexOf(item.type) !== -1) next.add(wlKey("mcu", item.id));
      }
    } else if (kind === "sacred") {
      for (const item of state.items) next.add(wlKey("mcu", item.id));
    }

    state.pickerChecked = next;
    renderPicker();
  }

  function openWatchlistModal() {
    state.pickerChecked = new Set(state.watchlist.map((e) => wlKey(e.source, e.item_id)));
    markActiveQuickSelect(null);
    $("watchlist-modal-status").textContent = "";
    $("watchlist-sort").value = watchlistSortMode();
    $("watchlist-include-other").checked = state.watchlist.some((e) => e.source === "other");
    renderPicker();
    $("watchlist-modal-overlay").classList.remove("hide");
  }

  function closeWatchlistModal() {
    $("watchlist-modal-overlay").classList.add("hide");
  }

  async function clearWatchlist() {
    const statusBox = $("watchlist-modal-status");
    if (!state.watchlist.length) {
      closeWatchlistModal();
      return;
    }
    if (!confirm("Remove all items from your watch list?")) return;

    statusBox.textContent = "Clearing…";
    $("watchlist-clear-btn").disabled = true;
    try {
      for (const entry of state.watchlist) {
        await apiPut(
          "/api/watch-status/" + entry.item_id + "?source=" + encodeURIComponent(entry.source),
          { status: "unwatched" }
        );
        state.statuses.set(wlKey(entry.source, entry.item_id), "unwatched");
        await apiDelete("/api/watchlist/" + entry.item_id + "?source=" + entry.source);
      }
      state.watchlist = [];
      state.pickerChecked = new Set();
      renderWatchlistTable();
      renderStats();
      closeWatchlistModal();
    } catch (e) {
      statusBox.textContent = "Could not clear: " + e.message;
    } finally {
      $("watchlist-clear-btn").disabled = false;
    }
  }

  async function submitWatchlist() {
    const includeOther = $("watchlist-include-other").checked;
    const items = [];
    for (const key of state.pickerChecked) {
      const idx = key.indexOf(":");
      const source = key.slice(0, idx);
      const id = Number(key.slice(idx + 1));
      if (source === "other" && !includeOther) continue;
      items.push({ item_id: id, source: source });
    }

    const statusBox = $("watchlist-modal-status");
    if (!items.length) {
      statusBox.textContent = "Select at least one item.";
      return;
    }

    statusBox.textContent = "Saving…";
    $("watchlist-submit-btn").disabled = true;
    try {
      const res = await apiPost("/api/watchlist", { items });
      state.watchlist = res.watchlist;
      renderWatchlistTable();
      renderStats();
      closeWatchlistModal();
    } catch (e) {
      statusBox.textContent = "Could not save: " + e.message;
    } finally {
      $("watchlist-submit-btn").disabled = false;
    }
  }

  async function main() {
    initNav();
    const me = await initSignedInLabel();

    if (!me.signedIn) {
      $("subtitle").textContent = "Signed out — sign in to track your progress.";
      $("signed-out").classList.remove("hide");
      return;
    }

    $("signed-in").classList.remove("hide");

    try {
      const [items, watch, settings, otherUniverses, watchlist, consolidated] = await Promise.all([
        apiGet("/api/items"),
        apiGet("/api/watch-status"),
        apiGet("/api/settings"),
        apiGet("/api/other-universes"),
        apiGet("/api/watchlist"),
        apiGet("/api/consolidated"),
      ]);

      state.items = items.data.items;
      state.otherItems = (otherUniverses.data && otherUniverses.data.other_universes) || [];
      state.settings = settings.data ? settings.data.settings : {};
      state.watchlist = (watchlist.data && watchlist.data.watchlist) || [];
      state.consolidatedGroups = (consolidated.data && consolidated.data.groups) || [];
      for (const row of (watch.data && watch.data.watch_status) || []) {
        state.statuses.set(wlKey(row.source || "mcu", row.item_id), row.status);
      }

      $("subtitle").textContent = state.items.length + " titles in the catalogue";

      $("countdown-date").value = state.settings.countdown_target_date || "";
      $("countdown-label").value = state.settings.countdown_label || "";

      renderStats();
      renderCountdown();
      renderUpcoming();
      renderWatchlistTable();

      $("countdown-edit-btn").addEventListener("click", openCountdownModal);
      $("countdown-set-btn").addEventListener("click", openCountdownModal);
      $("countdown-modal-close").addEventListener("click", closeCountdownModal);
      $("countdown-modal-overlay").addEventListener("click", function (ev) {
        if (ev.target === $("countdown-modal-overlay")) closeCountdownModal();
      });
      $("countdown-save").addEventListener("click", function () {
        const date = $("countdown-date").value;
        if (!date) {
          $("countdown-status").textContent = "Pick a date first.";
          return;
        }
        saveSettings(date, $("countdown-label").value.trim() || null);
      });
      $("countdown-clear").addEventListener("click", function () {
        $("countdown-date").value = "";
        $("countdown-label").value = "";
        saveSettings(null, null);
      });

      $("watchlist-build-btn").addEventListener("click", openWatchlistModal);
      $("watchlist-modal-close").addEventListener("click", closeWatchlistModal);
      $("watchlist-cancel-btn").addEventListener("click", closeWatchlistModal);
      $("watchlist-submit-btn").addEventListener("click", submitWatchlist);
      $("watchlist-clear-btn").addEventListener("click", clearWatchlist);
      $("watchlist-modal-overlay").addEventListener("click", function (ev) {
        if (ev.target === $("watchlist-modal-overlay")) closeWatchlistModal();
      });
      $("watchlist-sort").addEventListener("change", onWatchlistSortChange);
      $("watchlist-include-other").addEventListener("change", renderPicker);
      for (const btn of document.querySelectorAll("#watchlist-modal [data-quick]")) {
        btn.addEventListener("click", function () {
          applyQuickSelect(btn.getAttribute("data-quick"));
        });
      }
    } catch (e) {
      showError("Could not load your data: " + e.message);
    }
  }

  main();
}

export function dashboardPage() {
  return renderPage({
    title: "Dashboard",
    active: "dashboard",
    body: BODY,
    main: dashboardMain,
  });
}
