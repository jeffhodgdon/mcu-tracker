-- Makes (item_id, episode_number) unique on episodes, so seed/episodes.sql
-- (now INSERT OR IGNORE) can be re-run without duplicating every episode.
--
-- Any duplicates a previous re-run already created are removed first,
-- keeping the lowest id per (item_id, episode_number) — the original row,
-- and the one handleAdminReplaceEpisodes already treats as canonical.
--
-- watch_status.episode_id points at episodes.id, so a user's mark on a
-- duplicate is moved onto the kept episode before the duplicate goes. OR
-- IGNORE skips the move when the user already has a row for the kept
-- episode; that row wins, and the leftover duplicate mark is deleted below.
--
-- Plain subqueries rather than a temp table of duplicate ids: D1 does not
-- reliably allow CREATE TEMP TABLE in migrations.

UPDATE OR IGNORE watch_status
   SET episode_id = (
         SELECT MIN(k.id)
           FROM episodes d
           JOIN episodes k ON k.item_id = d.item_id AND k.episode_number = d.episode_number
          WHERE d.id = watch_status.episode_id
       )
 WHERE episode_id IN (
         SELECT e.id FROM episodes e
          WHERE e.id > (SELECT MIN(x.id) FROM episodes x
                         WHERE x.item_id = e.item_id AND x.episode_number = e.episode_number)
       );

DELETE FROM watch_status
 WHERE episode_id IN (
         SELECT e.id FROM episodes e
          WHERE e.id > (SELECT MIN(x.id) FROM episodes x
                         WHERE x.item_id = e.item_id AND x.episode_number = e.episode_number)
       );

DELETE FROM episodes
 WHERE id > (SELECT MIN(x.id) FROM episodes x
              WHERE x.item_id = episodes.item_id AND x.episode_number = episodes.episode_number);

CREATE UNIQUE INDEX episodes_item_episode ON episodes (item_id, episode_number);
