-- Create member_body_logs table
create table public.member_body_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  membership_id uuid not null references public.memberships(id) on delete cascade,
  weight_kg decimal(5, 2),
  body_fat_percentage decimal(4, 2),
  chest_cm decimal(5, 2),
  waist_cm decimal(5, 2),
  biceps_cm decimal(5, 2),
  recorded_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_body_logs enable row level security;

create policy member_body_logs_select on public.member_body_logs
for select using (public.can_access_gym(gym_id));

create policy member_body_logs_insert on public.member_body_logs
for insert with check (public.can_access_gym(gym_id));

create table public.gym_staff (
    id uuid primary key default gen_random_uuid(),
    gym_id uuid not null references public.gyms(id) on delete cascade,
    full_name text not null,
    phone text,
    role text not null default 'staff',
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

alter table public.gym_staff enable row level security;

create policy gym_staff_select on public.gym_staff
for select using (public.can_access_gym(gym_id));
