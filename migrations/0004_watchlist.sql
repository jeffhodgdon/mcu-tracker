-- Per-user watchlist: items a user wants to add to their queue, separate from
-- watch_status. UNIQUE(user_id, item_id) makes bulk-add idempotent — inserting
-- an already-watchlisted item is a silent no-op rather than an error.

CREATE TABLE watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  UNIQUE(user_id, item_id)
);
