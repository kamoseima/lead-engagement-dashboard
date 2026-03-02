-- Campaign Scheduling
-- Adds granular scheduling columns to the campaigns table for
-- recurring/interval-based sends with multiple daily time slots.

ALTER TABLE campaigns
  ADD COLUMN schedule_type text NOT NULL DEFAULT 'immediate',
  ADD COLUMN send_mode text NOT NULL DEFAULT 'all_at_once',
  ADD COLUMN frequency text,
  ADD COLUMN frequency_interval integer DEFAULT 1,
  ADD COLUMN sends_per_day integer DEFAULT 1,
  ADD COLUMN send_times text[] DEFAULT '{}',
  ADD COLUMN recurrence_end_at timestamptz;

COMMENT ON COLUMN campaigns.schedule_type IS 'immediate | once | recurring';
COMMENT ON COLUMN campaigns.send_mode IS 'all_at_once (resend same recipients) | batched (split across windows)';
COMMENT ON COLUMN campaigns.frequency IS 'daily | weekly | monthly (only for recurring)';
COMMENT ON COLUMN campaigns.frequency_interval IS 'Every N frequency units (e.g. every 2 weeks)';
COMMENT ON COLUMN campaigns.sends_per_day IS 'Number of sends per active day (1-5)';
COMMENT ON COLUMN campaigns.send_times IS 'Array of HH:MM time strings for each daily send';
COMMENT ON COLUMN campaigns.recurrence_end_at IS 'When the recurring schedule stops (null = no end)';
