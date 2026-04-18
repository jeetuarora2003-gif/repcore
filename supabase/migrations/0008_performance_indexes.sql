-- Performance Optimization: Database Indexes
-- These indexes prevent "Full Table Scans" by ensuring queries filtered by gym_id 
-- use high-speed B-Tree lookups.

-- members table
CREATE INDEX IF NOT EXISTS idx_members_gym_id 
  ON public.members(gym_id);

-- subscriptions table
CREATE INDEX IF NOT EXISTS idx_subscriptions_gym_id 
  ON public.subscriptions(gym_id);

-- attendance_logs table (Composite index for dashboard speed)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_gym_date 
  ON public.attendance_logs(gym_id, check_in_date DESC);

-- payments table (Composite index for financial reporting)
CREATE INDEX IF NOT EXISTS idx_payments_gym_created 
  ON public.payments(gym_id, created_at DESC);

-- invoices table
CREATE INDEX IF NOT EXISTS idx_invoices_gym_id 
  ON public.invoices(gym_id);

-- message_logs table
CREATE INDEX IF NOT EXISTS idx_message_logs_gym_id
  ON public.message_logs(gym_id);
