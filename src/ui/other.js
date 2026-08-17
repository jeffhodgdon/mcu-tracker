/**
 * Other Universes: browse-only reference table of non-MCU universes (Fox
 * X-Men, Sony Spider-Man, pre-MCU films, etc). No watch-status tracking, per
 * the brief — this data lives outside items and was never asked to be
 * trackable.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Other Universes</h1>
<p class="sub" id="subtitle">Loading…</p>

<div class="notice">Reference only — these are not part of the MCU catalogue and are not tracked.</div>

<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead>
      <tr>
        <th style="width:38%">Title</th>
        <th class="opt">Setting</th>
        <th>Released</th>
        <th class="num opt">Runtime</th>
      </tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="4" class="muted" style="padding:18px">Loading…</td></tr>
    </tbody>
  </table>
</div>
`;

function otherMain() {
  function $(id) {
    return document.getElementById(id);
  }

  function sectionRow(label, count) {
    return (
      '<tr class="section"><td colspan="4">' + esc(label) + " (" + count + ")</td></tr>"
    );
  }

  function rowHtml(row) {
    return (
      "<tr><td><span class=\"title\">" +
      esc(row.title) +
      "</span></td>" +
      '<td class="opt muted">' +
      esc(row.setting || "—") +
      "</td>" +
      "<td>" +
      esc(displayYearOrDate(row.release_date)) +
      "</td>" +
      '<td class="num opt">' +
      (row.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(row.runtime_min)) +
      "</td></tr>"
    );
  }

  // A few source rows carry only a bare year rather than a full date; showing
  // those as "TBD" (displayDate's fallback for anything non-ISO) would be
  // misleading since a year is real information, just imprecise.
  function displayYearOrDate(value) {
    if (!value) return "—";
    if (/^\d{4}$/.test(value)) return value;
    return displayDate(value);
  }

  async function main() {
    initNav();
    initSignedInLabel();

    try {
      const res = await apiGet("/api/other-universes");
      const rows = res.data.other_universes;

      const byUniverse = new Map();
      for (const r of rows) {
        if (!byUniverse.has(r.universe)) byUniverse.set(r.universe, []);
        byUniverse.get(r.universe).push(r);
      }

      $("subtitle").textContent =
        rows.length + " titles across " + byUniverse.size + " universes";

      let html = "";
      for (const [universe, list] of byUniverse) {
        html += sectionRow(universe, list.length) + list.map(rowHtml).join("");
      }
      $("rows").innerHTML = html;
    } catch (e) {
      $("rows").innerHTML =
        '<tr><td colspan="4" class="muted" style="padding:18px">Could not load this page.</td></tr>';
      showError(e.message);
    }
  }

  main();
}

export function otherPage() {
  return renderPage({
    title: "Other Universes",
    active: "other",
    body: BODY,
    main: otherMain,
  });
}
