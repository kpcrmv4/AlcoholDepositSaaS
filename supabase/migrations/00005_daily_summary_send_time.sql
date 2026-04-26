-- Per-store configurable send time for the daily-summary chat message.
-- Bars close at different hours (some 04:00, some 22:00); the previous
-- 06:00 hardcoded send time only suited overnight bars closing at 06:00.
-- The cron will switch to hourly and pick stores whose send_time matches
-- the current Bangkok hour.

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS chat_bot_daily_summary_send_time TIME
    NOT NULL DEFAULT '06:00:00';
