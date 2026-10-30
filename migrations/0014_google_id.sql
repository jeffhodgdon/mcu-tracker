-- Key accounts on Google's stable account id (the ID token's `sub` claim)
-- instead of the email address, so a user who changes their Google email
-- keeps their account (see findOrCreateUser in oauth.js).
--
-- Nullable because existing rows predate it: each one is filled in on that
-- user's next sign-in, matched once by email. A UNIQUE index can't be added
-- via ADD COLUMN, so it is a separate index; SQLite allows any number of
-- NULLs in a UNIQUE index, so unclaimed legacy rows don't conflict.

ALTER TABLE users ADD COLUMN google_id TEXT;
CREATE UNIQUE INDEX users_google_id ON users (google_id);
