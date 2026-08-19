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

  const TV_TYPES = ["TV Series", "Marvel Television", "Animated Series"];

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
      '<td><span class="chrono-setting">' +
      esc(item.chrono_setting || "—") +
      "</span></td>" +
      '<td class="num opt">' +
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

  // Strips season-style suffixes so seasons of the same show share one group
  // key, mirroring release.js's tvBaseTitle.
  function tvBaseTitle(title) {
    return title
      .replace(/\s*\(Season\s+\d+\)\s*$/i, "")
      .replace(/\s+Season\s+\d+$/i, "")
      .replace(/\s+S\d+$/i, "")
      .trim();
  }

  function seasonNumberOf(title) {
    const m =
      /\(Season\s+(\d+)\)\s*$/i.exec(title) ||
      /\bSeason\s+(\d+)$/i.exec(title) ||
      /\bS(\d+)$/i.exec(title);
    return m ? Number(m[1]) : null;
  }

  // Groups the (already chrono-sorted) main list by show, placed at the
  // position of its earliest-chrono-order season — later seasons of the same
  // show fold into that same group instead of getting their own slot,
  // mirroring release.js's buildGroups but keyed off chrono order rather than
  // release date.
  function buildChronoGroups(sorted) {
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
      "<td>—</td>" +
      '<td class="num opt">' +
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
      '<td><span class="chrono-setting">' +
      esc(item.chrono_setting || "—") +
      "</span></td>" +
      '<td class="num opt">' +
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

    return row + episodeRowsContainerHtml(item.id, 5);
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

    state.mainItems = main;
    state.upcomingItems = upcoming;

    const groups = buildChronoGroups(main);
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
      select.disabled = false;
    }
  }

  function updateSubtitle() {
    let watched = 0;
    for (const item of state.items) {
      if ((state.statuses.get(item.id) || "unwatched") === "watched") watched++;
    }
    $("subtitle").textContent =
      state.mainItems.length +
      " titles · " +
      state.upcomingItems.length +
      " upcoming · " +
      watched +
      " watched";
  }

  function applyTypeFilter() {
    let visible = 0;
    for (const item of state.items) {
      const row = $("rows").querySelector('tr[data-id="' + item.id + '"]');
      if (!row) continue;
      const shown = state.activeTypes.has(item.type);
      row.classList.toggle("filtered-out", !shown);
      if (shown) visible++;

      const episodeRow = $("rows").querySelector('tr.episode-rows[data-episode-rows="' + item.id + '"]');
      if (episodeRow) episodeRow.classList.toggle("filtered-out", !shown);
    }
    for (const parent of $("rows").querySelectorAll("tr.tv-parent")) {
      const key = parent.getAttribute("data-group");
      const children = $("rows").querySelectorAll('tr.tv-child[data-group="' + key + '"]');
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

      render();
      updateSubtitle();
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
