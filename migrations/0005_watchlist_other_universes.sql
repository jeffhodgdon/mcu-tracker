-- Extends the watchlist to cover other_universes items, not just items(id).
-- other_universes has its own independent id sequence that overlaps with
-- items.id, so a single item_id FK can no longer disambiguate which table an
-- entry points at — source ("mcu" | "other") now carries that instead, and
-- the FK to items(id) is dropped since it would reject valid "other" ids.
--
-- SQLite has no ALTER TABLE ... DROP CONSTRAINT, so the table is rebuilt:
-- rename old, create the new shape, copy rows over as source='mcu' (the only
-- source that has ever existed), drop the old table.

ALTER TABLE watchlist RENAME TO watchlist_old;

CREATE TABLE watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mcu',  -- 'mcu' (items.id) or 'other' (other_universes.id)
  UNIQUE(user_id, item_id, source)
);

INSERT INTO watchlist (id, user_id, item_id, source)
  SELECT id, user_id, item_id, 'mcu' FROM watchlist_old;

DROP TABLE watchlist_old;
