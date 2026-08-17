/**
 * Shared dark theme.
 *
 * Built fresh: no stylesheet from the earlier tracker exists in this repo, so
 * there was nothing to carry forward beyond the plain-text health page's
 * terminal feel. Kept deliberately plain so it is cheap to restyle once the
 * original palette is available.
 *
 * Responsive rule: one layout, two arrangements. Above 820px the nav is a
 * fixed left rail; below it becomes a top bar with a disclosure menu, which
 * keeps long labels readable in a way a five-item bottom bar would not.
 */

export const STYLES = `
:root {
  --bg: #0b0d10;
  --panel: #141921;
  --panel-2: #1b212b;
  --border: #263041;
  --text: #e7ebf2;
  --muted: #8d99ad;
  --accent: #e23636;
  --link: #6aa4ff;
  --ok: #3fb950;
  --warn: #d29922;
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

a { color: var(--link); text-decoration: none; }
a:hover { text-decoration: underline; }

/* ------------------------------------------------------------------ layout */

.rail {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--rail);
  background: var(--panel);
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
.nav a:hover { background: var(--panel-2); text-decoration: none; }
.nav a[aria-current="page"] {
  background: var(--panel-2);
  border-color: var(--border);
  box-shadow: inset 2px 0 0 var(--accent);
}
.nav a .soon { color: var(--muted); font-size: 11px; margin-left: 5px; }

.rail-foot { margin-top: auto; font-size: 12px; color: var(--muted); }
.rail-foot .who { color: var(--text); word-break: break-all; }
.btn-link {
  display: inline-block; background: var(--accent); color: #fff; font-weight: 600;
  padding: 8px 12px; border-radius: 8px; font-size: 13px;
}
.btn-link:hover { filter: brightness(1.08); text-decoration: none; }

main {
  margin-left: var(--rail);
  padding: 26px 28px 72px;
  max-width: 1080px;
}

h1 { font-size: 22px; margin: 0 0 4px; }
h2 { font-size: 15px; margin: 0 0 12px; letter-spacing: .3px; }
.sub { color: var(--muted); margin: 0 0 22px; font-size: 13px; }

/* Mobile bar, hidden on desktop */
.topbar { display: none; }

@media (max-width: 820px) {
  .rail {
    position: sticky; top: 0; width: auto; height: auto;
    border-right: 0; border-bottom: 1px solid var(--border);
    padding: 12px 14px; gap: 12px; z-index: 20;
  }
  .rail .nav { display: none; }
  .rail.open .nav { display: flex; }
  .rail-foot { margin-top: 0; }
  .desktop-brand { display: none; }
  .topbar {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .menu-btn {
    background: var(--panel-2); color: var(--text);
    border: 1px solid var(--border); border-radius: 8px;
    padding: 8px 12px; font-size: 14px; cursor: pointer;
  }
  main { margin-left: 0; padding: 18px 14px 60px; }
}

/* ------------------------------------------------------------------- cards */

.grid { display: grid; gap: 14px; }
.grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 820px) {
  .grid.cols-3, .grid.cols-2 { grid-template-columns: 1fr; }
}

.card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
}
.card h2 { color: var(--muted); text-transform: uppercase; font-size: 11px; }

.stat { font-size: 30px; font-weight: 700; line-height: 1.15; }
.stat.sm { font-size: 22px; }
.stat-note { color: var(--muted); font-size: 12px; margin-top: 4px; }

.bar {
  height: 8px; background: var(--panel-2);
  border-radius: 99px; overflow: hidden; margin-top: 12px;
  border: 1px solid var(--border);
}
.bar > i { display: block; height: 100%; background: var(--accent); }

/* ------------------------------------------------------------------ inputs */

button, select, input[type="date"], input[type="text"] {
  font: inherit;
  background: var(--panel-2);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
}
button { cursor: pointer; }
button:hover { border-color: #35415a; }
button:disabled, select:disabled { opacity: .55; cursor: not-allowed; }

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
  text-align: left; background: var(--panel-2); padding: 9px 11px;
}
.upcoming button .d { color: var(--muted); font-size: 12px; white-space: nowrap; }

table { width: 100%; border-collapse: collapse; }
thead th {
  text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .4px;
  color: var(--muted); font-weight: 600;
  padding: 8px 10px; border-bottom: 1px solid var(--border); white-space: nowrap;
}
tbody td { padding: 9px 10px; border-bottom: 1px solid var(--border); vertical-align: middle; }
tbody tr:hover { background: var(--panel); }
tbody tr.watched .title { color: var(--muted); text-decoration: line-through; }
.title { font-weight: 500; }
.num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

.badge {
  display: inline-block; font-size: 11px; padding: 2px 7px; border-radius: 99px;
  background: var(--panel-2); border: 1px solid var(--border); color: var(--muted);
  white-space: nowrap;
}
.badge.est { border-color: #4a3a12; color: var(--warn); }

.muted { color: var(--muted); }
.notice {
  background: var(--panel); border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius); padding: 14px 16px; margin-bottom: 20px;
}
.err {
  background: #2a1416; border: 1px solid #5b2a2f; color: #ffb4b4;
  border-radius: var(--radius); padding: 12px 14px; margin-bottom: 16px;
}
.hide { display: none !important; }

/* On narrow screens the table sheds its lower-priority columns rather than
   forcing a horizontal scroll, which is unusable one-handed. */
@media (max-width: 720px) {
  thead th.opt, tbody td.opt { display: none; }
  tbody td, thead th { padding: 8px 6px; }
}
`;
