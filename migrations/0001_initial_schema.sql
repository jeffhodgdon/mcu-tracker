-- Phase 2: initial schema for MCU Tracker.
-- Users, sessions, catalogue items, per-user watch state, settings, feedback.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,           -- Film, One-Shot, TV Series, Animated Series,
                                -- Special Presentation, Marvel Television
  release_date TEXT,            -- nullable; TBD entries are NULL, partial
                                -- placeholders like 2027-07-00 are kept verbatim
  phase TEXT,
  runtime_min INTEGER,          -- nullable where unknown/unreleased
  notes TEXT,
  is_estimate INTEGER NOT NULL DEFAULT 0   -- 1 if runtime is a flagged estimate
);

CREATE TABLE watch_status (
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_id INTEGER NOT NULL REFERENCES items(id),
  status TEXT NOT NULL DEFAULT 'unwatched',  -- unwatched, watched, want_rewatch, skip
  episode_progress TEXT,        -- JSON blob for per-episode checkmarks, nullable
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  countdown_target_date TEXT,   -- nullable; user-chosen countdown date
  countdown_label TEXT          -- e.g. "Avengers: Secret Wars", nullable
);

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  item_id INTEGER REFERENCES items(id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
