-- Fix for Attendance unique constraint
-- We first deduplicate any rows that might exist exactly on the same check_in_date for the same membership.
DELETE FROM public.attendance_logs a USING public.attendance_logs b
WHERE a.id > b.id 
  AND a.membership_id = b.membership_id 
  AND a.check_in_date = b.check_in_date;

-- Now drop the index and add a true postgres unique constraint so upserts work.
DROP INDEX IF EXISTS public.attendance_logs_one_checkin_per_day_uniq;
ALTER TABLE public.attendance_logs ADD CONSTRAINT attendance_logs_one_checkin_per_day_uniq UNIQUE (membership_id, check_in_date);
