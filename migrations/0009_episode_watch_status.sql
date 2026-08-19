-- Adds episode-level watch tracking alongside the existing season-level rows.
--
-- episode_id defaults to 0, meaning "season-level" (unchanged behavior); a
-- real episodes.id means the row tracks one specific episode. 0 rather than
-- NULL specifically because SQLite treats every NULL as distinct within a
-- PRIMARY KEY/UNIQUE — a nullable episode_id would let a user accumulate
-- multiple "season-level" rows for the same item instead of upserting one,
-- silently breaking the ON CONFLICT upsert every other handler in api.js
-- relies on. 0 is never a valid episodes.id (AUTOINCREMENT starts at 1), so
-- it can't collide with a real episode.

ALTER TABLE watch_status RENAME TO watch_status_old;

CREATE TABLE watch_status (
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_id INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mcu',
  episode_id INTEGER NOT NULL DEFAULT 0,  -- 0 = season-level, else episodes.id
  status TEXT NOT NULL DEFAULT 'unwatched',
  episode_progress TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id, source, episode_id)
);

INSERT INTO watch_status (user_id, item_id, source, episode_id, status, episode_progress, updated_at)
SELECT user_id, item_id, source, 0, status, episode_progress, updated_at
  FROM watch_status_old;

DROP TABLE watch_status_old;
