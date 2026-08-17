/**
 * Release Date Order: the full catalogue, sorted by release date, with a
 * per-item status control bound to /api/watch-status.
 *
 * Signed out the table still renders — /api/items is public — with the status
 * controls disabled rather than the page being blocked.
 */

import { renderPage } from "./shell.js";

const BODY = `
<h1>Release Date Order</h1>
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
        <th style="width:44%">Title</th>
        <th class="opt">Type</th>
        <th class="opt">Phase</th>
        <th>Released</th>
        <th class="num">Runtime</th>
        <th style="width:130px">Status</th>
      </tr>
    </thead>
    <tbody id="rows">
      <tr><td colspan="6" class="muted" style="padding:18px">Loading…</td></tr>
    </tbody>
  </table>
</div>
`;

function releaseMain() {
  const state = { items: [], statuses: new Map(), signedIn: false };

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

  function rowHtml(item) {
    const status = state.statuses.get(item.id) || "unwatched";
    const isTv = TV_TYPES.indexOf(item.type) !== -1;

    // Episode-level data does not exist in the catalogue yet, so a season is a
    // single checkable row. The note keeps that visible rather than implying
    // the expansion is missing by accident.
    const titleExtra = isTv
      ? ' <span class="badge" title="Episode-level data is not in the catalogue yet; this tracks the whole season">season</span>'
      : "";
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
      "</span>" +
      titleExtra +
      "</td>" +
      '<td class="opt"><span class="badge">' +
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
    // Sorted on the raw string: catalogue dates are ISO-shaped, and partial
    // placeholders like 2027-07-00 land in the right slot this way. Undated
    // entries sort last rather than at the epoch.
    const sorted = state.items.slice().sort(function (a, b) {
      if (!a.release_date && !b.release_date) return a.id - b.id;
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      if (a.release_date === b.release_date) return a.id - b.id;
      return a.release_date < b.release_date ? -1 : 1;
    });

    $("rows").innerHTML = sorted.map(rowHtml).join("");

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
      ? state.items.length + " titles · " + watched + " watched"
      : state.items.length + " titles in release order";
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
