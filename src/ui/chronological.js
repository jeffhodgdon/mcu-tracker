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
  const state = { items: [], statuses: new Map(), signedIn: false };

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

  function render() {
    const placed = state.items
      .filter((i) => i.chrono_order !== null && i.chrono_order !== undefined)
      .sort((a, b) => a.chrono_order - b.chrono_order);
    const unplaced = state.items
      .filter((i) => i.chrono_order === null || i.chrono_order === undefined)
      .sort((a, b) => a.id - b.id);

    let html = placed.map(rowHtml).join("");
    if (unplaced.length) {
      html +=
        sectionRow("Not yet placed (" + unplaced.length + ")") +
        unplaced.map(rowHtml).join("");
    }
    $("rows").innerHTML = html;

    for (const sel of $("rows").querySelectorAll("select")) {
      sel.addEventListener("change", onStatusChange);
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
