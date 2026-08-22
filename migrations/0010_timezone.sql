-- Adds a per-user timezone preference, used by the /settings page to let a
-- user pick which timezone countdowns/dates should be interpreted in.
-- Defaulted to America/New_York (Eastern) rather than UTC so existing rows
-- (every current user_settings row predates this column) get a sensible
-- default instead of silently reading as UTC.

ALTER TABLE user_settings ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
