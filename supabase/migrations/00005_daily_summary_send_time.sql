-- Per-store configurable send time for the daily-summary chat message.
-- Bars close at different hours (some 04:00, some 22:00); the previous
-- 06:00 hardcoded send time only suited overnight bars closing at 06:00.
-- The cron will switch to hourly and pick stores whose send_time matches
-- the current Bangkok hour.

ALTER TABLE store_settings
  ADD COLUMN IF NOT EXISTS chat_bot_daily_summary_send_time TIME
    NOT NULL DEFAULT '06:00:00';

-- Server-side validation: send_time must fall AFTER close and BEFORE the
-- next open (i.e. while the bar is closed). Without this, a bad upsert
-- via API/SQL could schedule the cron to fire mid-shift, summarising a
-- shift that hasn't ended yet. The client-side validator in
-- bot-settings-dialog enforces the same rule for UX, this trigger
-- enforces it as DB invariant.
--
-- Logic mirrors validateSendTime() in bot-settings-dialog.tsx:
--   overnight (close < open):   valid iff close_min <= send < open_min
--   same-day  (open  < close):  valid iff send >= close OR send < open
--                                       (i.e. NOT inside open hours)
--   24h shop  (close = open):   any send_time is valid
CREATE OR REPLACE FUNCTION validate_daily_summary_send_time()
RETURNS TRIGGER AS $$
DECLARE
  open_min  INTEGER;
  close_min INTEGER;
  send_min  INTEGER;
BEGIN
  -- Disabled stores aren't constrained — flipping the toggle off is a
  -- valid escape hatch when reconfiguring hours.
  IF NOT NEW.chat_bot_daily_summary_enabled THEN
    RETURN NEW;
  END IF;

  open_min := COALESCE((NEW.print_server_working_hours->>'startHour')::int, 12) * 60
            + COALESCE((NEW.print_server_working_hours->>'startMinute')::int, 0);
  close_min := COALESCE((NEW.print_server_working_hours->>'endHour')::int, 6) * 60
             + COALESCE((NEW.print_server_working_hours->>'endMinute')::int, 0);
  send_min := EXTRACT(HOUR FROM NEW.chat_bot_daily_summary_send_time)::int * 60
            + EXTRACT(MINUTE FROM NEW.chat_bot_daily_summary_send_time)::int;

  IF close_min = open_min THEN
    -- 24h or zero-hour shop — no constraint.
    RETURN NEW;
  ELSIF close_min < open_min THEN
    -- Overnight bar: valid window is [close, open).
    IF send_min < close_min OR send_min >= open_min THEN
      RAISE EXCEPTION
        'chat_bot_daily_summary_send_time (%) must be between close (%) and next open (%) for overnight stores',
        NEW.chat_bot_daily_summary_send_time, close_min, open_min
        USING ERRCODE = 'check_violation';
    END IF;
  ELSE
    -- Same-day shop: valid iff send is OUTSIDE [open, close).
    IF send_min >= open_min AND send_min < close_min THEN
      RAISE EXCEPTION
        'chat_bot_daily_summary_send_time (%) must be outside open hours (% – %)',
        NEW.chat_bot_daily_summary_send_time, open_min, close_min
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_daily_summary_send_time ON store_settings;
CREATE TRIGGER trg_validate_daily_summary_send_time
  BEFORE INSERT OR UPDATE OF
    chat_bot_daily_summary_send_time,
    chat_bot_daily_summary_enabled,
    print_server_working_hours
  ON store_settings
  FOR EACH ROW
  EXECUTE FUNCTION validate_daily_summary_send_time();
