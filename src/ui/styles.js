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

/* Destructive actions (settings.js: Reset All Data, Delete My Data, and the
   "Yes, continue"/"Delete permanently" step of their inline confirm rows) —
   same accent red as .btn-primary but filled solid with no gradient, so it
   reads distinctly as "danger" rather than the app's ordinary call-to-action
   button. */
.btn-danger {
  background: var(--accent); border-color: var(--accent); color: #fff; font-weight: 600;
}
.btn-danger:hover { filter: brightness(1.15); border-color: var(--accent); }

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
  /* table td:first-child sets word-break:break-word (further down this file)
     so long titles can wrap inside a narrow mobile row — that's inherited by
     everything nested in the cell, badges included. word-break/overflow-wrap
     can force a mid-word break even under white-space:nowrap when the box is
     squeezed (a flex/grid child shrinking below content width), which is
     what was splitting badge text like "TV Series" across lines. Overriding
     both back to normal here is what actually stops it — white-space:nowrap
     alone (already set above) does not, since it only governs where normal
     line breaks may occur, not this forced break-to-fit behavior. */
  word-break: normal;
  overflow-wrap: normal;
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
     .wl-mobile-line2-left below, defined outside this media query). Same
     nowrap/word-break override as .badge above and for the same reason —
     without it, values like "Phase 1" (or, for some seed rows, a long
     literal string in the phase field) break mid-word once the flex row is
     squeezed narrow. */
  .rt-mobile-phase {
    color: var(--muted); font-size: 12px;
    white-space: nowrap; word-break: normal; overflow-wrap: normal;
  }

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

/* Season child rows (release.js/chronological.js) get a 3rd mobile line for
   the status dropdown instead of squeezing it into line 2's actions slot —
   line 2 there is already carrying a type badge, a date, and (release.js
   only) a phase label, which left too little room for a touch-sized select
   without it wrapping/shrinking awkwardly. */
