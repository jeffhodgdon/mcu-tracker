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
      <table class="watchlist-table">
        <thead>
          <tr>
            <th style="width:44%;text-align:center">Title</th>
            <th class="opt" style="text-align:center">Type</th>
            <th class="opt" style="text-align:center">Date</th>
            <th class="num" style="text-align:center">Runtime</th>
            <th style="width:130px;text-align:center">Status</th>
            <th style="width:36px;text-align:center"></th>
          </tr>
          <tr class="watchlist-mobile-head">
            <th colspan="6" style="text-align:center">My Watch List</th>
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
    // Persists the Watched section's expand/collapse state across
    // renderWatchlistTable() re-renders (e.g. after removing an item), so it
    // only resets to collapsed on a fresh page load, not on every rebuild.
    watchedGroupExpanded: false,
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

  // Today's date as "YYYY-MM-DD" in the given IANA timezone — mirrors
  // consolidate.js's todayInZone(), reimplemented here since this file runs
  // in the browser bundle rather than the Worker.
  function todayInZone(tz) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  // Whole calendar days from today in the user's timezone to an ISO date;
  // negative once past, null for partial placeholders. Used instead of
  // format.js's daysUntil(), whose UTC "today" rolled the countdown over at
  // 8pm Eastern rather than at the user's own midnight. Both dates are pinned
  // to UTC midnight before subtracting, so this is a pure calendar-day
  // difference with no DST hour to round away.
  function daysFromToday(isoDate) {
    if (!isRealDate(isoDate)) return null;
    const today = todayInZone(window.userTimezone || "America/New_York");
    return Math.round(
      (Date.parse(isoDate + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86400000
    );
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

  // Stats cover the whole watch list, MCU and Other Universes alike —
  // other_universes rows carry their own runtime_min just like items does,
  // so there's nothing source-specific stopping either total from including
  // them.
  // For a TV item whose episodes have been expanded at least once (and are
  // therefore sitting in EPISODE_CACHE), individually-checked episodes should
  // shrink the item's contribution to the remaining-time stat rather than
  // waiting for the whole season to flip to "watched". Items never expanded
  // have no cache entry, so they fall back to counting their full runtime.
  //
  // Returns null when there's no episode data to work from (falls back to
  // season-level logic), or { all, remainingMinutes } once at least one
  // episode has been checked off. Looked up by source as well as id —
  // cachedEpisodes() returns null for anything but "mcu", so an Other
  // Universes entry sharing an MCU season's numeric id never picks up that
  // season's episodes.
  function episodeProgress(source, itemId) {
    const cached = cachedEpisodes(source, itemId);
    if (!cached || !cached.episodes.length) return null;

    let watchedCount = 0;
    let remainingMinutes = 0;
    for (const ep of cached.episodes) {
      if (cached.statuses.get(ep.id) === "watched") {
        watchedCount++;
      } else if (typeof ep.runtime_min === "number") {
        remainingMinutes += ep.runtime_min;
      }
    }
    if (watchedCount === 0) return null;

    return {
      all: watchedCount === cached.episodes.length,
      remainingMinutes,
    };
  }

  function computeTotals() {
    let watched = 0;
    let remainingMinutes = 0;
    let unknownRuntime = 0;
    let total = 0;

    for (const entry of state.watchlist) {
      const item = findItem(entry.source, entry.item_id);
      if (!item) continue;

      total++;
      const status = state.statuses.get(wlKey(entry.source, entry.item_id)) || "unwatched";
      const progress = episodeProgress(entry.source, entry.item_id);

      // Every episode checked counts the item as watched for the stat card
      // even if the season-level status control hasn't itself been flipped.
      if (status === "watched" || (progress && progress.all)) {
        watched++;
        continue;
      }

      if (!countsAsRemaining(status)) continue;

      if (progress) {
        remainingMinutes += progress.remainingMinutes;
      } else if (typeof item.runtime_min === "number") {
        remainingMinutes += item.runtime_min;
      } else {
        unknownRuntime++;
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
    const days = target ? daysFromToday(target) : null;

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
      "To finish " + formatRuntime(t.remainingMinutes) + " in " + days + (days === 1 ? " day" : " days");
  }

  function renderCountdown() {
    const s = state.settings || {};
    const target = s.countdown_target_date;
    const days = target ? daysFromToday(target) : null;

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
      $("countdown-headline").textContent = Math.abs(days) + (days === -1 ? " day ago" : " days ago");
      $("countdown-note").textContent = label + " · " + displayDate(target);
    }
  }

  function renderUpcoming() {
    // Only fully-specified future dates: partial placeholders like 2027-07-00
    // are not confirmed releases and cannot anchor a countdown.
    const upcoming = state.items
      .filter((i) => isRealDate(i.release_date) && daysFromToday(i.release_date) > 0)
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
          daysFromToday(i.release_date) +
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

    const isTv = entry.source === "mcu" && TV_TYPES.indexOf(item.type) !== -1;

    const rowAttrs = ' data-key="' + esc(key) + '" data-group="' + (child ? "watched" : "") + '"';

    // Table cells can't reflow across a media query — flexbox does not apply
    // to <tr>/<td> in any browser — so mobile gets its own two-line
    // <div>-based layout rendered as a sibling row instead, with CSS (not JS)
    // choosing which of the two actually shows at a given width. Both rows
    // share the same data-key/data-group/watched classes so every existing
    // querySelectorAll(...) event wiring call (which iterates instead of
    // looking up a single row by key) picks up both automatically.
    const desktopRow =
      "<tr" +
      rowAttrs +
      ' class="' +
      classes.join(" ") +
      '">' +
      '<td class="wl-title wl-desktop-only" style="text-align:left">' +
      (isTv ? episodeToggleHtml(item.id) + " " : "") +
      '<span class="title">' +
      esc(item.title) +
      "</span></td>" +
      '<td class="opt wl-type wl-desktop-only"><span class="badge" data-type="' +
      esc(typeLabel) +
      '">' +
      esc(typeLabel) +
      "</span></td>" +
      '<td class="opt wl-date wl-desktop-only">' +
      esc(dateLabel) +
      "</td>" +
      '<td class="num wl-runtime wl-desktop-only">' +
      runtime +
      "</td>" +
      '<td class="wl-status wl-desktop-only">' +
      statusCell +
      "</td>" +
      '<td class="wl-remove wl-desktop-only"><button type="button" class="watchlist-remove" data-key="' +
      esc(key) +
      '" aria-label="Remove from watch list" title="Remove from watch list" style="background:none;border:none;cursor:pointer;font-size:14px">✕</button></td>' +
      "</tr>";

    const mobileStatusCell =
      '<input type="checkbox" class="watchlist-watched-toggle" data-key="' +
      esc(key) +
      '" data-id="' +
      item.id +
      '" data-source="' +
      esc(entry.source) +
      '"' +
      (status === "watched" ? " checked" : "") +
      ' aria-label="Mark watched">';

    const mobileRow =
      "<tr" +
      rowAttrs +
      ' class="' +
      classes.concat("wl-mobile-only").join(" ") +
      '">' +
      '<td colspan="6">' +
      '<div class="wl-mobile-line1' +
      (isTv ? " wl-mobile-line1-clickable" : "") +
      '"' +
      (isTv ? ' data-episode-toggle-target="' + item.id + '"' : "") +
      ">" +
      (isTv ? episodeToggleHtml(item.id) + " " : "") +
      '<span class="title">' +
      esc(item.title) +
      "</span>" +
      '<span class="wl-mobile-runtime">' +
      runtime +
      "</span>" +
      "</div>" +
      '<div class="wl-mobile-line2">' +
      '<span class="badge" data-type="' +
      esc(typeLabel) +
      '">' +
      esc(typeLabel) +
      "</span>" +
      '<span class="wl-mobile-date">' +
      esc(dateLabel) +
      "</span>" +
      '<span class="wl-mobile-line2-actions">' +
      mobileStatusCell +
      '<button type="button" class="watchlist-remove" data-key="' +
      esc(key) +
      '" aria-label="Remove from watch list" title="Remove from watch list" style="background:none;border:none;cursor:pointer;font-size:14px">✕</button>' +
      "</span>" +
      "</div>" +
      "</td>" +
      "</tr>";

    const row = desktopRow + mobileRow;

    if (!isTv) return row;

    const episodeRow = episodeRowsContainerHtml(item.id, 6).replace(
      'class="episode-rows hide"',
      'class="episode-rows' +
        (child ? " tv-child" : "") +
        ' hide" data-group="' +
        (child ? "watched" : "") +
        '"'
    );
    return row + episodeRow;
  }

  // Same desktop/mobile sibling-<tr> split every other watchlist row uses
  // (see watchlistRowHtml above) — this row previously rendered as a single
  // untargeted <tr> with plain <td>s and no wl-mobile-only/wl-desktop-only
  // split, so it had no mobile-specific layout at all and fell back to the
  // browser's default table-cell flow, stacking the arrow/label/count on
  // mobile instead of the arrow-left/label-centered/count-right line every
  // other row gets from .wl-mobile-line1's grid.
  function watchedGroupParentHtml(count) {
    const desktopRow =
      '<tr class="tv-parent wl-desktop-only" data-group="watched-parent" style="cursor:pointer">' +
      '<td style="text-align:left"><span class="collapse-indicator">▶</span> <span class="title">Watched (' +
      count +
      ")</span></td>" +
      '<td class="opt"></td>' +
      '<td class="opt"></td>' +
      '<td class="num"></td>' +
      "<td></td>" +
      "<td></td>" +
      "</tr>";

    const mobileRow =
      '<tr class="tv-parent wl-mobile-only" data-group="watched-parent" style="cursor:pointer">' +
      '<td colspan="6">' +
      '<div class="wl-mobile-line1">' +
      '<span class="collapse-indicator">▶</span>' +
      '<span class="title">Watched (' +
      count +
      ")</span>" +
      '<span class="wl-mobile-runtime"></span>' +
      "</div>" +
      "</td>" +
      "</tr>";

    return desktopRow + mobileRow;
  }

  function watchlistSortMode() {
    return state.settings && state.settings.watchlist_sort === "chronological"
      ? "chronological"
      : "release";
  }

  // First year found in a "setting"/"chrono_setting" string, e.g.
  // "1943 / 1993" -> 1943, "1845 - 1979" -> 1845. Settings with no year
  // ("contemporary") have no comparable position.
  function firstSettingYear(setting) {
    const m = /\d{4}/.exec(setting || "");
    return m ? Number(m[0]) : null;
  }

  // Other Universes items have no chrono_order (that field is specifically
  // "position in chronological-order.csv", an MCU-only curated ranking — see
  // migrations/0003_chrono_and_other_universes.sql) — only a free-text
  // "setting" string, so they can't be compared against items.chrono_order
  // directly on the same numeric scale (an MCU chrono_order like 7 is not
  // remotely the same kind of number as a calendar year like 2010, so
  // sorting the two together on that axis just pushes every Other Universe
  // item to one end instead of truly interleaving them).
  //
  // Fixed by building a year -> chrono_order lookup from every MCU item that
  // has both fields (chrono_order tracks chrono_setting's year closely, as
  // it's the same underlying timeline), then mapping an Other Universe item's
  // extracted year onto that same chrono_order scale via linear
  // interpolation between the nearest known MCU years. That gives both sides
  // a genuinely comparable sort key instead of concatenating one after the
  // other.
  function buildYearToChronoOrderScale() {
    const points = [];
    for (const item of state.items) {
      if (item.chrono_order == null) continue;
      const year = firstSettingYear(item.chrono_setting);
      if (year === null) continue;
      points.push({ year, order: item.chrono_order });
    }
    points.sort((a, b) => a.year - b.year);
    return points;
  }

  function chronoOrderForYear(scale, year) {
    if (!scale.length) return null;
    if (year <= scale[0].year) return scale[0].order;
    if (year >= scale[scale.length - 1].year) return scale[scale.length - 1].order;

    for (let i = 0; i < scale.length - 1; i++) {
      const lo = scale[i];
      const hi = scale[i + 1];
      if (year >= lo.year && year <= hi.year) {
        if (hi.year === lo.year) return lo.order;
        const t = (year - lo.year) / (hi.year - lo.year);
        return lo.order + t * (hi.order - lo.order);
      }
    }
    return null;
  }

  function sortWatchlistEntries(entries, mode) {
    const chronoScale = mode === "chronological" ? buildYearToChronoOrderScale() : null;

    return entries.slice().sort((a, b) => {
      const itemA = findItem(a.source, a.item_id);
      const itemB = findItem(b.source, b.item_id);

      if (mode === "chronological") {
        const ka = chronoSortKey(a, itemA, chronoScale);
        const kb = chronoSortKey(b, itemB, chronoScale);
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

  // A single comparable position on the chrono_order scale for either an MCU
  // entry (chrono_order itself) or an Other Universe entry (its setting's
  // year, mapped onto that same scale) — unplaced/unmappable entries sort
  // last, per chronoOrderForYear's Infinity fallback below.
  function chronoSortKey(entry, item, chronoScale) {
    if (entry.source === "mcu") {
      return item && item.chrono_order != null ? item.chrono_order : Infinity;
    }
    const year = item && firstSettingYear(item.setting);
    if (year === null || year === undefined) return Infinity;
    const mapped = chronoOrderForYear(chronoScale, year);
    return mapped === null ? Infinity : mapped;
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
    for (const parent of $("watchlist-rows").querySelectorAll('tr.tv-parent[data-group="watched-parent"]')) {
      parent.addEventListener("click", onWatchedGroupToggle);
    }

    wireEpisodeToggles($("watchlist-rows"), onEpisodeProgressChange);

    // Mobile: the whole line-1 div is a tap target for TV rows, mirroring
    // the ▶ arrow's own expand/collapse — clicking the arrow itself already
    // triggers it via wireEpisodeToggles above (and stops propagation there),
    // so this only needs to act when some other part of the line was tapped.
    for (const line of $("watchlist-rows").querySelectorAll(".wl-mobile-line1-clickable")) {
      line.addEventListener("click", onWatchlistLine1Click);
    }

    if (watched.length && state.watchedGroupExpanded) {
      applyWatchedGroupState(true);
    }
  }

  function onEpisodeProgressChange(itemId) {
    renderStats();
    updateSeasonRowRuntime(itemId);
  }

  // Mirrors episodeProgress()'s contribution to computeTotals() onto the
  // season row's own runtime cell (desktop .wl-runtime and mobile
  // .wl-mobile-runtime, both present on the two sibling <tr>s sharing this
  // item's data-key — see watchlistRowHtml above) so it shows unwatched
  // episode time rather than staying frozen at the full season runtime.
  //
  // Sums straight off the episode checkboxes actually in the DOM right now,
  // rather than episodeProgress()/EPISODE_CACHE's cached statuses map — that
  // cache read null (nothing watched) as "no progress" and left the cell
  // showing whatever it last displayed, so unchecking every episode back to
  // zero never brought the runtime back to the full season total.
  function updateSeasonRowRuntime(itemId) {
    const cached = cachedEpisodes("mcu", itemId);
    if (!cached || !cached.episodes.length) return;

    const cell = $("watchlist-rows").querySelector(
      'tr[data-episode-rows="' + itemId + '"] td'
    );
    if (!cell) return;

    const checkedIds = new Set();
    for (const cb of cell.querySelectorAll(".episode-watch-cb")) {
      if (cb.checked) checkedIds.add(Number(cb.getAttribute("data-episode-id")));
    }

    let remainingMinutes = 0;
    for (const ep of cached.episodes) {
      if (checkedIds.has(ep.id)) continue;
      if (typeof ep.runtime_min === "number") remainingMinutes += ep.runtime_min;
    }

    const text = formatRuntime(remainingMinutes);
    const key = wlKey("mcu", Number(itemId));
    for (const row of $("watchlist-rows").querySelectorAll('tr[data-key="' + esc(key) + '"]')) {
      for (const el of row.querySelectorAll(".wl-runtime, .wl-mobile-runtime")) {
        el.textContent = text;
      }
    }
  }

  // Sums remaining runtime straight off EPISODE_CACHE (rather than DOM
  // checkboxes like updateSeasonRowRuntime does) so it can run for a season
  // that has never been expanded — e.g. right after the background prefetch
  // below populates the cache, with no episode rows in the DOM yet.
  function updateSeasonRowRuntimeFromCache(itemId) {
    const cached = cachedEpisodes("mcu", itemId);
    if (!cached || !cached.episodes.length) return;

    let remainingMinutes = 0;
    for (const ep of cached.episodes) {
      if (cached.statuses.get(ep.id) === "watched") continue;
      if (typeof ep.runtime_min === "number") remainingMinutes += ep.runtime_min;
    }

    const text = formatRuntime(remainingMinutes);
    const key = wlKey("mcu", Number(itemId));
    for (const row of $("watchlist-rows").querySelectorAll('tr[data-key="' + esc(key) + '"]')) {
      for (const el of row.querySelectorAll(".wl-runtime, .wl-mobile-runtime")) {
        el.textContent = text;
      }
    }
  }

  // The server's per-request cap on /api/watch/episodes/bulk item_ids.
  const EPISODES_BULK_MAX = 100;

  // Warms EPISODE_CACHE for every TV season on the watch list right after
  // load, then immediately reflects each one's remaining runtime on its
  // season row — without this, a season row shows its full runtime until the
  // user happens to expand it or toggle an episode checkbox.
  //
  // One bulk request for all of them (split only past the server's 100-id
  // cap) rather than loadEpisodeData's two requests per season. Expanding a
  // row still goes through loadEpisodeData, which finds these entries cached.
  async function prefetchWatchlistEpisodeRuntimes() {
    const ids = state.watchlist
      .filter((entry) => {
        if (entry.source !== "mcu") return false;
        const item = findItem(entry.source, entry.item_id);
        return item && TV_TYPES.indexOf(item.type) !== -1;
      })
      .map((entry) => entry.item_id)
      .filter((id) => !cachedEpisodes("mcu", id));

    const chunks = [];
    for (let i = 0; i < ids.length; i += EPISODES_BULK_MAX) {
      chunks.push(ids.slice(i, i + EPISODES_BULK_MAX));
    }

    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const res = await apiGet("/api/watch/episodes/bulk?item_ids=" + chunk.join(","));
          const byItem = (res.data && res.data.items) || {};
          for (const id of chunk) {
            // A row expanded (and maybe toggled) while this was in flight has
            // newer data in the cache than this response; keep that.
            if (cachedEpisodes("mcu", id) || !byItem[id]) continue;
            cacheEpisodeData(id, byItem[id].episodes, byItem[id].watch_status);
            updateSeasonRowRuntimeFromCache(id);
          }
        } catch (e) {
          // Best-effort — leave these rows showing the season's full runtime.
        }
      })
    );
  }

  function onWatchlistLine1Click(ev) {
    if (ev.target.closest(".episode-toggle")) return;
    const line = ev.currentTarget;
    const toggle = line.querySelector(".episode-toggle");
    if (toggle) toggle.click();
  }

  function onWatchedGroupToggle(ev) {
    if (ev.target.closest("select") || ev.target.closest("button")) return;
    const tr = ev.currentTarget;
    const expanded = !tr.classList.contains("expanded");
    state.watchedGroupExpanded = expanded;
    applyWatchedGroupState(expanded);
  }

  // Shared by onWatchedGroupToggle (a user click) and renderWatchlistTable
  // (reapplying state.watchedGroupExpanded after a re-render, e.g. removing
  // an item) so the Watched section's open/closed state survives rebuilds
  // instead of always resetting to collapsed.
  function applyWatchedGroupState(expanded) {
    // Desktop and mobile each render their own copy of this row (see
    // watchedGroupParentHtml above) sharing data-group="watched-parent" —
    // apply the new state to both so they stay in sync regardless of which
    // one was actually clicked, same pattern release.js/chronological.js use
    // for their tv-parent rows.
    for (const parent of $("watchlist-rows").querySelectorAll(
      'tr.tv-parent[data-group="watched-parent"]'
    )) {
      parent.classList.toggle("expanded", expanded);
      const indicator = parent.querySelector(".collapse-indicator");
      if (indicator) indicator.textContent = expanded ? "▼" : "▶";
    }
    for (const child of $("watchlist-rows").querySelectorAll('tr.tv-child[data-group="watched"]')) {
      if (child.classList.contains("episode-rows")) {
        // Its own episode-toggle button controls reveal; collapsing the
        // Watched group should only ever re-hide it, not show it unasked.
        if (!expanded) {
          child.classList.add("hide");
          const itemId = child.getAttribute("data-episode-rows");
          const toggleBtn = $("watchlist-rows").querySelector('[data-episode-toggle="' + itemId + '"]');
          if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", "false");
            toggleBtn.textContent = "▶";
          }
        }
        continue;
      }
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
    return isRealDate(value) && daysFromToday(value) <= 0;
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
      // state.otherItems also carries crossover MCU items (source: "mcu",
      // from /api/other-universes) — these are meant to appear in BOTH this
      // group and their MCU franchise group, with a single shared checkbox
      // state. Keying their entry here with the item's own source ("mcu",
      // not a fabricated "other") makes pickerGroupHtml render the checkbox
      // with data-key=wlKey("mcu", id) — the exact same key the MCU-side
      // checkbox for that item uses — so syncCheckedStateToDom's
      // [data-key="..."] sweep (already run on every change) keeps both
      // checkboxes in sync automatically, and submitWatchlist's single
      // pickerChecked entry per key naturally produces just one watchlist
      // row regardless of which checkbox was used.
      const others = state.otherItems.filter(isPastOrPresent);
      // Crossover rows (source: "mcu") carry only the trimmed shape
      // /api/other-universes returns (title/release_date/runtime_min, no
      // type/chrono_setting) — swap in the real catalogue item so the type
      // badge and date/chrono column match what the MCU-side checkbox shows
      // for the same item, rather than rendering blank/undefined fields.
      // The source tag is tracked separately (not read off the resolved
      // item, which has none) so a crossover item still keys/labels as mcu.
      const resolved = others.map((raw) => ({
        item: raw.source === "mcu" ? findItem("mcu", raw.id) || raw : raw,
        source: raw.source === "mcu" ? "mcu" : "other",
      }));
      const entries =
        mode === "release"
          ? resolved.slice().sort((a, b) => {
              const da = a.item.release_date || "";
              const db = b.item.release_date || "";
              if (!da && !db) return a.item.id - b.item.id;
              if (!da) return 1;
              if (!db) return -1;
              if (da === db) return a.item.id - b.item.id;
              return da < db ? -1 : 1;
            })
          : resolved.slice().sort((a, b) => (a.item.title < b.item.title ? -1 : 1));
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

  // Every key the picker currently renders a checkbox for, across all groups
  // (media types, Consolidated, and Other Universes when it is included) —
  // the picker's own filters (released-only, the Other Universes toggle)
  // decide this, so quick-select can never tick something you can't see.
  function shownPickerKeys() {
    const keys = new Set();
    for (const cb of $("watchlist-picker").querySelectorAll("input[data-key]")) {
      keys.add(cb.getAttribute("data-key"));
    }
    return keys;
  }

  // Each button replaces the selection with released items the picker
  // shows. Released matters on its own: the media-type and Other Universes
  // groups only list released titles, but the Consolidated section lists
  // every franchise member, so "shown" alone would still tick unreleased
  // ones from there.
  //   All             = every shown, released item
  //   Sacred Timeline = the same, MCU only (source "mcu", so crossover
  //                     titles count; no Other Universes rows)
  //   Films / Shows   = shown, released MCU items of those types
  function applyQuickSelect(kind) {
    markActiveQuickSelect(kind);

    const next = new Set();
    for (const key of shownPickerKeys()) {
      const idx = key.indexOf(":");
      const source = key.slice(0, idx);
      const item = findItem(source, Number(key.slice(idx + 1)));
      if (!item || !isPastOrPresent(item)) continue;

      if (kind === "all") next.add(key);
      else if (kind === "sacred" && source === "mcu") next.add(key);
      else if (kind === "films" && item && item.type === "Film") next.add(key);
      else if (kind === "shows" && item && TV_TYPES.indexOf(item.type) !== -1) next.add(key);
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
    if (!confirm("Remove all items from your watch list? Your watch progress is kept.")) return;

    statusBox.textContent = "Clearing…";
    $("watchlist-clear-btn").disabled = true;
    try {
      // One request, all-or-nothing. Watch status is left untouched, so
      // state.statuses (and EPISODE_CACHE) stay valid for items added back.
      await apiDelete("/api/watchlist");
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

  // Sends the complete intended watch list — every key in pickerChecked, not
  // just what changed — and the server removes anything not in it. That is
  // also why unticking "Include Other Universes" drops source "other" rows
  // here: with it off they are not part of the intended list. Crossover items
  // are keyed source "mcu" and so are unaffected by the toggle.
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
        // initSignedInLabel already fetched these; only refetch if that failed.
        me.settings ? { data: { settings: me.settings } } : apiGet("/api/settings"),
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
      prefetchWatchlistEpisodeRuntimes().then(renderStats);

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
