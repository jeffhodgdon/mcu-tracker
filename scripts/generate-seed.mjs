/**
 * Generates seed/items.sql from seed-data.csv.
 *
 *   node scripts/generate-seed.mjs
 *
 * The generated SQL is committed so that what gets applied to a database is
 * reviewable in the diff rather than produced on the fly at deploy time.
 *
 * Item ids come from the CSV's "#" column rather than being autoincremented,
 * which makes re-seeding idempotent (upsert by id) and keeps item_id stable —
 * watch_status rows reference items(id), so ids must not shuffle between runs.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "seed-data.csv");
const OUT = join(ROOT, "seed", "items.sql");
const ESTIMATE_IDS = join(ROOT, "seed", "estimate-ids.json");

// is_estimate used to be derived from the CSV's "Runtime Source" column. That
// column was removed because its values named personal media-server tooling,
// so the flag can no longer be computed from the CSV and is carried as an
// explicit id list instead. See seed/estimate-ids.json.
const estimateIds = new Set(JSON.parse(readFileSync(ESTIMATE_IDS, "utf8")).ids);

/** Minimal RFC 4180 parser: handles quoted fields, embedded commas and "" escapes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignore; \n ends the record
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** SQLite string literal, or NULL for empty/missing values. */
function sql(value) {
  if (value === null || value === undefined) return "NULL";
  const s = String(value).trim();
  if (s === "") return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}

/**
 * True only for real calendar dates. Round-trips the components back out of a
 * Date because Date.parse falls back to a lenient parser that would turn an
 * overflowed day like "2027-02-31" into March 3rd rather than rejecting it.
 * Zeroed month/day placeholders fail here by construction, which is what marks
 * them as partial rather than real.
 */
function isCalendarDate(match) {
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month === 0 || day === 0) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

function num(value) {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  if (!/^\d+$/.test(s)) throw new Error(`non-integer numeric value: ${s}`);
  return Number(s);
}

const raw = readFileSync(SRC, "utf8").replace(/^﻿/, "");
const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim() !== ""));
const header = rows.shift().map((h) => h.trim());

const col = (name) => {
  const i = header.indexOf(name);
  if (i === -1) throw new Error(`missing expected column: ${name}`);
  return i;
};

const C = {
  num: col("#"),
  title: col("Title"),
  type: col("Type"),
  release: col("Release Date"),
  phase: col("Phase"),
  notes: col("Notes"),
  runtime: col("Runtime (min)"),
};

// Guard against a future CSV quietly reintroducing provenance data.
const FORBIDDEN_COLUMNS = ["runtime source", "source"];
for (const h of header) {
  if (FORBIDDEN_COLUMNS.includes(h.toLowerCase())) {
    throw new Error(
      `seed-data.csv contains a "${h}" column. Runtime provenance was deliberately ` +
        `removed from this project; remove the column from the CSV before seeding.`
    );
  }
}

const report = { total: 0, estimates: 0, nullRuntime: 0, tbdDate: 0, partialDate: 0, warnings: [] };
const values = [];
const seenIds = new Set();

for (const r of rows) {
  const id = num(r[C.num]);
  const title = (r[C.title] ?? "").trim();

  if (id === null) {
    report.warnings.push(`row with title "${title}" has no # value — skipped`);
    continue;
  }
  if (seenIds.has(id)) {
    report.warnings.push(`duplicate # ${id} ("${title}") — skipped`);
    continue;
  }
  if (!title) {
    report.warnings.push(`# ${id} has an empty Title — skipped`);
    continue;
  }
  seenIds.add(id);

  const isEstimate = estimateIds.has(id) ? 1 : 0;
  if (isEstimate) report.estimates++;

  const runtime = num(r[C.runtime]);
  if (runtime === null) report.nullRuntime++;

  // Release dates come in three flavours:
  //   "2008-05-02" a real date, stored as-is
  //   "2027-07-00" a partial placeholder — the zeroed components mean "day (or
  //                month) not announced yet". Kept verbatim: these still sort
  //                correctly as text, which is how the spreadsheet encodes an
  //                item's position in the timeline. Note that SQLite date()
  //                functions return NULL for them, so order by the raw string.
  //   "TBD"        no information at all, stored as NULL.
  const releaseRaw = (r[C.release] ?? "").trim();
  const shaped = /^(\d{4})-(\d{2})-(\d{2})$/.exec(releaseRaw);
  const isRealDate = shaped !== null && isCalendarDate(shaped);
  const isPartial = shaped !== null && !isRealDate;

  if (isPartial) {
    report.partialDate++;
    report.warnings.push(
      `# ${id} ("${title}") has partial release date ${JSON.stringify(releaseRaw)} — kept verbatim for ordering; date() will not parse it`
    );
  } else if (releaseRaw && !isRealDate) {
    report.tbdDate++;
    report.warnings.push(
      `# ${id} ("${title}") release date ${JSON.stringify(releaseRaw)} carries no date — stored as NULL`
    );
  }
  const storeDate = shaped ? releaseRaw : null;

  values.push(
    `  (${id}, ${sql(title)}, ${sql(r[C.type])}, ${sql(storeDate)}, ` +
      `${sql(r[C.phase])}, ${runtime === null ? "NULL" : runtime}, ` +
      `${sql(r[C.notes])}, ${isEstimate})`
  );
  report.total++;
}

const out = `-- Generated by scripts/generate-seed.mjs from seed-data.csv. Do not edit by hand.
-- Rows: ${report.total} | estimate runtimes: ${report.estimates} | runtime NULL: ${report.nullRuntime}
-- Partial release dates kept verbatim: ${report.partialDate} | release_date NULL: ${report.tbdDate}
--
-- Upsert keyed on the explicit id so re-running is safe and never renumbers
-- items (watch_status.item_id points here). ON CONFLICT DO UPDATE is used
-- instead of INSERT OR REPLACE, which would delete-then-insert and take
-- dependent watch_status rows with it.

INSERT INTO items
  (id, title, type, release_date, phase, runtime_min, notes, is_estimate)
VALUES
${values.join(",\n")}
ON CONFLICT(id) DO UPDATE SET
  title = excluded.title,
  type = excluded.type,
  release_date = excluded.release_date,
  phase = excluded.phase,
  runtime_min = excluded.runtime_min,
  notes = excluded.notes,
  is_estimate = excluded.is_estimate;
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);

console.log(`wrote ${OUT}`);
console.log(`  rows:            ${report.total}`);
console.log(`  is_estimate = 1: ${report.estimates}`);
console.log(`  runtime_min NULL:${report.nullRuntime}`);
console.log(`  partial dates:   ${report.partialDate}`);
console.log(`  null (TBD) dates:${report.tbdDate}`);
if (report.warnings.length) {
  console.log(`  warnings:`);
  for (const w of report.warnings) console.log(`    - ${w}`);
} else {
  console.log(`  warnings:        none`);
}
