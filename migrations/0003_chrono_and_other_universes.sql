-- Adds in-universe chronological placement to items, and a small reference
-- table for non-MCU universes browsed on the Other Universes page.
--
-- chrono_order is the position in chronological-order.csv (1..112), not a
-- recomputed rank, so re-seeding is stable. It is nullable: 6 items in the
-- catalogue (all untitled future-film placeholders with no announced setting)
-- have no chronological placement yet and stay NULL rather than being forced
-- into a position that would misrepresent the timeline. chronological.js
-- sorts NULLs into a trailing "not yet placed" section instead of hiding them.
--
-- chrono_setting is free text ("1943 - 1945", "Multiverse", "TBD") carried
-- straight from the CSV for display; it is not used for sorting.

ALTER TABLE items ADD COLUMN chrono_order INTEGER;
ALTER TABLE items ADD COLUMN chrono_setting TEXT;

-- Browse-only reference data for non-MCU universes (Fox X-Men, Sony
-- Spider-Man, etc.). Deliberately has no watch_status-style tracking table:
-- the brief calls this reference/browse only, and adding a tracking table
-- for data nobody asked to track would be unused surface area.
CREATE TABLE other_universes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  universe TEXT NOT NULL,       -- e.g. "Fox X-Men / Deadpool (Earth-10005)"
  title TEXT NOT NULL,
  setting TEXT,                 -- in-universe setting, nullable
  release_date TEXT,            -- nullable; a few entries only have a year
  runtime_min INTEGER,          -- nullable where unknown ("-" or "TBD" in source)
  notes TEXT
);
