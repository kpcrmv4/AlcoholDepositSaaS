-- Add 'cancelled' to deposit_status + cancelled_by/at columns
-- Fixes: deposit cancelled from chat action card stayed as 'pending_confirm'
-- on the deposit list because there was no terminal status to mark it.

ALTER TYPE deposit_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE deposits
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
