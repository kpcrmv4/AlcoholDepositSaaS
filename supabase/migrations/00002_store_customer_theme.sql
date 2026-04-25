-- ============================================================================
-- 00002 — Per-store customer LIFF theme
-- ============================================================================
-- Adds `stores.customer_theme` so each branch can pick the visual theme used
-- on the customer-facing LIFF page (deposit list / hero card / FAB / etc.).
--
-- Allowed values map to /preview/{key} mock pages and to the eventual
-- customer page renderer:
--   amber  — Premium dark amber (speakeasy)
--   neon   — Neon nightlife (club)
--   sumi   — Japanese minimal (izakaya)
--   sunset — Tropical sunset (beach bar)
-- ============================================================================

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS customer_theme TEXT DEFAULT 'amber';

ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_customer_theme_check;

ALTER TABLE stores
  ADD CONSTRAINT stores_customer_theme_check
  CHECK (customer_theme IN ('amber', 'neon', 'sumi', 'sunset'));

-- Backfill any nulls so the CHECK constraint passes.
UPDATE stores SET customer_theme = 'amber' WHERE customer_theme IS NULL;
