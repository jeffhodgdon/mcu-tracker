-- Adds the two fields other_universes was missing relative to items, so the
-- Admin page can audit and edit Other Universes rows the same way it does
-- MCU items: an in-universe chronological position (mirrors items.chrono_order)
-- and a runtime-is-estimated flag (mirrors items.is_estimate). Both default
-- to "no data yet" for every existing row, matching how items started out.

ALTER TABLE other_universes ADD COLUMN chrono_order INTEGER;
ALTER TABLE other_universes ADD COLUMN is_estimate INTEGER NOT NULL DEFAULT 0;
