-- Replaces the original 0001 `feedback` table (nullable user_id/item_id, no
-- `type` column) — nothing in the app ever read or wrote it — with the shape
-- /settings' feedback form actually needs: a required type category and a
-- required user_id (feedback is only ever submitted by a signed-in user).

DROP TABLE IF EXISTS feedback;

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  item_id INTEGER,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
