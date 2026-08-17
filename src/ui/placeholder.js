/**
 * Stand-ins for the pages still to be built.
 *
 * These exist so the shared nav never dead-ends on a 404 while the first two
 * pages are being reviewed. Each says plainly what it will become.
 */

import { renderPage } from "./shell.js";

const PENDING = {
  chronological: {
    title: "Chronological",
    heading: "Chronological Order",
    note:
      "Will list the catalogue in in-universe order. The chronological data " +
      "lives in chronological-order.csv (a 'Chrono Setting' column, 112 rows) " +
      "and is not in the database yet, so this page needs a follow-up migration " +
      "before it can be built properly.",
  },
  consolidated: {
    title: "Consolidated",
    heading: "Consolidated",
    note:
      "Will collapse each franchise to a single row with an entry count and " +
      "first release date, matching the spreadsheet's Consolidated tab.",
  },
  other: {
    title: "Other Universes",
    heading: "Other Universes",
    note:
      "Will browse the non-MCU universes — Fox X-Men, Sony Spider-Man and the " +
      "rest. That data lives in every-universe.csv and is not in the database " +
      "yet either.",
  },
};

function placeholderMain() {
  initNav();
  initSignedInLabel();
}

export function placeholderPage(id) {
  const meta = PENDING[id];
  return renderPage({
    title: meta.title,
    active: id,
    body:
      "<h1>" +
      meta.heading +
      '</h1>\n<p class="sub">Not built yet</p>\n<div class="notice"><p style="margin:0">' +
      meta.note +
      "</p></div>",
    main: placeholderMain,
  });
}

export function isPlaceholder(id) {
  return Object.prototype.hasOwnProperty.call(PENDING, id);
}
