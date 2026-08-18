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
            <th style="width:44%">Title</th>
            <th class="opt">Type</th>
            <th class="num">Runtime</th>
            <th style="width:130px">Status</th>
            <th style="width:36px"></th>
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
  <div id="watchlist-modal" class="card" style="max-width:640px;width:100%;max-height:85vh;overflow:auto">
    <div class="row" style="justify-content:space-between">
      <h2 style="margin:0">Build Watch List</h2>
      <button type="button" id="watchlist-modal-close" aria-label="Close" style="background:none;border:none;cursor:pointer;font-size:16px;padding:2px 6px">✕</button>
    </div>

    <div class="row" style="margin-top:14px">
      <label class="muted" style="font-size:13px" for="watchlist-sort">Sort by</label>
      <select id="watchlist-sort" aria-label="Sort order">
        <option value="release">Release Date</option>
        <option value="chronological">Chronological</option>
      </select>
    </div>

    <div class="row" style="margin-top:10px">
      <button type="button" data-quick="all">All</button>
      <button type="button" data-quick="films">Films Only</button>
      <button type="button" data-quick="shows">Shows Only</button>
      <button type="button" data-quick="sacred">Sacred Timeline</button>
      <button type="button" data-quick="consolidated">Consolidated</button>
      <label class="switch" style="margin-left:auto">
        <input type="checkbox" id="watchlist-include-other">
        <span class="muted" style="font-size:13px">Include Other Universes</span>
      </label>
    </div>

    <div class="stat-note" id="watchlist-modal-status" style="margin-top:8px"></div>

    <div id="watchlist-picker" style="margin-top:12px"></div>

    <div class="row" style="justify-content:flex-end;margin-top:16px">
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

  // Stats are scoped to the watch list, not the whole 117-item catalogue —
  // "other" source entries are excluded because watch_status only tracks
  // items(id) (see the "other" source's disabled status cell above, same
  // underlying limitation).
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
      const status = state.statuses.get(entry.item_id) || "unwatched";
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
    const status = entry.source === "mcu" ? state.statuses.get(entry.item_id) || "unwatched" : null;
    const typeLabel = entry.source === "mcu" ? item.type : item.universe || "Other";
    const runtime =
      item.runtime_min === null || item.runtime_min === undefined
        ? '<span class="muted">—</span>'
        : formatRuntime(item.runtime_min);

    const statusCell =
      entry.source === "mcu"
        ? '<input type="checkbox" class="watchlist-watched-toggle" data-key="' +
          esc(key) +
          '" data-id="' +
          item.id +
          '"' +
          (status === "watched" ? " checked" : "") +
          ' aria-label="Mark watched">'
        : '<span class="muted" title="Watch status is not tracked for Other Universes items">—</span>';

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
      '<td class="opt"><span class="badge">' +
      esc(typeLabel) +
      "</span></td>" +
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
      '<td class="num"></td>' +
      "<td></td>" +
      "<td></td>" +
      "</tr>"
    );
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
      const status = entry.source === "mcu" ? state.statuses.get(entry.item_id) || "unwatched" : "unwatched";
      (status === "watched" ? watched : unwatched).push(entry);
    }

    let html = unwatched.map((e) => watchlistRowHtml(e, false)).join("");
    if (watched.length) {
      html += watchedGroupParentHtml(watched.length);
      html += watched.map((e) => watchlistRowHtml(e, true)).join("");
    }

    $("watchlist-rows").innerHTML =
      html || '<tr><td colspan="5" class="muted" style="padding:14px">Nothing here.</td></tr>';

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
    const previous = state.statuses.get(id) || "unwatched";
    const next = checkbox.checked ? "watched" : "unwatched";

    checkbox.disabled = true;
    try {
      await apiPut("/api/watch-status/" + id, { status: next });
      state.statuses.set(id, next);
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

  // Per-type groups (same shape as chronological mode), each sorted by
  // release_date, in fixed MCU_TYPE_ORDER — with Other Universes as its own
  // group pinned last, since there is no type field on other_universes rows
  // to split it into Film/TV Series/etc.
  function releaseModeGroups(includeOther) {
    const mcuItems = state.items.filter(isPastOrPresent);
    const otherItems = state.otherItems.filter(isPastOrPresent);

    const groups = mcuTypeGroups(mcuItems).map((g) => ({
      label: g.type,
      entries: sortByReleaseDate(g.items).map((item) => ({ item, source: "mcu" })),
    }));

    if (includeOther && otherItems.length) {
      groups.push({
        label: "Other Universes",
        entries: sortByReleaseDate(otherItems).map((item) => ({ item, source: "other" })),
      });
    }

    return groups;
  }

  function pickerGroupHtml(label, entries) {
    if (!entries.length) return "";
    const rows = entries
      .map(({ item, source }) => {
        const key = wlKey(source, item.id);
        const checked = state.pickerChecked.has(key) ? " checked" : "";
        const runtime = item.runtime_min === null || item.runtime_min === undefined ? "—" : formatRuntime(item.runtime_min);
        const secondary = source === "mcu" ? displayDate(item.release_date) : item.setting || "—";
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

  function renderPicker() {
    const mode = $("watchlist-sort").value;
    const includeOther = $("watchlist-include-other").checked;

    let html = "";
    if (mode === "release") {
      for (const group of releaseModeGroups(includeOther)) {
        html += pickerGroupHtml(group.label, group.entries);
      }
    } else {
      const mcuItems = state.items.filter(isPastOrPresent);
      for (const group of mcuTypeGroups(mcuItems)) {
        const entries = sortByChronoOrder(group.items).map((item) => ({ item, source: "mcu" }));
        html += pickerGroupHtml(group.type, entries);
      }
      if (includeOther) {
        const others = state.otherItems.slice().sort((a, b) => (a.title < b.title ? -1 : 1));
        html += pickerGroupHtml(
          "Other Universes",
          others.map((item) => ({ item, source: "other" }))
        );
      }
    }
    $("watchlist-picker").innerHTML = html;

    for (const header of $("watchlist-picker").querySelectorAll(".picker-group-header")) {
      header.addEventListener("click", onPickerGroupToggle);
    }
    for (const cb of $("watchlist-picker").querySelectorAll('input[type="checkbox"]')) {
      cb.addEventListener("change", onPickerCheckboxChange);
    }
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
  }

  function applyQuickSelect(kind) {
    const includeOther = $("watchlist-include-other").checked;
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
    } else if (kind === "consolidated") {
      // For now this is identical to "all" minus Other Universes — franchise
      // grouping (collapsing sequels/series into one consolidated entry) is
      // planned for a future session.
      for (const item of state.items) next.add(wlKey("mcu", item.id));
    }

    state.pickerChecked = next;
    renderPicker();
  }

  function openWatchlistModal() {
    state.pickerChecked = new Set(state.watchlist.map((e) => wlKey(e.source, e.item_id)));
    $("watchlist-modal-status").textContent = "";
    $("watchlist-sort").value = "release";
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
        if (entry.source === "mcu") {
          await apiPut("/api/watch-status/" + entry.item_id, { status: "unwatched" });
          state.statuses.set(entry.item_id, "unwatched");
        }
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
      const [items, watch, settings, otherUniverses, watchlist] = await Promise.all([
        apiGet("/api/items"),
        apiGet("/api/watch-status"),
        apiGet("/api/settings"),
        apiGet("/api/other-universes"),
        apiGet("/api/watchlist"),
      ]);

      state.items = items.data.items;
      state.otherItems = (otherUniverses.data && otherUniverses.data.other_universes) || [];
      state.settings = settings.data ? settings.data.settings : {};
      state.watchlist = (watchlist.data && watchlist.data.watchlist) || [];
      for (const row of (watch.data && watch.data.watch_status) || []) {
        state.statuses.set(row.item_id, row.status);
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
      $("watchlist-sort").addEventListener("change", renderPicker);
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
