/**
 * Shared dark theme — palette carried over from the original tracker artifact.
 *
 * Responsive rule: one layout, two arrangements. Above 820px the nav is a
 * fixed left rail; below it becomes a top bar with a disclosure menu, which
 * keeps long labels readable in a way a five-item bottom bar would not.
 */

export const STYLES = `
:root {
  --bg: #0b0d14;
  --card: #141824;
  --card2: #1b2030;
  --accent: #e0313b;
  --accent2: #ffb020;
  --text: #eef0f5;
  --muted: #8b93a7;
  --done: #2fae66;
  --border: #262c3d;

  --card-bg: linear-gradient(155deg, var(--card), var(--card2));
  --rail: 232px;
  --radius: 10px;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto,
        "Helvetica Neue", Arial, sans-serif;
  -webkit-text-size-adjust: 100%;
}

a { color: var(--accent2); text-decoration: none; }
a:hover { text-decoration: underline; }

/* ------------------------------------------------------------------ layout */

.rail {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--rail);
  background: var(--card-bg);
  border-right: 1px solid var(--border);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
}

.brand {
  font-weight: 700;
  letter-spacing: .3px;
  font-size: 17px;
  display: flex;
  align-items: center;
  gap: 9px;
}
.brand .dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: var(--accent);
  flex: none;
}
.brand small { display: block; font-weight: 400; font-size: 11px; color: var(--muted); }

.nav { display: flex; flex-direction: column; gap: 3px; }
.nav a {
  display: block;
  padding: 9px 11px;
  border-radius: 8px;
  color: var(--text);
  border: 1px solid transparent;
  font-size: 14px;
}
.nav a:hover { background: var(--card2); text-decoration: none; }
.nav a[aria-current="page"] {
  background: var(--card2);
  border-color: var(--border);
  box-shadow: inset 2px 0 0 var(--accent);
}

[data-quick][aria-pressed="true"],
[data-filter][aria-pressed="true"] {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
}

.watchlist-picker-scroll { padding-right: 12px; }

.franchise-items { padding-left: 40px; }

.rail-foot { margin-top: auto; font-size: 12px; color: var(--muted); }
.rail-foot .who { color: var(--text); word-break: break-all; }
.btn-link {
  display: inline-block; background: var(--accent); color: #fff; font-weight: 600;
  padding: 8px 12px; border-radius: 8px; font-size: 13px;
}
.btn-link:hover { filter: brightness(1.08); text-decoration: none; }

main {
  margin-left: var(--rail);
  padding: 26px 2rem 72px;
}

.content-wrap {
  max-width: 960px;
  width: 100%;
  margin: 0 auto;
}

.content-wrap h1 { text-align: center; }
.content-wrap .sub { text-align: center; }

h1 { font-size: 22px; margin: 0 0 4px; }
h2 { font-size: 15px; margin: 0 0 12px; letter-spacing: .3px; }
.sub { color: var(--muted); margin: 0 0 22px; font-size: 13px; }

/* Desktop: the fixed top bar, hamburger, drawer and overlay are all mobile-only
   (see the max-width:768px block below) and stay fully hidden here. */
.topbar { display: none; }
.menu-btn {
  background: transparent; color: var(--text);
  border: none; border-radius: 8px;
  width: 40px; height: 40px; font-size: 20px; line-height: 1; cursor: pointer;
  flex: none;
}
.drawer-overlay { display: none; }
.drawer { display: none; }

@media (max-width: 768px) {
  .rail { display: none; }

  .topbar {
    display: flex; align-items: center; gap: 8px;
    position: fixed; top: 0; left: 0; right: 0; z-index: 40;
    height: 64px; padding: 0 10px;
    background: var(--card-bg);
    border-bottom: 1px solid var(--border);
  }
  .topbar-brand {
    flex: 1;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    margin-right: 40px; /* balances the hamburger's width so the brand is truly centered */
    font-weight: 700; font-size: 16px; letter-spacing: .3px; line-height: 1.3;
  }
  .topbar-brand small { display: block; font-weight: 400; font-size: 11px; color: var(--muted); }

  .drawer-overlay {
    display: block;
    position: fixed; inset: 0; background: rgba(0,0,0,0.55); z-index: 30;
  }

  .drawer {
    display: flex;
    position: fixed; top: 64px; bottom: 0; left: 0;
    width: min(280px, 82vw);
    background: var(--card-bg);
    border-right: 1px solid var(--border);
    padding: 20px 14px;
    flex-direction: column;
    gap: 18px;
    overflow-y: auto;
    z-index: 35;
    transform: translateX(-100%);
    transition: transform .2s ease;
  }
  .drawer.open { transform: translateX(0); }

  main { margin-left: 0; padding: 82px 14px 60px; }
}

/* ------------------------------------------------------------------- cards */

.grid { display: grid; gap: 14px; }
.grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 820px) {
  .grid.cols-3, .grid.cols-2 { grid-template-columns: 1fr; }
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.card h2 { color: var(--muted); text-transform: uppercase; font-size: 11px; }

.stat { font-size: 30px; font-weight: 700; line-height: 1.15; text-align: center; }
.stat.sm { font-size: 22px; }
.stat-note { color: var(--muted); font-size: 12px; margin-top: 4px; text-align: center; }

.bar {
  height: 8px; background: var(--bg);
  border-radius: 99px; overflow: hidden; margin-top: 12px;
  border: 1px solid var(--border);
}
.bar > i { display: block; height: 100%; background: var(--done); }

/* ------------------------------------------------------------------ inputs */

button, select, input[type="date"], input[type="text"], input[type="search"] {
  font: inherit;
  background: var(--card2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
}
button { cursor: pointer; }
button:hover { border-color: #36405c; }
button:disabled, select:disabled { opacity: .55; cursor: not-allowed; }
/* Scoped to text-like inputs only — browsers match checkbox/radio inputs
   against :read-only too (they have no text-editing concept of readonly),
   which would otherwise put a not-allowed cursor on interactive checkboxes
   like the episode Est. boxes that are never actually disabled/readonly. */
input[type="text"]:disabled, input[type="number"]:disabled, input[type="search"]:disabled,
input[type="date"]:disabled,
input[type="text"]:read-only, input[type="number"]:read-only, input[type="search"]:read-only,
input[type="date"]:read-only {
  opacity: .65;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600;
}
.btn-primary:hover { filter: brightness(1.08); border-color: var(--accent); }

.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.switch { display: inline-flex; align-items: center; gap: 9px; cursor: pointer; user-select: none; }
.switch input { accent-color: var(--accent); width: 16px; height: 16px; cursor: pointer; }


/* ------------------------------------------------------------------- lists */

.upcoming { display: flex; flex-direction: column; gap: 6px; margin-top: 12px; }
.upcoming button {
  display: flex; justify-content: space-between; gap: 12px; width: 100%;
  text-align: left; background: var(--card2); padding: 9px 11px;
}
.upcoming button .d { color: var(--muted); font-size: 12px; white-space: nowrap; }

table { width: 100%; border-collapse: collapse; }
table th { text-align: center; }
table td:first-child { text-align: left; }
table td { text-align: center; }
thead th {
  text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px;
  color: var(--muted); font-weight: 600;
  padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap;
}
tbody td { padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
tbody tr:hover { background: var(--card2); }
tbody tr.watched .title { color: var(--muted); text-decoration: line-through; }
tbody tr.watched td:first-child { box-shadow: inset 2px 0 0 var(--done); }
.title { font-weight: 500; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Section headings inside a table, e.g. each universe or the unplaceable block */
tbody tr.section td {
  background: var(--bg);
  color: var(--muted);
  font-size: 11px; text-transform: uppercase; letter-spacing: .5px; font-weight: 700;
  padding: 12px 10px 8px;
  border-bottom: 1px solid var(--border);
}
tbody tr.section:hover td { background: var(--bg); }

.badge {
  display: inline-block; font-size: 11px; padding: 2px 7px; border-radius: 99px;
  background: var(--card2); border: 1px solid var(--border); color: var(--muted);
  white-space: nowrap;
}
.badge.est { border-color: #5a4413; color: var(--accent2); }
.badge.count { border-color: #4a1f24; color: var(--accent); }

.badge[data-type="Film"] { border-color: #1e4a7a; color: #6ab3ff; }
.badge[data-type="TV Series"] { border-color: #1e5c3a; color: #5ed492; }
.badge[data-type="One-Shot"] { border-color: #4a2a7a; color: #b98cff; }
.badge[data-type="Special Presentation"] { border-color: #1c5c5c; color: #4fd6d6; }
.badge[data-type="Marvel Television"] { border-color: #7a4a1e; color: #ffab5e; }
.badge[data-type="Animated Series"] { border-color: #7a2352; color: #ff8fc2; }

.muted { color: var(--muted); }
.notice {
  background: var(--card-bg); border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius); padding: 14px 16px; margin-bottom: 20px;
}
.err {
  background: #2a1416; border: 1px solid #5b2a2f; color: #ffb4b4;
  border-radius: var(--radius); padding: 12px 14px; margin-bottom: 16px;
}
.hide, .filtered-out { display: none !important; }

.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.toolbar input[type="search"] { flex: 1; min-width: 190px; }

.filter-bar {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 14px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.filter-bar-count {
  color: var(--muted);
  font-size: 12px;
}
.filter-bar-types {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-bar-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}
.filter-bar button {
  font-size: 13px;
  font-weight: 700;
  padding: 6px 12px;
}
.filter-bar button[aria-pressed="false"] {
  opacity: .5;
}
.filter-bar-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  font-weight: 400;
}
.filter-bar-ghost:hover {
  border-color: #36405c;
  color: var(--text);
}

@media (max-width: 720px) {
  thead th.opt, tbody td.opt { display: none; }
  tbody td, thead th { padding: 8px 6px; }
}

/* ------------------------------------------------------ mobile table polish */

@media (max-width: 768px) {
  /* .card wraps every catalogue table with overflow:hidden — combined with
     the narrower .opt-column set and text that can wrap/truncate below, this
     keeps every table page (release, chronological, other, consolidated,
     admin) from ever needing horizontal scroll on a narrow viewport. */
  table { table-layout: fixed; }
  table td, table th { overflow: hidden; text-overflow: ellipsis; }
  table td:first-child, table th:first-child { white-space: normal; word-break: break-word; }

  /* In-universe setting (chronological) has no fixed width and is the one
     column long enough to need to truncate rather than wrap. */
  .chrono-setting { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }

  /* Release/Chronological/Other Universes/Consolidated tables: same
     desktop/mobile row pairing as the dashboard watchlist (see
     .wl-mobile-only below). The two-line mobile row layout is
     self-explanatory, so the header is dropped entirely on mobile rather
     than replaced with a condensed one. */
  .cat-table thead { display: none; }

  /* Phase (release.js flat/season rows) sits next to the type badge on
     mobile line 2, grouped inside one wrapper so both share the badge's
     grid-column:1 slot instead of each trying to claim it separately (see
     .wl-mobile-line2-left below, defined outside this media query). */
  .rt-mobile-phase { color: var(--muted); font-size: 12px; }

  /* Small muted prefix distinguishing the mobile date column's meaning
     (Release Date vs in-universe Timeline) now that there's no dedicated
     column header to convey it. */
  .rt-mobile-label { color: var(--muted); font-size: 10px; text-transform: uppercase; margin-right: 4px; }

  /* Season child rows sit under a TV show's collapsible parent row, same as
     desktop's padding-left:32px indent. */
  .rt-mobile-indent { padding-left: 18px; }

  /* Touch-friendly tap targets: status selects, watch checkboxes and the
     standalone icon buttons (remove/edit — a full table cell to themselves,
     unlike .episode-toggle which sits inline before a title and stays
     compact) all grow to at least 44px on their smaller axis. */
  tbody td select { min-height: 44px; }
  tbody td input[type="checkbox"] { width: 22px; height: 22px; }
  .watchlist-remove, .episode-remove-btn, .admin-edit-btn {
    min-width: 44px; min-height: 44px;
  }
}

/* --------------------------------------------------- watchlist (dashboard) */

.watchlist-mobile-head { display: none; }

/* Each watchlist item renders as two sibling <tr>s — a desktop one with the
   normal per-column <td>s, and a mobile one with a single <td colspan> holding
   a <div>-based two-line layout — because flexbox does not apply to table
   rows/cells in any browser, so a <tr>/<td> can't itself reflow at a
   breakpoint the way a div can. CSS below picks exactly one of the pair to
   display at a given width; both always exist in the DOM. */
.wl-mobile-only { display: none; }

/* Type badge left / date centered / status+remove right. A flex row with
   justify-content:space-between centers the date only relative to its
   actual neighbors, so a wider or narrower badge shifts the date off the
   row's true center. A 3-column grid removes that dependency the same way
   line 1's does: the badge sits in column 1 (its own natural width, left
   aligned), the date is centered within column 2 regardless of what widths
   columns 1/3 end up being, and the status checkbox + remove button share
   column 3, right aligned as a pair. */
.wl-mobile-line2 {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.wl-mobile-line2 .badge {
  grid-column: 1;
  justify-self: start;
}

/* Wraps the type badge together with a second piece of column-1 content
   (currently just release.js's Phase label) so both sit in the same grid
   cell, side by side, instead of each independently claiming grid-column:1
   and stacking into their own row (auto-placement would otherwise put the
   second item on a new row rather than beside the first). The nested .badge
   is no longer a direct grid child once wrapped, so the rule above becomes a
   harmless no-op for it — .wl-mobile-line2 pages that render a bare badge
   (chronological.js, other.js, dashboard.js) are unaffected. */
.wl-mobile-line2-left {
  grid-column: 1;
  justify-self: start;
  display: flex;
  align-items: center;
  gap: 6px;
}
.wl-mobile-date {
  grid-column: 2;
  color: var(--muted); font-size: 12px; text-align: center;
}
.wl-mobile-line2-actions {
  grid-column: 3;
  display: flex; align-items: center; gap: 8px;
  justify-self: end;
}
.wl-mobile-line2 .title {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* Arrow left / title centered / runtime right, using the exact same
   1fr auto 1fr grid as .wl-mobile-line2 below — that's what actually keeps
   the title (line 1) and the date (line 2) sitting at the same horizontal
   center point, since both lines' middle column now lands at the same
   position regardless of what's in column 1/3 on either line. Non-TV rows
   render no arrow, so column 1 is simply empty on those rows — the title
   still centers correctly because centering comes from the column
   structure, not from a matching sibling. */
.wl-mobile-line1 {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.wl-mobile-line1 .episode-toggle,
.wl-mobile-line1 .collapse-indicator {
  grid-column: 1;
  justify-self: start;
  text-align: center; padding: 2px 0; margin-right: 0;
}
.wl-mobile-line1 .title {
  grid-column: 2;
  text-align: center;
  font-weight: 700;
  padding: 0 8px;
}
.wl-mobile-runtime {
  grid-column: 3;
  justify-self: end;
  color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap;
}

/* Applied only to TV rows (see watchlistRowHtml in dashboard.js) so the whole
   line becomes a bigger tap target for expand/collapse, matching the
   touch-friendly-target rule used elsewhere for mobile. Non-TV rows have no
   handler bound and keep the default cursor. */
.wl-mobile-line1-clickable { cursor: pointer; }

@media (max-width: 768px) {
  /* Column headers describe the desktop per-column layout, which the mobile
     row replaces entirely with self-explanatory div markup — so a single
     "My Watch List" label stands in for them instead. */
  .watchlist-table thead tr:not(.watchlist-mobile-head) { display: none; }
  .watchlist-table .watchlist-mobile-head { display: table-row; }
  .watchlist-table .watchlist-mobile-head th {
    padding: 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .4px;
  }

  .wl-desktop-only { display: none; }
  .wl-mobile-only { display: table-row; }
  .wl-mobile-only td { padding: 10px; }

  /* Groups the season row and its expanded episode rows into one visually
     bordered block. There's no wrapper element around the pair — mobileRow
     and its episode-rows <tr> are plain siblings in the table (see
     watchlistRowHtml in dashboard.js) — so the border is faked across the
     two adjacent rows' <td>s instead of drawn on a container: the season
     row's <td> gets top+left+right plus rounded top corners, and the
     episode-rows <tr>'s <td> (only reachable via the preceding-sibling
     combinator, since :has(+) can't select backwards) gets left+right+bottom
     with rounded bottom corners. Drawing on the <td>s rather than the inner
     line1/line2 divs keeps both halves flush at the same horizontal edge
     (the divs sit 10px padding inset from the td, which would otherwise
     misalign the shared side borders where the two rows meet). */
  tr[data-key]:has(+ tr.episode-rows:not(.hide)) > td {
    border-top: 1px solid var(--border);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    background: #222640;
  }
  tr.episode-rows:not(.hide) > td {
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    background: #222640;
  }
}

/* -------------------------------------------------------------------- admin */

.tab-btn { font-size: 13px; font-weight: 700; padding: 6px 14px; }
.tab-btn[aria-pressed="false"] { opacity: .5; }

.admin-picker-results {
  display: flex; flex-direction: column; gap: 2px;
  margin-bottom: 14px; max-height: 220px; overflow-y: auto;
  border: 1px solid var(--border); border-radius: 8px; padding: 4px;
}
.admin-picker-item {
  text-align: left; background: transparent; border: none;
  padding: 7px 9px; border-radius: 6px; color: var(--text); font-size: 14px;
}
.admin-picker-item:hover { background: var(--card2); border-color: transparent; }

.admin-field-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px;
}
.admin-field-grid label {
  display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--muted);
}
.admin-field-grid label.switch { flex-direction: row; align-items: center; }
@media (max-width: 620px) {
  .admin-field-grid { grid-template-columns: 1fr; }
}

.admin-clickable-row { cursor: pointer; }
.admin-audit-subheader td {
  background: var(--bg);
  font-weight: 600;
  padding-top: 12px;
}
#episode-rows input[type="text"],
#episode-rows input[type="number"] {
  padding: 5px 8px;
  font-size: 13px;
}

/* ----------------------------------------------------------------- episodes */

.episode-toggle {
  background: none; border: 1px solid transparent; color: var(--muted);
  padding: 2px 6px; font-size: 11px; border-radius: 6px; cursor: pointer;
  margin-right: 4px;
}
.episode-toggle:hover { background: var(--card2); border-color: var(--border); }

tr.episode-rows td { padding: 0; border-bottom: 1px solid var(--border); }

.episode-row {
  display: flex; align-items: center; gap: 10px;
  padding: 5px 10px 5px 40px; font-size: 12.5px; color: var(--muted);
  border-bottom: 1px solid var(--border);
}
.episode-row:last-child { border-bottom: none; }
.episode-row.watched .episode-title { color: var(--muted); text-decoration: line-through; }
.episode-row.episode-no-data { padding-left: 40px; color: var(--muted); }

.episode-num {
  font-variant-numeric: tabular-nums; font-weight: 600; color: var(--text);
  flex: none; width: 30px;
}
.episode-title { flex: 1; color: var(--text); }
.episode-runtime { flex: none; font-variant-numeric: tabular-nums; white-space: nowrap; }
.episode-watch { flex: none; display: flex; align-items: center; cursor: pointer; }
.episode-watch input { accent-color: var(--accent); width: 15px; height: 15px; cursor: pointer; }

.badge.needs-review { border-color: #5a4413; color: var(--accent2); }

.season-progress { color: var(--muted); font-size: 11px; white-space: nowrap; }
`;
