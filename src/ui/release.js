/**
 * Release Date Order: the full catalogue, sorted by release date, with a
 * per-item status control bound to /api/watch-status.
 *
 * Signed out the table still renders — /api/items is public — with the status
 * controls disabled rather than the page being blocked.
 *
 * Only already-released items (on or before today, Eastern time) get the
 * TV-season grouping and appear in the main list. Everything not yet
 * released — future-dated items and anything with no/partial release date —
 * is combined into a trailing flat "Upcoming Releases" section, sorted by
 * release date, so the catalogue always accounts for every item.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Release Date Order</h1>
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
  </div>
  <div class="filter-bar-actions">
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
  <table class="cat-table">
    <thead>
      <tr>
        <th style="width:44%;text-align:center">Title</th>
        <th class="opt" style="text-align:center">Type</th>
        <th class="opt" style="text-align:center">Phase</th>
        <th style="text-align:center">Released</th>
        <th class="num" style="text-align:center">Runtime</th>
        <th style="width:130px;text-align:center">Status</th>
      </tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="6" class="muted" style="padding:18px">Loading…</td></tr>
    </tbody>
  </table>
</div>
`;

function releaseMain() {
  const state = { items: [], statuses: new Map(), signedIn: false, activeTypes: new Set() };

  function $(id) {
    return document.getElementById(id);
  }

  const TV_TYPES = ["TV Series", "Marvel Television", "Animated Series"];

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
    return '<tr class="section"><td colspan="6">' + esc(label) + "</td></tr>";
  }

  function rowHtml(item) {
    const status = state.statuses.get(item.id) || "unwatched";
    const estimate = item.is_estimate
      ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
      : "";
    const runtime =
      (item.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(item.runtime_min)) +
      estimate;

    const statusCell =
      '<select data-id="' +
      item.id +
      '"' +
      (state.signedIn ? "" : " disabled title=\"Sign in to track\"") +
      ">" +
      statusOptions(status) +
      "</select>";

    const rowAttrs = ' data-id="' + item.id + '" data-type="' + esc(item.type) + '"';
    const watchedCls = status === "watched" ? " watched" : "";

    const desktopRow =
      "<tr" +
      rowAttrs +
      ' class="wl-desktop-only' +
      watchedCls +
      '">' +
      '<td><span class="title">' +
      esc(item.title) +
      "</span></td>" +
      '<td class="opt"><span class="badge" data-type="' +
      esc(item.type) +
      '">' +
      esc(item.type) +
      "</span></td>" +
      '<td class="opt muted">' +
      esc(item.phase || "—") +
      "</td>" +
      "<td>" +
      esc(displayDate(item.release_date)) +
      "</td>" +
      '<td class="num">' +
      runtime +
      "</td>" +
      "<td>" +
      statusCell +
      "</td>" +
      "</tr>";

    const mobileRow =
      "<tr" +
      rowAttrs +
      ' class="wl-mobile-only' +
      watchedCls +
      '">' +
      '<td colspan="6">' +
      '<div class="wl-mobile-line1">' +
      '<span class="title">' +
      esc(item.title) +
      "</span>" +
      '<span class="wl-mobile-runtime">' +
      runtime +
      "</span>" +
      "</div>" +
      '<div class="wl-mobile-line2">' +
      '<span class="wl-mobile-line2-left">' +
      '<span class="badge" data-type="' +
      esc(item.type) +
      '">' +
      esc(item.type) +
      "</span>" +
      '<span class="rt-mobile-phase">' +
      esc(item.phase || "—") +
      "</span>" +
      "</span>" +
      '<span class="wl-mobile-date"><span class="rt-mobile-label">RD</span>' +
      esc(displayDate(item.release_date)) +
      "</span>" +
      '<span class="wl-mobile-line2-actions">' +
      statusCell +
      "</span>" +
      "</div>" +
      "</td>" +
      "</tr>";

    return desktopRow + mobileRow;
  }

  function seasonSelectHtml(itemId, status) {
    return (
      '<select data-id="' +
      itemId +
      '" class="season-mark-all"' +
      (state.signedIn ? "" : " disabled title=\"Sign in to track\"") +
      ">" +
      statusOptions(status) +
      "</select>"
    );
  }

  // Strips season-style suffixes ("Title (Season 2)", "Title Season 2",
  // "Title S2") so seasons of the same show share one group key. Films and
  // one-shots never match, so they are unaffected.
  function tvBaseTitle(title) {
    return title
      .replace(/\s*\(Season\s+\d+\)\s*$/i, "")
      .replace(/\s+Season\s+\d+$/i, "")
      .replace(/\s+S\d+$/i, "")
      .trim();
  }

  // The season number a title carries, or null if it names no season at all
  // (a one-off special under a TV type, say) — used only for the child row's
  // "Season N" label, never for grouping (tvBaseTitle handles that).
  function seasonNumberOf(title) {
    const m =
      /\(Season\s+(\d+)\)\s*$/i.exec(title) ||
      /\bSeason\s+(\d+)$/i.exec(title) ||
      /\bS(\d+)$/i.exec(title);
    return m ? Number(m[1]) : null;
  }

  // Preserves overall release-date order: a show group is placed where its
  // first (earliest) season appears. Every TV item becomes a show group, even
  // when it is the only season — the three-level Show -> Season -> Episodes
  // hierarchy always applies to TV, never a flat row.
  function buildGroups(sorted) {
    const order = [];
    const byBase = new Map();

    for (const item of sorted) {
      const isTv = TV_TYPES.indexOf(item.type) !== -1;
      if (!isTv) {
        order.push({ key: "single-" + item.id, isTv: false, items: [item] });
        continue;
      }

      const base = tvBaseTitle(item.title);
      let group = byBase.get(base);
      if (!group) {
        group = { key: "tv-" + base, isTv: true, base: base, items: [] };
        byBase.set(base, group);
        order.push(group);
      }
      group.items.push(item);
    }

    return order;
  }

  function parentRowHtml(group) {
    const allWatched = group.items.every(function (it) {
      return (state.statuses.get(it.id) || "unwatched") === "watched";
    });
    const hasRuntime = group.items.some(function (it) {
      return it.runtime_min !== null;
    });
    const totalRuntime = group.items.reduce(function (sum, it) {
      return sum + (it.runtime_min || 0);
    }, 0);
    const hasEstimate = group.items.some(function (it) {
      return it.is_estimate;
    });
    const seasonCount = group.items.length;
    const runtime =
      (hasRuntime ? formatRuntime(totalRuntime) : '<span class="muted">—</span>') +
      (hasEstimate ? ' <span class="badge est" title="Runtime is an estimate">est</span>' : "");
    const watchedCls = allWatched ? " watched" : "";
    const groupAttrs = ' data-group="' + esc(group.key) + '"';

    const desktopRow =
      '<tr class="tv-parent wl-desktop-only' +
      watchedCls +
      '"' +
      groupAttrs +
      ' style="cursor:pointer">' +
      '<td><span class="collapse-indicator">▶</span> <span class="title">' +
      esc(group.base) +
      "</span></td>" +
      '<td class="opt"><span class="badge" data-type="TV Series">TV Series</span></td>' +
      '<td class="opt muted">' +
      seasonCount +
      " season" +
      (seasonCount === 1 ? "" : "s") +
      "</td>" +
      "<td>—</td>" +
      '<td class="num">' +
      runtime +
      "</td>" +
      "<td></td>" +
      "</tr>";

    return desktopRow;
  }

  // Mobile-only render of a whole show block: the show bubble, nested season
  // bubbles, and (once expanded) nested episode bubbles — all inside ONE <tr>
  // so the bubbles can genuinely nest via real DOM containment. Desktop stays
  // on the original per-row <tr> layout (parentRowHtml/seasonRowHtml above);
  // sibling <tr>s can only fake adjacency with matched top/bottom borders,
  // which can't produce the show > season > episodes nesting this needs. See
  // onParentToggle/onMobileSeasonToggle for how expand state is driven here
  // instead of the hide/expanded-group classes the desktop rows use.
  function mobileGroupHtml(group) {
    const allWatched = group.items.every(function (it) {
      return (state.statuses.get(it.id) || "unwatched") === "watched";
    });
    const hasRuntime = group.items.some(function (it) {
      return it.runtime_min !== null;
    });
    const totalRuntime = group.items.reduce(function (sum, it) {
      return sum + (it.runtime_min || 0);
    }, 0);
    const hasEstimate = group.items.some(function (it) {
      return it.is_estimate;
    });
    const seasonCount = group.items.length;
    const runtime =
      (hasRuntime ? formatRuntime(totalRuntime) : '<span class="muted">—</span>') +
      (hasEstimate ? ' <span class="badge est" title="Runtime is an estimate">est</span>' : "");
    const watchedCls = allWatched ? " watched" : "";
    const groupAttrs = ' data-group="' + esc(group.key) + '"';

    const seasons = group.items.map((item) => mobileSeasonBubbleHtml(item, group.key)).join("");
    // Master status: reflects "watched" only when every season already is,
    // same all-or-nothing rule the show bubble's own watchedCls above uses;
    // any other mix (including some seasons watched) reads as "unwatched" —
    // there's no meaningful single "current status" across mismatched
    // seasons, so this only ever shows a real value once the group is fully
    // watched, and otherwise defaults to the unset state.
    const masterStatus = allWatched ? "watched" : "unwatched";
    const masterSelect = groupMasterSelectHtml(group.key, masterStatus);

    return (
      '<tr class="tv-parent wl-mobile-only' +
      watchedCls +
      '"' +
      groupAttrs +
      ">" +
      '<td colspan="6">' +
      '<div class="mobile-show-bubble">' +
      '<div class="wl-mobile-line1 wl-mobile-line1-clickable mobile-show-toggle"' +
      groupAttrs +
      ">" +
      '<span class="collapse-indicator">▶</span>' +
      '<span class="title">' +
      esc(group.base) +
      "</span>" +
      '<span class="wl-mobile-runtime">' +
      runtime +
      "</span>" +
      "</div>" +
      '<div class="wl-mobile-line2">' +
      '<span class="badge" data-type="TV Series">TV Series</span>' +
      '<span class="wl-mobile-date">' +
      seasonCount +
      " season" +
      (seasonCount === 1 ? "" : "s") +
      "</span>" +
      '<span class="wl-mobile-line2-actions">' +
      masterSelect +
      "</span>" +
      "</div>" +
      '<div class="mobile-season-list hide">' +
      seasons +
      "</div>" +
      "</div>" +
      "</td>" +
      "</tr>"
    );
  }

  // Master status control on a show bubble's line 2 (mobile only) — acts as
  // a bulk "mark all seasons" switch, same semantics as each season's own
  // season-mark-all select (seasonSelectHtml) but scoped to every season in
  // the group instead of one item's episodes. See onGroupMarkAllChange.
  function groupMasterSelectHtml(groupKey, status) {
    return (
      '<select data-group-mark-all="' +
      esc(groupKey) +
      '"' +
      (state.signedIn ? "" : " disabled title=\"Sign in to track\"") +
      ">" +
      statusOptions(status) +
      "</select>"
    );
  }

  function mobileSeasonBubbleHtml(item, groupKey) {
    const status = state.statuses.get(item.id) || "unwatched";
    const estimate = item.is_estimate
      ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
      : "";
    const seasonNum = seasonNumberOf(item.title);
    const seasonLabel = seasonNum !== null ? "Season " + seasonNum : item.title;
    const runtime =
      (item.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(item.runtime_min)) +
      estimate;
    const watchedCls = status === "watched" ? " watched" : "";
    const progressSpan = '<span class="season-progress" data-season-progress="' + item.id + '"></span>';
    const statusCell = seasonSelectHtml(item.id, status);
    const itemAttrs =
      ' data-id="' + item.id + '" data-group="' + esc(groupKey) + '" data-type="' + esc(item.type) + '"';

    return (
      '<div class="mobile-season-bubble' +
      watchedCls +
      '"' +
      itemAttrs +
      ">" +
      '<div class="wl-mobile-line1 wl-mobile-line1-clickable mobile-season-toggle" data-mobile-season-toggle="' +
      item.id +
      '">' +
      '<span class="collapse-indicator">▶</span>' +
      '<span class="title">' +
      esc(seasonLabel) +
      "</span>" +
      '<span class="wl-mobile-runtime">' +
      runtime +
      "</span>" +
      "</div>" +
      '<div class="wl-mobile-line2">' +
      '<span class="wl-mobile-line2-left">' +
      '<span class="badge" data-type="' +
      esc(item.type) +
      '">' +
      esc(item.type) +
      "</span>" +
      "</span>" +
      '<span class="wl-mobile-date"><span class="rt-mobile-label">RD</span>' +
      esc(displayDate(item.release_date)) +
      " " +
      progressSpan +
      "</span>" +
      '<span class="wl-mobile-line2-actions">' +
      statusCell +
      "</span>" +
      "</div>" +
      '<div class="mobile-episode-bubble hide" data-mobile-episode-rows="' +
      item.id +
      '"></div>' +
      "</div>"
    );
  }

  function seasonRowHtml(item, groupKey) {
    const status = state.statuses.get(item.id) || "unwatched";
    const estimate = item.is_estimate
      ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
      : "";
    const seasonNum = seasonNumberOf(item.title);
    const seasonLabel = seasonNum !== null ? "Season " + seasonNum : item.title;
    const runtime =
      (item.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(item.runtime_min)) +
      estimate;

    const rowAttrs =
      ' data-id="' +
      item.id +
      '" data-group="' +
      esc(groupKey) +
      '" data-type="' +
      esc(item.type) +
      '"';
    const watchedCls = status === "watched" ? " watched" : "";
    const progressSpan = '<span class="season-progress" data-season-progress="' + item.id + '"></span>';
    const statusCell = seasonSelectHtml(item.id, status);

    const desktopRow =
      "<tr" +
      rowAttrs +
      ' class="tv-child hide wl-desktop-only' +
      watchedCls +
      '">' +
      '<td style="padding-left:32px">' +
      episodeToggleHtml(item.id) +
      ' <span class="title">' +
      esc(seasonLabel) +
      "</span></td>" +
      '<td class="opt"><span class="badge" data-type="' +
      esc(item.type) +
      '">' +
      esc(item.type) +
      "</span></td>" +
      '<td class="opt muted">' +
      esc(item.phase || "—") +
      "</td>" +
      "<td>" +
      esc(displayDate(item.release_date)) +
      "</td>" +
      '<td class="num">' +
      runtime +
      "</td>" +
      "<td>" +
      progressSpan +
      " " +
      statusCell +
      "</td>" +
      "</tr>";

    // episodeRowsContainerHtml's <tr> has no wl-desktop-only/wl-mobile-only
    // class of its own (dashboard.js/consolidated.js show it unconditionally
    // since they don't split episode rows per breakpoint) — release.js does,
    // via its own mobile-episode-bubble div in mobileSeasonBubbleHtml, so
    // this desktop-table copy needs the class added to stay hidden on mobile
    // instead of showing twice.
    return desktopRow + episodeRowsContainerHtml(item.id, 6).replace(
      'class="episode-rows hide"',
      'class="episode-rows hide wl-desktop-only"'
    );
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

  function isReleased(item, today) {
    return isRealDate(item.release_date) && item.release_date <= today;
  }

  function render() {
    const today = todayInZone(window.userTimezone || "America/New_York");

    // Sorted on the raw string: catalogue dates are ISO-shaped, and partial
    // placeholders like 2027-07-00 land in the right slot this way. Undated
    // entries sort last rather than at the epoch.
    const byReleaseDate = function (a, b) {
      if (!a.release_date && !b.release_date) return a.id - b.id;
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      if (a.release_date === b.release_date) return a.id - b.id;
      return a.release_date < b.release_date ? -1 : 1;
    };

    const released = state.items.filter((i) => isReleased(i, today)).sort(byReleaseDate);
    const upcoming = state.items.filter((i) => !isReleased(i, today)).sort(byReleaseDate);
    state.released = released;
    state.upcoming = upcoming;

    const groups = buildGroups(released);
    const html = [];
    state.groups = new Map();

    for (const group of groups) {
      if (group.isTv) {
        state.groups.set(group.key, group);
        html.push(parentRowHtml(group));
        for (const item of group.items) html.push(seasonRowHtml(item, group.key));
        html.push(mobileGroupHtml(group));
      } else {
        html.push(rowHtml(group.items[0]));
      }
    }

    if (upcoming.length) {
      html.push(sectionRow("Upcoming Releases (" + upcoming.length + ")"));
      for (const item of upcoming) html.push(rowHtml(item));
    }

    $("rows").innerHTML = html.join("");

    for (const sel of $("rows").querySelectorAll("select[data-id]:not(.season-mark-all)")) {
      sel.addEventListener("change", onStatusChange);
    }
    for (const sel of $("rows").querySelectorAll("select.season-mark-all")) {
      sel.addEventListener("change", onSeasonMarkAllChange);
    }
    for (const sel of $("rows").querySelectorAll("select[data-group-mark-all]")) {
      sel.addEventListener("change", onGroupMarkAllChange);
    }
    for (const tr of $("rows").querySelectorAll("tr.tv-parent.wl-desktop-only")) {
      tr.addEventListener("click", onParentToggle);
    }
    for (const toggle of $("rows").querySelectorAll(".mobile-show-toggle")) {
      toggle.addEventListener("click", onParentToggle);
    }
    for (const toggle of $("rows").querySelectorAll(".mobile-season-toggle")) {
      toggle.addEventListener("click", onMobileSeasonToggle);
    }
    wireEpisodeToggles($("rows"), refreshSeasonProgress);

    applyTypeFilter();
  }

  function refreshSeasonProgress(itemId) {
    const label = episodeProgressLabel(itemId);
    for (const el of $("rows").querySelectorAll('[data-season-progress="' + itemId + '"]')) {
      el.textContent = label || "";
    }
  }

  async function onSeasonMarkAllChange(ev) {
    const select = ev.target;
    const itemId = Number(select.getAttribute("data-id"));
    const next = select.value;
    const previous = state.statuses.get(itemId) || "unwatched";

    select.disabled = true;
    try {
      await apiPut("/api/watch-status/" + itemId, { status: next });
      state.statuses.set(itemId, next);
      syncItemRow(itemId, next);
      if (next === "watched" || next === "unwatched") {
        await episodeMarkAll(itemId, next === "watched");
        refreshSeasonProgress(itemId);
      }
      updateSubtitle();
    } catch (e) {
      select.value = previous;
      showError("Could not save that change: " + e.message);
    } finally {
      select.disabled = !state.signedIn ? true : false;
    }
  }

  // Master status control on a show bubble's line 2 (mobile only, see
  // groupMasterSelectHtml above): applies the chosen status to every season
  // in the group, one at a time, reusing the same per-season season-mark-all
  // select each season already has — each season's own change event fires
  // its normal onSeasonMarkAllChange handling (including its episode
  // mark-all), so this loop only has to drive the select's value and
  // dispatch the event rather than duplicate that logic.
  async function onGroupMarkAllChange(ev) {
    const select = ev.target;
    const key = select.getAttribute("data-group-mark-all");
    const next = select.value;

    select.disabled = true;
    try {
      const seasonSelects = $("rows").querySelectorAll(
        '.mobile-season-bubble[data-group="' + key + '"] select.season-mark-all'
      );
      for (const seasonSelect of seasonSelects) {
        if (seasonSelect.value === next) continue;
        seasonSelect.value = next;
        seasonSelect.dispatchEvent(new Event("change"));
      }
    } finally {
      select.disabled = !state.signedIn ? true : false;
    }
  }

  // The desktop and mobile rows for an item are separate sibling <tr>s (see
  // rowHtml/seasonRowHtml), each with its own status <select> — keeps both in
  // sync with whichever one the user actually changed.
  function syncItemRow(itemId, status) {
    for (const row of $("rows").querySelectorAll(
      'tr[data-id="' + itemId + '"], .mobile-season-bubble[data-id="' + itemId + '"]'
    )) {
      row.classList.toggle("watched", status === "watched");
    }
    for (const sel of $("rows").querySelectorAll(
      'select[data-id="' + itemId + '"]:not(.season-mark-all)'
    )) {
      sel.value = status;
    }
  }

  // A parent group row has no single type of its own (its badge always reads
  // "TV Series" even when its seasons are Animated Series/Marvel Television),
  // so it is filtered by its children instead: hidden only once every season
  // under it is filtered out, matching "hiding TV Series hides the parent
  // group row and all its season children" for groups that are purely one
  // type, while a mixed-type group stays visible as long as any season does.
  function applyTypeFilter() {
    let visible = 0;
    for (const row of $("rows").querySelectorAll("tr[data-type], .mobile-season-bubble[data-type]")) {
      const shown = state.activeTypes.has(row.getAttribute("data-type"));
      row.classList.toggle("filtered-out", !shown);
      // Desktop <tr> and mobile .mobile-season-bubble div both carry
      // data-type for the same item — count only the desktop copy so the
      // "Showing N of M" total isn't doubled.
      if (shown && row.classList.contains("wl-desktop-only")) visible++;

      const itemId = row.getAttribute("data-id");
      const episodeRow = itemId && $("rows").querySelector('tr.episode-rows[data-episode-rows="' + itemId + '"]');
      if (episodeRow) episodeRow.classList.toggle("filtered-out", !shown);
    }
    for (const parent of $("rows").querySelectorAll("tr.tv-parent.wl-desktop-only")) {
      const key = parent.getAttribute("data-group");
      const children = $("rows").querySelectorAll(
        'tr.tv-child[data-group="' + key + '"]'
      );
      const anyVisible = [...children].some((c) => !c.classList.contains("filtered-out"));
      parent.classList.toggle("filtered-out", !anyVisible);
    }
    for (const toggle of $("rows").querySelectorAll(".mobile-show-toggle")) {
      const key = toggle.getAttribute("data-group");
      const seasons = $("rows").querySelectorAll(
        '.mobile-season-bubble[data-group="' + key + '"]'
      );
      const anyVisible = [...seasons].some((s) => !s.classList.contains("filtered-out"));
      const tr = toggle.closest("tr.tv-parent");
      if (tr) tr.classList.toggle("filtered-out", !anyVisible);
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

  // Desktop's tv-parent <tr> and mobile's .mobile-show-toggle div (see
  // parentRowHtml/mobileGroupHtml above) share the same data-group — expand
  // state is computed from whichever was actually clicked, then applied to
  // both copies so they stay in sync regardless of which one is currently
  // visible. The two copies differ in shape below the toggle itself: desktop
  // reveals sibling tv-child <tr>s, mobile reveals its single nested
  // .mobile-season-list div — each side is driven by its own loop instead of
  // one shared selector.
  function onParentToggle(ev) {
    if (ev.target.closest("select")) return;
    const tr = ev.currentTarget;
    const key = tr.getAttribute("data-group");
    const expanded = !tr.classList.contains("expanded");

    for (const parent of $("rows").querySelectorAll('tr.tv-parent.wl-desktop-only[data-group="' + key + '"]')) {
      parent.classList.toggle("expanded", expanded);
      parent.classList.toggle("expanded-group", expanded);
      const indicator = parent.querySelector(".collapse-indicator");
      if (indicator) indicator.textContent = expanded ? "▼" : "▶";
    }

    for (const child of $("rows").querySelectorAll('tr.tv-child[data-group="' + key + '"]')) {
      child.classList.toggle("hide", !expanded);
      child.classList.toggle("expanded-group", expanded);

      const itemId = child.getAttribute("data-id");
      const episodeRow = $("rows").querySelector('tr.episode-rows[data-episode-rows="' + itemId + '"]');
      if (episodeRow) {
        episodeRow.classList.toggle("expanded-group", expanded);
        if (!expanded) {
          episodeRow.classList.add("hide");
          const toggleBtn = child.querySelector("[data-episode-toggle]");
          if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", "false");
            toggleBtn.textContent = "▶";
          }
        }
      }
    }

    for (const toggle of $("rows").querySelectorAll('.mobile-show-toggle[data-group="' + key + '"]')) {
      toggle.classList.toggle("expanded", expanded);
      const indicator = toggle.querySelector(".collapse-indicator");
      if (indicator) indicator.textContent = expanded ? "▼" : "▶";
      const bubble = toggle.closest(".mobile-show-bubble");
      if (bubble) bubble.classList.toggle("expanded", expanded);
      const list = bubble && bubble.querySelector(".mobile-season-list");
      if (list) list.classList.toggle("hide", !expanded);
    }
  }

  // Season-level expand/collapse within a mobile show bubble (see
  // mobileSeasonBubbleHtml above): toggles the nested .mobile-episode-bubble
  // div, lazily loading its episode rows on first expand — mirrors
  // onEpisodeToggleClick in shell.js, but targeting a div container instead
  // of a sibling <tr class="episode-rows">, since this row has no siblings
  // of its own to target (the whole show is one <tr>).
  async function onMobileSeasonToggle(ev) {
    if (ev.target.closest("select")) return;
    const toggle = ev.currentTarget;
    const bubble = toggle.closest(".mobile-season-bubble");
    const itemId = bubble.getAttribute("data-id");
    const episodeBubble = bubble.querySelector(
      '.mobile-episode-bubble[data-mobile-episode-rows="' + itemId + '"]'
    );
    if (!episodeBubble) return;

    const expanded = !bubble.classList.contains("expanded");
    bubble.classList.toggle("expanded", expanded);
    const indicator = toggle.querySelector(".collapse-indicator");
    if (indicator) indicator.textContent = expanded ? "▼" : "▶";
    episodeBubble.classList.toggle("hide", !expanded);

    if (!expanded) return;
    if (episodeBubble.dataset.loaded) return;
    episodeBubble.innerHTML = episodeLoadingHtml();
    try {
      await renderEpisodeRows(Number(itemId), episodeBubble, refreshSeasonProgress);
      episodeBubble.dataset.loaded = "1";
    } catch (e) {
      episodeBubble.innerHTML = '<div class="episode-row muted">Could not load episodes.</div>';
    }
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
      syncItemRow(id, next);
      updateSubtitle();
    } catch (e) {
      // Put the control back where it was so it never shows a state the
      // server did not accept.
      select.value = previous;
      showError("Could not save that change: " + e.message);
    } finally {
      select.disabled = !state.signedIn ? true : false;
    }
  }

  function updateSubtitle() {
    let watched = 0;
    for (const item of state.items) {
      if ((state.statuses.get(item.id) || "unwatched") === "watched") watched++;
    }
    $("subtitle").textContent = state.signedIn
      ? state.released.length + " titles · " + state.upcoming.length + " upcoming · " + watched + " watched"
      : state.items.length + " titles in release order";
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
        // /api/watch-status returns rows for every source (mcu and other),
        // not just this page's — an other_universes item can carry the same
        // numeric id as an MCU item (the two are independent id spaces), so
        // without this filter an "other" row could silently overwrite an
        // "mcu" row's status in this Map, or vice versa, keyed only by that
        // shared bare id. This page only ever shows MCU items, so only mcu
        // rows are relevant here.
        for (const row of (watch.data && watch.data.watch_status) || []) {
          if ((row.source || "mcu") !== "mcu") continue;
          state.statuses.set(row.item_id, row.status);
        }
      }
      render();
      updateSubtitle();
    } catch (e) {
      $("rows").innerHTML =
        '<tr><td colspan="6" class="muted" style="padding:18px">Could not load the catalogue.</td></tr>';
      showError(e.message);
    }
  }

  main();
}

export function releasePage() {
  return renderPage({
    title: "Release Order",
    active: "release",
    body: BODY,
    main: releaseMain,
  });
}
