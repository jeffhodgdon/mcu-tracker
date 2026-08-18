/**
 * Consolidated: one row per franchise, from /api/consolidated (grouped
 * server-side from items — see consolidate.js). Each row expands to list its
 * member entries.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Consolidated</h1>
<p class="sub" id="subtitle">Loading…</p>

<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead>
      <tr>
        <th style="width:44%;text-align:center">Franchise</th>
        <th class="opt" style="text-align:center">Type</th>
        <th style="text-align:center">First release</th>
        <th class="num" style="text-align:center">Entries</th>
        <th class="num opt" style="text-align:center">Total runtime</th>
      </tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="5" class="muted" style="padding:18px">Loading…</td></tr>
    </tbody>
  </table>
</div>
`;

function consolidatedMain() {
  let items = [];
  let itemsById = new Map();

  function $(id) {
    return document.getElementById(id);
  }

  function groupRow(g, index) {
    const runtimeNote =
      g.unreleased_count > 0
        ? '<div class="stat-note">' + g.unreleased_count + " unreleased</div>"
        : "";
    return (
      '<tr class="group-row" data-idx="' +
      index +
      '" style="cursor:pointer">' +
      '<td><span class="title">' +
      esc(g.base_title) +
      "</span></td>" +
      '<td class="opt"><span class="badge" data-type="' +
      esc(g.type || "") +
      '">' +
      esc(g.type || "—") +
      "</span></td>" +
      "<td>" +
      esc(displayDate(g.first_release_date)) +
      "</td>" +
      '<td class="num"><span class="badge count">' +
      g.entry_count +
      "</span></td>" +
      '<td class="num opt">' +
      formatRuntime(g.total_runtime_min) +
      runtimeNote +
      "</td>" +
      "</tr>"
    );
  }

  function memberRows(g) {
    if (g.entry_count <= 1) return "";
    const rows = g.member_ids
      .map((id) => itemsById.get(id))
      .filter(Boolean)
      .map(
        (item) =>
          '<tr class="detail-row hide" data-parent="' +
          g._index +
          '"><td style="padding-left:26px" colspan="2">' +
          esc(item.title) +
          "</td><td>" +
          esc(displayDate(item.release_date)) +
          '</td><td class="num"></td><td class="num opt">' +
          (item.runtime_min === null ? "—" : formatRuntime(item.runtime_min)) +
          "</td></tr>"
      )
      .join("");
    return rows;
  }

  function render(groups) {
    let html = "";
    groups.forEach((g, i) => {
      g._index = i;
      html += groupRow(g, i) + memberRows(g);
    });
    $("rows").innerHTML = html;

    for (const tr of $("rows").querySelectorAll("tr.group-row")) {
      tr.addEventListener("click", function () {
        const idx = tr.getAttribute("data-idx");
        for (const detail of $("rows").querySelectorAll(
          'tr.detail-row[data-parent="' + idx + '"]'
        )) {
          detail.classList.toggle("hide");
        }
      });
    }
  }

  async function main() {
    initNav();
    initSignedInLabel();

    try {
      const [itemsRes, groupsRes] = await Promise.all([
        apiGet("/api/items"),
        apiGet("/api/consolidated"),
      ]);
      items = itemsRes.data.items;
      itemsById = new Map(items.map((i) => [i.id, i]));

      const groups = groupsRes.data.groups;
      $("subtitle").textContent =
        groups.length + " franchises · " + items.length + " total entries · click a row to expand";
      render(groups);
    } catch (e) {
      $("rows").innerHTML =
        '<tr><td colspan="5" class="muted" style="padding:18px">Could not load the catalogue.</td></tr>';
      showError(e.message);
    }
  }

  main();
}

export function consolidatedPage() {
  return renderPage({
    title: "Consolidated",
    active: "consolidated",
    body: BODY,
    main: consolidatedMain,
  });
}
