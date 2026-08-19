/**
 * Reads shows-per-episode.csv, matches each row's Show name to an items.id
 * by fuzzy/normalized title match against the live dev D1 catalogue, and
 * writes seed/episodes.sql with one INSERT per matched episode.
 *
 * Run manually, in order:
 *   wrangler d1 migrations apply mcu-tracker-dev --env dev --remote
 *   node scripts/generate-episodes-seed.mjs
 *   wrangler d1 execute mcu-tracker-dev --env dev --remote --file seed/episodes.sql
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const CSV_PATH = new URL("../shows-per-episode.csv", import.meta.url);
const OUT_PATH = new URL("../seed/episodes.sql", import.meta.url);

/** Minimal RFC4180 CSV parser — handles quoted fields with embedded commas/newlines/escaped quotes. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.length > 1 || r[0] !== "");
}

/**
 * Normalizes a title for fuzzy comparison: lowercase, drop punctuation,
 * collapse whitespace, and rewrite "<Show> S<N>" -> "<show> season <n>" so
 * "WandaVision S1" and "WandaVision (Season 1)" normalize to the same
 * string. Also strips a trailing "(special)" since one-off specials in the
 * CSV usually map to items titled without that suffix.
 */
function normalizeTitle(raw) {
  let s = String(raw).trim();

  const seasonSuffix = /\sS(\d+)$/i.exec(s);
  if (seasonSuffix) {
    s = s.slice(0, seasonSuffix.index) + " season " + seasonSuffix[1];
  }

  const seasonParen = /\(Season\s+(\d+)\)/i.exec(s);
  if (seasonParen) {
    s = s.replace(/\(Season\s+(\d+)\)/i, " season " + seasonParen[1]);
  }

  s = s.replace(/\(special\)/i, "");
  s = s.replace(/:/g, " ");
  s = s.toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, " ").trim();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/^the\s+/, "");
  return s;
}

function loadItems() {
  const raw = execFileSync(
    "npx",
    [
      "wrangler",
      "d1",
      "execute",
      "mcu-tracker-dev",
      "--env",
      "dev",
      "--remote",
      "--command",
      "SELECT id, title FROM items",
      "--json",
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
  );

  const parsed = JSON.parse(raw);
  return parsed[0].results;
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function main() {
  const csvText = readFileSync(CSV_PATH, "utf8");
  const rows = parseCsv(csvText);
  const header = rows[0].map((h) => h.trim());
  const dataRows = rows.slice(1);

  const showIdx = header.indexOf("Show");
  const episodeNumIdx = header.indexOf("Episode #");
  const episodeTitleIdx = header.indexOf("Episode Title");
  const runtimeIdx = header.indexOf("Runtime (min)");
  const flagIdx = header.indexOf("Flag");

  if (showIdx === -1 || episodeNumIdx === -1) {
    throw new Error("CSV is missing expected columns: " + header.join(", "));
  }

  console.log("Loading items from dev D1...");
  const items = loadItems();
  const itemsByNormalized = new Map();
  for (const item of items) {
    itemsByNormalized.set(normalizeTitle(item.title), item);
  }

  const showNames = [...new Set(dataRows.map((r) => r[showIdx].trim()).filter(Boolean))];
  const showToItemId = new Map();
  const unmatchedShows = [];

  for (const show of showNames) {
    const norm = normalizeTitle(show);
    const match = itemsByNormalized.get(norm);
    if (match) {
      showToItemId.set(show, match.id);
    } else {
      unmatchedShows.push(show);
    }
  }

  const inserts = [];
  const skippedRows = [];

  for (const r of dataRows) {
    const show = (r[showIdx] || "").trim();
    if (!show) continue;

    const itemId = showToItemId.get(show);
    if (!itemId) {
      skippedRows.push(r);
      continue;
    }

    const episodeNumber = Number(String(r[episodeNumIdx]).trim());
    if (!Number.isInteger(episodeNumber)) {
      skippedRows.push(r);
      continue;
    }

    const title = (r[episodeTitleIdx] || "").trim() || null;
    const runtimeRaw = (r[runtimeIdx] || "").trim();
    const runtimeMin = runtimeRaw !== "" && !Number.isNaN(Number(runtimeRaw)) ? Number(runtimeRaw) : null;

    const flag = (r[flagIdx] || "").trim();
    const isEstimate = /estimate/i.test(flag) ? 1 : 0;

    inserts.push(
      `INSERT INTO episodes (item_id, episode_number, title, runtime_min, is_estimate) VALUES (${itemId}, ${episodeNumber}, ${sqlString(
        title
      )}, ${runtimeMin === null ? "NULL" : runtimeMin}, ${isEstimate});`
    );
  }

  const sql =
    "-- Generated by scripts/generate-episodes-seed.mjs from shows-per-episode.csv\n" +
    "-- Do not edit by hand; re-run the generator instead.\n\n" +
    inserts.join("\n") +
    "\n";
  writeFileSync(OUT_PATH, sql, "utf8");

  console.log(`Matched ${showToItemId.size}/${showNames.length} shows.`);
  console.log(`Wrote ${inserts.length} INSERT statements to seed/episodes.sql`);

  if (unmatchedShows.length > 0) {
    console.log("\nUNMATCHED SHOW NAMES (no episodes generated for these — fix manually):");
    for (const s of unmatchedShows) {
      console.log("  - " + s + "  (normalized: " + normalizeTitle(s) + ")");
    }
  } else {
    console.log("\nAll show names matched.");
  }

  const skippedForOtherReasons = skippedRows.filter((r) => showToItemId.has((r[showIdx] || "").trim()));
  if (skippedForOtherReasons.length > 0) {
    console.log(`\n${skippedForOtherReasons.length} row(s) skipped for a matched show due to bad data (e.g. non-numeric episode #):`);
    for (const r of skippedForOtherReasons) {
      console.log("  - " + JSON.stringify(r));
    }
  }
}

main();
