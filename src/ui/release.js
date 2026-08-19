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

    const statusCell =
      '<select data-id="' +
      item.id +
      '"' +
      (state.signedIn ? "" : " disabled title=\"Sign in to track\"") +
      ">" +
      statusOptions(status) +
      "</select>";

    return (
      '<tr data-id="' +
      item.id +
      '" data-type="' +
      esc(item.type) +
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
      '<td class="opt muted">' +
      esc(item.phase || "—") +
      "</td>" +
      "<td>" +
      esc(displayDate(item.release_date)) +
      "</td>" +
      '<td class="num">' +
      (item.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(item.runtime_min)) +
      estimate +
      "</td>" +
      "<td>" +
      statusCell +
      "</td>" +
      "</tr>"
    );
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

    return (
      '<tr class="tv-parent' +
      (allWatched ? " watched" : "") +
      '" data-group="' +
      esc(group.key) +
      '" style="cursor:pointer">' +
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
      (hasRuntime ? formatRuntime(totalRuntime) : '<span class="muted">—</span>') +
      (hasEstimate
        ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
        : "") +
      "</td>" +
      "<td></td>" +
      "</tr>"
    );
  }

  function seasonRowHtml(item, groupKey) {
    const status = state.statuses.get(item.id) || "unwatched";
    const estimate = item.is_estimate
      ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
      : "";
    const seasonNum = seasonNumberOf(item.title);
    const seasonLabel = seasonNum !== null ? "Season " + seasonNum : item.title;

    const row =
      '<tr data-id="' +
      item.id +
      '" data-group="' +
      esc(groupKey) +
      '" data-type="' +
      esc(item.type) +
      '" class="tv-child hide' +
      (status === "watched" ? " watched" : "") +
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
      (item.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(item.runtime_min)) +
      estimate +
      "</td>" +
      "<td>" +
      '<span class="season-progress" data-season-progress="' +
      item.id +
      '"></span> ' +
      seasonSelectHtml(item.id, status) +
      "</td>" +
      "</tr>";

    return row + episodeRowsContainerHtml(item.id, 6);
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

  function isReleased(item, today) {
    return isRealDate(item.release_date) && item.release_date <= today;
  }

  function render() {
    const today = todayEastern();

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
    for (const tr of $("rows").querySelectorAll("tr.tv-parent")) {
      tr.addEventListener("click", onParentToggle);
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
      const row = select.closest("tr");
      if (row) row.classList.toggle("watched", next === "watched");
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

  // A parent group row has no single type of its own (its badge always reads
  // "TV Series" even when its seasons are Animated Series/Marvel Television),
  // so it is filtered by its children instead: hidden only once every season
  // under it is filtered out, matching "hiding TV Series hides the parent
  // group row and all its season children" for groups that are purely one
  // type, while a mixed-type group stays visible as long as any season does.
  function applyTypeFilter() {
    let visible = 0;
    for (const row of $("rows").querySelectorAll("tr[data-type]")) {
      const shown = state.activeTypes.has(row.getAttribute("data-type"));
      row.classList.toggle("filtered-out", !shown);
      if (shown) visible++;

      const itemId = row.getAttribute("data-id");
      const episodeRow = itemId && $("rows").querySelector('tr.episode-rows[data-episode-rows="' + itemId + '"]');
      if (episodeRow) episodeRow.classList.toggle("filtered-out", !shown);
    }
    for (const parent of $("rows").querySelectorAll("tr.tv-parent")) {
      const key = parent.getAttribute("data-group");
      const children = $("rows").querySelectorAll(
        'tr.tv-child[data-group="' + key + '"]'
      );
      const anyVisible = [...children].some((c) => !c.classList.contains("filtered-out"));
      parent.classList.toggle("filtered-out", !anyVisible);
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

  function onParentToggle(ev) {
    if (ev.target.closest("select")) return;
    const tr = ev.currentTarget;
    const key = tr.getAttribute("data-group");
    const expanded = tr.classList.toggle("expanded");
    const indicator = tr.querySelector(".collapse-indicator");
    if (indicator) indicator.textContent = expanded ? "▼" : "▶";

    for (const child of $("rows").querySelectorAll("tr.tv-child")) {
      if (child.getAttribute("data-group") === key) {
        child.classList.toggle("hide", !expanded);
        if (!expanded) {
          const itemId = child.getAttribute("data-id");
          const episodeRow = $("rows").querySelector('tr.episode-rows[data-episode-rows="' + itemId + '"]');
          if (episodeRow) episodeRow.classList.add("hide");
          const toggleBtn = child.querySelector("[data-episode-toggle]");
          if (toggleBtn) {
            toggleBtn.setAttribute("aria-expanded", "false");
            toggleBtn.textContent = "▶";
          }
        }
      }
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
      const row = select.closest("tr");
      if (row) row.classList.toggle("watched", next === "watched");
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
        for (const row of (watch.data && watch.data.watch_status) || []) {
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
