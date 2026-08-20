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
  <table class="cat-table">
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
    const rowAttrs = ' data-idx="' + index + '"';
    // Only franchises with more than one entry render member rows (see
    // memberRows below) and are actually expandable — the arrow should
    // match that, not appear on every row.
    const indicator = g.entry_count > 1 ? '<span class="collapse-indicator">▶</span>' : "";

    const desktopRow =
      "<tr" +
      rowAttrs +
      ' class="group-row wl-desktop-only" style="cursor:pointer">' +
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
      "</tr>";

    const mobileRow =
      "<tr" +
      rowAttrs +
      ' class="group-row wl-mobile-only" style="cursor:pointer">' +
      '<td colspan="5">' +
      '<div class="wl-mobile-line1">' +
      indicator +
      '<span class="title">' +
      esc(g.base_title) +
      "</span>" +
      '<span class="wl-mobile-runtime">' +
      formatRuntime(g.total_runtime_min) +
      "</span>" +
      "</div>" +
      '<div class="wl-mobile-line2">' +
      '<span class="badge" data-type="' +
      esc(g.type || "") +
      '">' +
      esc(g.type || "—") +
      "</span>" +
      '<span class="wl-mobile-date">' +
      esc(displayDate(g.first_release_date)) +
      "</span>" +
      '<span class="wl-mobile-line2-actions"><span class="badge count">' +
      g.entry_count +
      "</span></span>" +
      "</div>" +
      "</td>" +
      "</tr>";

    return desktopRow + mobileRow;
  }

  const TV_TYPES = ["TV Series", "Marvel Television", "Animated Series"];

  function memberRows(g) {
    if (g.entry_count <= 1) return "";
    const rows = g.member_ids
      .map((id) => itemsById.get(id))
      .filter(Boolean)
      .map((item) => {
        const isTv = TV_TYPES.indexOf(item.type) !== -1;
        const runtime = item.runtime_min === null ? "—" : formatRuntime(item.runtime_min);
        const parentAttr = ' data-parent="' + g._index + '"';

        const desktopRow =
          '<tr class="detail-row hide wl-desktop-only"' +
          parentAttr +
          '><td style="padding-left:26px" colspan="2">' +
          (isTv ? episodeToggleHtml(item.id) + " " : "") +
          esc(item.title) +
          "</td><td>" +
          esc(displayDate(item.release_date)) +
          '</td><td class="num"></td><td class="num opt">' +
          runtime +
          "</td></tr>";

        const mobileRow =
          '<tr class="detail-row hide wl-mobile-only"' +
          parentAttr +
          '>' +
          '<td colspan="5" class="rt-mobile-indent">' +
          '<div class="wl-mobile-line1">' +
          (isTv ? episodeToggleHtml(item.id) : "") +
          '<span class="title">' +
          esc(item.title) +
          "</span>" +
          '<span class="wl-mobile-runtime">' +
          runtime +
          "</span>" +
          "</div>" +
          '<div class="wl-mobile-line2">' +
          '<span class="wl-mobile-line2-left"></span>' +
          '<span class="wl-mobile-date">' +
          esc(displayDate(item.release_date)) +
          "</span>" +
          '<span class="wl-mobile-line2-actions"></span>' +
          "</div>" +
          "</td>" +
          "</tr>";

        const row = desktopRow + mobileRow;
        if (!isTv) return row;
        // Tagged with detail-row/data-parent (in addition to its own
        // episode-rows class) so the franchise expand/collapse toggle, which
        // only knows about .detail-row, hides it too when the franchise
        // collapses — independent of its own toggle button's state.
        const episodeRow = episodeRowsContainerHtml(item.id, 5).replace(
          'class="episode-rows hide"',
          'class="episode-rows detail-row hide" data-parent="' + g._index + '"'
        );
        return row + episodeRow;
      })
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
        // Desktop and mobile each render their own group-row sharing this
        // data-idx — compute the next state from whichever was clicked, then
        // apply it to both copies (and every member/episode row under this
        // franchise) so they stay in sync and the expanded-group highlight
        // covers the whole block consistently.
        const expanded = !tr.classList.contains("expanded-group");

        for (const group of $("rows").querySelectorAll('tr.group-row[data-idx="' + idx + '"]')) {
          group.classList.toggle("expanded-group", expanded);
          const indicator = group.querySelector(".collapse-indicator");
          if (indicator) indicator.textContent = expanded ? "▼" : "▶";
        }

        for (const detail of $("rows").querySelectorAll(
          'tr.detail-row[data-parent="' + idx + '"]'
        )) {
          if (detail.classList.contains("episode-rows")) {
            detail.classList.toggle("expanded-group", expanded);
            if (!expanded) {
              // Its own episode-toggle button controls reveal; collapsing
              // the franchise should only ever re-hide it, never show it on
              // its own.
              detail.classList.add("hide");
              const itemId = detail.getAttribute("data-episode-rows");
              const toggleBtn = $("rows").querySelector('[data-episode-toggle="' + itemId + '"]');
              if (toggleBtn) {
                toggleBtn.setAttribute("aria-expanded", "false");
                toggleBtn.textContent = "▶";
              }
            }
            continue;
          }
          detail.classList.toggle("hide", !expanded);
          detail.classList.toggle("expanded-group", expanded);
        }
      });
    }

    wireEpisodeToggles($("rows"));
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
