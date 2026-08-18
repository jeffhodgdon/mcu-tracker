/**
 * Chronological Order: the catalogue sorted by in-universe placement
 * (items.chrono_order, seeded from chronological-order.csv), with the same
 * per-item status control as Release Order.
 *
 * A handful of items (untitled future-film placeholders with no announced
 * setting) have no chronological placement yet — chrono_order is NULL for
 * them. Rather than hide them, they render in a trailing "Not yet placed"
 * section so the catalogue always accounts for every item.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Chronological Order</h1>
<p class="sub" id="subtitle">Loading…</p>

<div id="signed-out" class="notice hide">
  <strong>Sign in to track your progress.</strong>
  <span class="muted">The catalogue below is public; watch status needs an account.</span>
  <div style="margin-top:12px"><a class="btn-link" href="/api/auth/google">Sign in with Google</a></div>
</div>

<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead>
      <tr>
        <th style="width:40%">Title</th>
        <th class="opt">Type</th>
        <th>In-universe setting</th>
        <th class="num opt">Runtime</th>
        <th style="width:130px">Status</th>
      </tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="5" class="muted" style="padding:18px">Loading…</td></tr>
    </tbody>
  </table>
</div>
`;

function chronologicalMain() {
  const state = { items: [], statuses: new Map(), signedIn: false, groups: new Map() };

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
    return '<tr class="section"><td colspan="5">' + esc(label) + "</td></tr>";
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
      '<td class="opt"><span class="badge">' +
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

  // Preserves overall ordering: a group is placed where its first season
  // appears in the given list, and later seasons of the same show fold into
  // that same group instead of getting their own slot.
  function buildGroups(list) {
    const order = [];
    const byBase = new Map();

    for (const item of list) {
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

  function parentStatusFor(group) {
    const statuses = group.items.map(function (it) {
      return state.statuses.get(it.id) || "unwatched";
    });
    return statuses.every(function (s) {
      return s === statuses[0];
    })
      ? statuses[0]
      : "unwatched";
  }

  function parentRowHtml(group) {
    const status = parentStatusFor(group);
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
      '<td class="opt"><span class="badge">TV Series</span></td>' +
      "<td>" +
      seasonCount +
      " season" +
      (seasonCount === 1 ? "" : "s") +
      "</td>" +
      '<td class="num opt">' +
      (hasRuntime ? formatRuntime(totalRuntime) : '<span class="muted">—</span>') +
      (hasEstimate
        ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
        : "") +
      "</td>" +
      '<td><select data-group="' +
      esc(group.key) +
      '" class="parent-status"' +
      (state.signedIn ? "" : " disabled title=\"Sign in to track\"") +
      ">" +
      statusOptions(status) +
      "</select></td>" +
      "</tr>"
    );
  }

  function childRowHtml(item, groupKey) {
    const status = state.statuses.get(item.id) || "unwatched";
    const estimate = item.is_estimate
      ? ' <span class="badge est" title="Runtime is an estimate">est</span>'
      : "";

    return (
      '<tr data-id="' +
      item.id +
      '" data-group="' +
      esc(groupKey) +
      '" class="tv-child hide' +
      (status === "watched" ? " watched" : "") +
      '">' +
      '<td><span class="title">' +
      esc(item.title) +
      "</span></td>" +
      '<td class="opt"><span class="badge">' +
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

  function groupsHtml(list) {
    const html = [];
    for (const group of buildGroups(list)) {
      if (group.isTv && group.items.length > 1) {
        state.groups.set(group.key, group);
        html.push(parentRowHtml(group));
        for (const item of group.items) html.push(childRowHtml(item, group.key));
      } else {
        html.push(rowHtml(group.items[0]));
      }
    }
    return html.join("");
  }

  function render() {
    const placed = state.items
      .filter((i) => i.chrono_order !== null && i.chrono_order !== undefined)
      .sort((a, b) => a.chrono_order - b.chrono_order);
    const unplaced = state.items
      .filter((i) => i.chrono_order === null || i.chrono_order === undefined)
      .sort((a, b) => a.id - b.id);

    state.groups = new Map();

    let html = groupsHtml(placed);
    if (unplaced.length) {
      html +=
        sectionRow("Not yet placed (" + unplaced.length + ")") +
        groupsHtml(unplaced);
    }
    $("rows").innerHTML = html;

    for (const sel of $("rows").querySelectorAll("select[data-id]")) {
      sel.addEventListener("change", onStatusChange);
    }
    for (const sel of $("rows").querySelectorAll("select.parent-status")) {
      sel.addEventListener("change", onParentStatusChange);
    }
    for (const tr of $("rows").querySelectorAll("tr.tv-parent")) {
      tr.addEventListener("click", onParentToggle);
    }
  }

  function onParentToggle(ev) {
    if (ev.target.closest("select")) return;
    const tr = ev.currentTarget;
    const key = tr.getAttribute("data-group");
    const expanded = tr.classList.toggle("expanded");
    const indicator = tr.querySelector(".collapse-indicator");
    if (indicator) indicator.textContent = expanded ? "▼" : "▶";

    for (const child of $("rows").querySelectorAll("tr.tv-child")) {
      if (child.getAttribute("data-group") === key) child.classList.toggle("hide", !expanded);
    }
  }

  async function onParentStatusChange(ev) {
    const select = ev.target;
    const key = select.getAttribute("data-group");
    const group = state.groups.get(key);
    if (!group) return;

    const next = select.value;
    const previous = group.items.map(function (it) {
      return state.statuses.get(it.id) || "unwatched";
    });

    select.disabled = true;
    try {
      for (const item of group.items) {
        await apiPut("/api/watch-status/" + item.id, { status: next });
        state.statuses.set(item.id, next);
      }

      const parentRow = select.closest("tr");
      if (parentRow) parentRow.classList.toggle("watched", next === "watched");

      for (const item of group.items) {
        const childRow = $("rows").querySelector('tr[data-id="' + item.id + '"]');
        if (!childRow) continue;
        childRow.classList.toggle("watched", next === "watched");
        const childSelect = childRow.querySelector("select");
        if (childSelect) childSelect.value = next;
      }
    } catch (e) {
      group.items.forEach(function (item, i) {
        state.statuses.set(item.id, previous[i]);
      });
      select.value = parentStatusFor(group);
      showError("Could not save that change: " + e.message);
    } finally {
      select.disabled = !state.signedIn ? true : false;
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

    try {
      const items = await apiGet("/api/items");
      state.items = items.data.items;

      if (state.signedIn) {
        const watch = await apiGet("/api/watch-status");
        for (const row of (watch.data && watch.data.watch_status) || []) {
          state.statuses.set(row.item_id, row.status);
        }
      }

      const unplacedCount = state.items.filter(
        (i) => i.chrono_order === null || i.chrono_order === undefined
      ).length;
      $("subtitle").textContent =
        state.items.length +
        " titles in in-universe order" +
        (unplacedCount ? " · " + unplacedCount + " not yet placed" : "");

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
