-- Persists the user's preferred sort order for the Build Watch List modal.
ALTER TABLE user_settings ADD COLUMN watchlist_sort TEXT;
