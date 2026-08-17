-- Move authentication to Google OAuth and drop local password storage.
--
-- users.password_hash is removed outright rather than relaxed to nullable.
-- Dropping it means the application cannot store password material even by
-- accident, and there is no always-NULL column left for future code to
-- misread as "this user has a password".
--
-- Tradeoff: adding a local password option later needs a new migration to put
-- the column back. That is cheap, and no existing rows are lost by doing it
-- this way now — the table held only throwaway test accounts, all deleted.
--
-- Sessions are unaffected: they never referenced how a user authenticated, so
-- session rows and the middleware that reads them carry over unchanged.

ALTER TABLE users DROP COLUMN password_hash;
