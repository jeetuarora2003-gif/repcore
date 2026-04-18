-- 0007: Reminders Pipeline — 3-stage date-aware reminder tracking
-- Adds per-subscription reminder timestamps and lapse tracking on memberships.

-- 3-stage reminder tracking columns on subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS reminder_5_sent_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS reminder_3_sent_at TIMESTAMPTZ;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS reminder_1_sent_at TIMESTAMPTZ;

-- Lapse tracking on memberships (mirrors archived_at pattern)
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS lapsed_at TIMESTAMPTZ;
