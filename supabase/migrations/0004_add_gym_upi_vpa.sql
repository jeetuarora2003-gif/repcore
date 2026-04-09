-- Add upi_vpa to gyms table
alter table public.gyms 
add column if not exists upi_vpa text;
