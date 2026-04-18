-- Migration: biometric device integration
-- Add biometric device enrollment ID to members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS biometric_device_id TEXT;

CREATE INDEX IF NOT EXISTS idx_members_biometric_device_id
  ON public.members(gym_id, biometric_device_id);

-- Per-gym secret token used to authenticate push webhooks from devices
ALTER TABLE public.gyms ADD COLUMN IF NOT EXISTS biometric_token TEXT;

-- Generate a unique token for all existing gyms that don't have one
UPDATE public.gyms SET biometric_token = gen_random_uuid()::text WHERE biometric_token IS NULL;

-- Ensure attendance_logs has a source column (may already exist from manual entry)
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Log unmatched device user IDs for manual review
CREATE TABLE IF NOT EXISTS public.biometric_unmatched_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id        UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  raw_device_user_id TEXT NOT NULL,
  raw_datetime  TEXT NOT NULL,
  source        TEXT NOT NULL CHECK (source IN ('push', 'upload')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_biometric_unmatched_gym
  ON public.biometric_unmatched_logs(gym_id, created_at DESC);

ALTER TABLE public.biometric_unmatched_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY biometric_unmatched_select ON public.biometric_unmatched_logs
  FOR SELECT USING (public.can_access_gym(gym_id));

CREATE POLICY biometric_unmatched_insert ON public.biometric_unmatched_logs
  FOR INSERT WITH CHECK (public.can_access_gym(gym_id));

CREATE POLICY biometric_unmatched_delete ON public.biometric_unmatched_logs
  FOR DELETE USING (public.can_access_gym(gym_id));