.wl-mobile-line3 {
  margin-top: 6px;
}
.wl-mobile-line3 select {
  width: 100%;
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

/* Applied to a TV season row's whole <td> (see memberRows in consolidated.js)
   so both line 1 and line 2 act as one tap target for expand/collapse. */
.wl-mobile-bubble-clickable { cursor: pointer; }

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

  /* Expanded franchise block (consolidated.js only — release.js/
     chronological.js use the real nested-<div> bubbles below instead, since
     their show/season/episode hierarchy needs true nesting, not adjacent
     <tr>s). Wraps the whole run of expanded-group rows — parent + every
     member row + their episode-rows containers — in a border, so it reads
     as one grouped unit set apart from adjacent items. No wrapper element
     exists around the run of <tr>s, so the border is faked on the first and
     last row's <td> the same way the dashboard season block above does it. */
  tr.wl-mobile-only.expanded-group.group-row > td {
    border-top: 1px solid var(--border);
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    background: #1e2235;
  }
  /* Three-tier lightness hierarchy, matching release.js/chronological.js's
     show < season < episode ramp (#1e2235 < #242840 < #2a2f4a) — faked across
     adjacent <tr>s here instead of real nested <div>s, since consolidated.js
     renders franchise/season/episode as sibling rows rather than a
     franchise-owned container (see the comment above this block). */
  tr.wl-mobile-only.expanded-group.detail-row:not(.episode-rows) > td {
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    background: #242840;
  }
  /* Every episode block gets its own bottom border (not just the last one
     in the franchise, added further below) so it's clearly closed off before
     the next season's row starts instead of visually bleeding into it. */
  tr.expanded-group.episode-rows:not(.hide) > td {
    border-left: 1px solid var(--border);
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    background: #2a2f4a;
  }
  /* Bottom edge of the block: the last visible row before the next
     group-row (or the end of the table) closes off the border. Episode rows
     can be hidden independently of their member row, so the closing row is
     whichever of [member row, episode-rows] is actually last and visible. */
  tr.wl-mobile-only.expanded-group.detail-row:not(.episode-rows):not(:has(+ tr.episode-rows:not(.hide))) > td {
    border-bottom: 1px solid var(--border);
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  tr.expanded-group.episode-rows:not(.hide):not(:has(+ tr.wl-mobile-only.detail-row)) > td {
    border-bottom: 1px solid var(--border);
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
  }

  /* ---- release.js / chronological.js: nested show > season > episode ---- */

  /* Show bubble: the outermost level, holding the show header line plus
     every season bubble nested inside it (see mobileGroupHtml in
     release.js/chronological.js). This is real DOM containment — a <div>
     wrapping <div>s — rather than the border-faking-on-adjacent-<tr>s
     pattern used everywhere else in this file, which is why release.js
     switched the whole mobile show block to a single <tr> with div markup:
     show > season > episode nesting can't be faked across sibling <tr>s. */
  .mobile-show-bubble {
    padding: 10px;
    margin: 4px 0;
    border: 1px solid transparent;
    border-radius: 8px;
  }
  /* Border/background only apply once expanded (.expanded is toggled on
     this div by onParentToggle alongside the arrow/season-list state) — the
     collapsed row otherwise inherits table.tbody tr's plain default
     background, reading identically to a film row, and only gains the
     bubble look once there's a nested season list underneath it to visually
     contain. */
  .mobile-show-bubble.expanded {
    background: #1e2235;
    border-color: var(--border);
  }
  .mobile-show-toggle { cursor: pointer; }

  .mobile-season-list {
    margin-top: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Season bubble: nested one level inside the show bubble, a shade lighter
     so the hierarchy reads at a glance. Own border+radius (not just a faked
     top/bottom pair) since it's real DOM containment, not adjacent <tr>s. */
  .mobile-season-bubble {
    background: #242840;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
  }
  .mobile-season-toggle { cursor: pointer; }
  .mobile-season-bubble .wl-mobile-line1 .title { font-weight: 600; }

  /* Season line 2: type badge / date / status dropdown share the same
     1fr auto 1fr grid as .wl-mobile-line2 (defined outside this media
     query) — the dropdown sits in the actions slot instead of getting its
     own full-width line 3 (dropped below), matching how a flat film row's
     line 2 carries its status control. */
  .mobile-season-bubble .wl-mobile-line2-actions select,
  .mobile-show-bubble .wl-mobile-line2-actions select {
    min-height: 32px;
    padding: 4px 8px;
    font-size: 12.5px;
  }

  /* Episode bubble: nested one level inside the season bubble — indented and
     another shade lighter again, closing out the show/season/episode
     hierarchy (lightest of the three, per the show < season < episode
     lightness ramp). Episode rows load lazily on first expand (see
     onMobileSeasonToggle in release.js/chronological.js), same lazy-load
     behavior as the desktop episode-toggle button. */
  .mobile-episode-bubble {
    margin-top: 8px;
    margin-left: 8px;
    background: #2a2f4a;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  /* .episode-row itself (defined further down this file) is a single flex
     line — num, title, badges, runtime, watch checkbox — designed for the
     much wider desktop-table <td> it originally shipped in. Nested three
     bubbles deep there isn't room for the "needs review" badge and "est"
     badge to share the line without squeezing .episode-title toward zero,
     so both are hidden here and the row is tightened to num/title/
     runtime/checkbox only, kept to one line with the title ellipsized
     instead of wrapped — exactly what's asked for (E01  Title…  0h 50m  ☐). */
  .mobile-episode-bubble .episode-row {
    padding: 4px 8px;
    gap: 6px;
  }
  .mobile-episode-bubble .episode-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    word-break: normal;
  }
  .mobile-episode-bubble .badge.needs-review,
  .mobile-episode-bubble .badge.est {
    display: none;
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
  /* Same inherited word-break:break-word from the enclosing td:first-child
     (see .badge above) was letting short labels like "E01" split mid-string
     inside this fixed 30px box — nowrap keeps it on one line even if that
     means overflowing the box slightly, which reads better than a broken
     episode number. */
  white-space: nowrap;
}
.episode-title {
  flex: 1; color: var(--text);
  /* Explicit rather than relying on the inherited td:first-child value, so
     this stays break-word (break only at a word boundary when the title
     doesn't fit) and never regresses to break-all (breaking anywhere,
     mid-word) if that ancestor rule ever changes. */
  word-break: break-word;
}
.episode-runtime { flex: none; font-variant-numeric: tabular-nums; white-space: nowrap; }
.episode-watch { flex: none; display: flex; align-items: center; cursor: pointer; }
.episode-watch input { accent-color: var(--accent); width: 15px; height: 15px; cursor: pointer; }

.badge.needs-review { border-color: #5a4413; color: var(--accent2); }

.season-progress { color: var(--muted); font-size: 11px; white-space: nowrap; }

/* Expanded show/franchise block (dashboard.js, release.js, chronological.js,
   consolidated.js): applied to the parent row, every season/member row
   under it, and their episode-rows containers together while expanded, so
   the whole block reads as one visually grouped unit instead of a flat run
   of rows. Toggled in JS alongside the existing hide/expanded classes —
   see onParentToggle / the group-row click handler in each page. Painted on
   the <tr> itself (matching tbody tr:hover's own pattern below) since none
   of these rows' <td>s set their own background, so it shows straight
   through.

   Three-tier lightness hierarchy, applied at every width (not just mobile,
   see the @media (max-width: 768px) block above for the equivalent mobile
   rules) — show < season < episode ramp (#1e2235 < #242840 < #2a2f4a),
   matching the mobile bubbles: tv-parent is the outermost show/group row,
   tv-child is the nested season/item row, and episode-rows is the
   innermost episode block. A row can only ever be one of these three (they
   render as distinct sibling <tr>s, never combined classes), so ordering
   between the rules below doesn't matter. */
tr.expanded-group {
  background: #1e2235;
}
tr.tv-child.expanded-group {
  background: #242840;
}
tr.episode-rows.expanded-group {
  background: #2a2f4a;
}
/* Left/right edges of the grouped block, faked on each row's first/last
   <td> the same way the mobile rules above do it — a top/bottom border
   drawn on every row would stripe each one individually instead of reading
   as one contained block, so only the outer sides get a border here and the
   group's top/bottom edges are left to the existing row separators. */
tr.expanded-group > td:first-child {
  border-left: 1px solid var(--border);
}
tr.expanded-group > td:last-child {
  border-right: 1px solid var(--border);
}

/* Dashboard watchlist TV rows (watchlistRowHtml in dashboard.js): unlike
   release.js/chronological.js, a watchlisted season has no show-level parent
   row above it — it's just the item's own row (desktopRow, then mobileRow,
   then a shared episode-rows <tr>) with an episode-toggle arrow, so there's
   no expanded-group class or show tier to key off. Only two tiers apply
   here: the item row itself (season tier, #242840) and its episode-rows
   (episode tier, #2a2f4a) — there's no #1e2235 show row in this markup.

   Each item renders as an exact 3-row run — desktopRow, mobileRow,
   episode-rows — so mobileRow can reach episode-rows with a plain
   adjacent-sibling :has(+ ...), but desktopRow needs to skip over mobileRow
   first. A general-sibling :has(~ ...) would also match a LATER, unrelated
   item's expanded episode-rows (~ matches any following sibling, not just
   the next one), lighting up every item above it once any one item's
   episodes are open — so this instead skips exactly the one known
   mobileRow in between, keeping the match scoped to this item's own row. */
tr[data-key]:has(+ tr.wl-mobile-only + tr.episode-rows[data-episode-rows]:not(.hide)) > td,
tr[data-key]:has(+ tr.episode-rows[data-episode-rows]:not(.hide)) > td {
  border-top: 1px solid var(--border);
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  background: #242840;
}
tr.episode-rows[data-episode-rows]:not(.hide) > td {
  border-left: 1px solid var(--border);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  background: #2a2f4a;
}

/* -------------------------------------------------------------- settings */

/* Every section on /settings centers its content, matching .content-wrap's
   h1/.sub and the .filter-bar card pattern used elsewhere (dashboard.js) —
   scoped to #settings-body rather than bare .card/.admin-field-grid so
   admin.js's own left-aligned form on /admin is unaffected. */
#settings-body .card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
#settings-body h2 { text-align: center; }
#settings-body p { text-align: center; }

/* .card's flex column only centers each direct child as a unit — a <form>,
   <label> or grid left at its own content width would otherwise shrink to
   fit instead of the field itself filling and centering within the card, so
   these get an explicit width to fill against before their own content
   centers inside that width. */
#settings-body form,
#settings-body .admin-field-grid {
  width: 100%;
  max-width: 420px;
}
#settings-body label {
  text-align: center;
  align-items: center;
  width: 100%;
}
#settings-body select,
#settings-body textarea,
#settings-body input[type="search"] {
  text-align: center;
}
/* The centering rules above only stretch the <label> wrapper to full width —
   select/textarea/input are inline-sized elements that otherwise shrink to
   their own content (a <select> to its longest option, a <textarea> to the
   browser's ~20-column default), which is what was leaving the feedback
   form's Type/Item/Message fields as small centered boxes instead of filling
   the card, especially at mobile widths where every other field on the page
   is meant to read as full-width. Scoped to #feedback-form specifically
   (not every #settings-body select/textarea/input) since the task calls out
   the feedback fields, not the timezone selector above it, which keeps its
   own deliberate max-width:360px. */
#feedback-form select,
#feedback-form textarea,
#feedback-form input[type="search"] {
  width: 100%;
}
/* The feedback item search results list reads better left-aligned (each
   match is a distinct title, not a value to center under the input) —
   overrides the input-level rule above for just the result buttons. */
#settings-body .admin-picker-item {
  text-align: left;
}

/* Row/button groups: center as a unit rather than left-justify within the
   already-centered card. */
#settings-body .row {
  justify-content: center;
}
/* The How to Use toggle: same 1fr auto 1fr grid as .wl-mobile-line1 above
   (arrow left / title centered / runtime right there) adapted to this
   header's own two real elements plus one empty spacer column, so the
   title centers in the button's remaining space while the arrow still sits
   at the right edge rather than following the row-centering rule above. */
#settings-body #howto-toggle {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}
#settings-body #howto-toggle .howto-toggle-spacer {
  grid-column: 1;
}
#settings-body #howto-toggle h2 {
  grid-column: 2;
  text-align: center;
}
#settings-body #howto-toggle #howto-arrow {
  grid-column: 3;
  justify-self: end;
}
`;
