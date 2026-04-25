-- ============================================================================
-- 00003 — Allow 'crimson' as a customer LIFF theme
-- ============================================================================
-- Extends the CHECK constraint on stores.customer_theme to accept the new
-- 'crimson' theme (deep wine-red background + cream paper accents,
-- wine-bar / bistro vibe).
--
-- Allowed values map to /preview/{key} mock pages and to the customer
-- page renderer:
--   amber   — Premium dark amber (speakeasy)
--   neon    — Neon nightlife (club)
--   sumi    — Japanese minimal (izakaya)
--   sunset  — Tropical sunset (beach bar)
--   crimson — Wine bar (vintage)            ← NEW
-- ============================================================================

ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_customer_theme_check;

ALTER TABLE stores
  ADD CONSTRAINT stores_customer_theme_check
  CHECK (customer_theme IN ('amber', 'neon', 'sumi', 'sunset', 'crimson'));
