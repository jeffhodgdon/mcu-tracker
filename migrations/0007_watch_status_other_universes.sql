-- Extends watch_status to cover other_universes items, not just items(id).
-- Same rebuild pattern as 0005_watchlist_other_universes.sql: other_universes
-- has its own independent id sequence that overlaps with items.id, so a
-- single item_id FK can no longer disambiguate which table an entry points
-- at — source ("mcu" | "other") now carries that instead, and the FK to
-- items(id) is dropped since it would reject valid "other" ids.

ALTER TABLE watch_status RENAME TO watch_status_old;

CREATE TABLE watch_status (
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_id INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mcu',  -- 'mcu' (items.id) or 'other' (other_universes.id)
  status TEXT NOT NULL DEFAULT 'unwatched',  -- unwatched, watched, want_rewatch, skip
  episode_progress TEXT,        -- JSON blob for per-episode checkmarks, nullable
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id, source)
);

INSERT INTO watch_status (user_id, item_id, source, status, episode_progress, updated_at)
  SELECT user_id, item_id, 'mcu', status, episode_progress, updated_at FROM watch_status_old;

DROP TABLE watch_status_old;
