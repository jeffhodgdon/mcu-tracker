/**
 * Other Universes: reference table of non-MCU universes (Fox X-Men, Sony
 * Spider-Man, pre-MCU films, etc). Watch-status tracking is available for
 * signed-in users via /api/watch-status?source=other, mirroring release.js.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Other Universes</h1>
<p class="sub" id="subtitle">Loading…</p>

<div id="signed-out" class="notice hide">
  <strong>Sign in to track your progress.</strong>
  <span class="muted">This reference table is public; watch status needs an account.</span>
  <div style="margin-top:12px"><a class="btn-link" href="/api/auth/google">Sign in with Google</a></div>
</div>

<div class="card" style="padding:0;overflow:hidden">
  <table>
    <thead>
      <tr>
        <th style="width:38%;text-align:center">Title</th>
        <th class="opt" style="text-align:center">Type</th>
        <th class="opt" style="text-align:center">Setting</th>
        <th style="text-align:center">Released</th>
        <th class="num opt" style="text-align:center">Runtime</th>
        <th style="width:130px;text-align:center">Status</th>
      </tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="6" class="muted" style="padding:18px">Loading…</td></tr>
    </tbody>
  </table>
</div>
`;

function otherMain() {
  const state = { statuses: new Map(), signedIn: false };

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

  function sectionRow(label, count) {
    return (
      '<tr class="section"><td colspan="6" style="text-align:center">' + esc(label) + " (" + count + ")</td></tr>"
    );
  }

  function rowHtml(row) {
    const status = state.statuses.get(row.id) || "unwatched";
    const type = /Season/.test(row.title || "") ? "TV Series" : "Film";
    return (
      '<tr data-id="' +
      row.id +
      '" class="' +
      (status === "watched" ? "watched" : "") +
      '"><td><span class="title">' +
      esc(row.title) +
      "</span></td>" +
      '<td class="opt"><span class="badge" data-type="' +
      esc(type) +
      '">' +
      esc(type) +
      "</span></td>" +
      '<td class="opt muted">' +
      esc(row.setting || "—") +
      "</td>" +
      "<td>" +
      esc(displayYearOrDate(row.release_date)) +
      "</td>" +
      '<td class="num opt">' +
      (row.runtime_min === null ? '<span class="muted">—</span>' : formatRuntime(row.runtime_min)) +
      "</td>" +
      '<td><select data-id="' +
      row.id +
      '"' +
      (state.signedIn ? "" : " disabled title=\"Sign in to track\"") +
      ">" +
      statusOptions(status) +
      "</select></td></tr>"
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

  async function onStatusChange(ev) {
    const select = ev.target;
    const id = Number(select.getAttribute("data-id"));
    const next = select.value;
    const previous = state.statuses.get(id) || "unwatched";

    select.disabled = true;
    try {
      await apiPut("/api/watch-status/" + id + "?source=other", { status: next });
      state.statuses.set(id, next);
      const row = select.closest("tr");
      if (row) row.classList.toggle("watched", next === "watched");
    } catch (e) {
      select.value = previous;
      showError("Could not save that change: " + e.message);
    } finally {
      select.disabled = !state.signedIn ? true : false;
    }
  }

  async function main() {
    initNav();
    const me = await initSignedInLabel();
    state.signedIn = me.signedIn;

    if (!state.signedIn) $("signed-out").classList.remove("hide");

    try {
      const res = await apiGet("/api/other-universes");
      const rows = res.data.other_universes;

      if (state.signedIn) {
        const watch = await apiGet("/api/watch-status");
        for (const row of (watch.data && watch.data.watch_status) || []) {
          if (row.source === "other") state.statuses.set(row.item_id, row.status);
        }
      }

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

      for (const sel of $("rows").querySelectorAll("select[data-id]")) {
        sel.addEventListener("change", onStatusChange);
      }
    } catch (e) {
      $("rows").innerHTML =
        '<tr><td colspan="6" class="muted" style="padding:18px">Could not load this page.</td></tr>';
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
