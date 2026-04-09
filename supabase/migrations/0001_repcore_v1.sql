-- RepCore V1 Supabase migration
-- Source of truth: PRD + domain rules doc
-- Notes:
-- 1. Multi-table flows such as renewal, invoice correction, payment recording,
--    and freeze should be implemented through RPCs or server-side transactions.
-- 2. Invoice status is derived from balances, not stored.

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

create type public.app_role as enum ('owner', 'front_desk');
create type public.gym_plan_tier as enum ('basic', 'growth');
create type public.gym_subscription_status as enum ('trialing', 'active', 'past_due', 'paused', 'canceled');
create type public.renewal_mode as enum ('continue_from_last_end', 'restart_from_today');
create type public.subscription_status as enum ('scheduled', 'active', 'frozen', 'expired', 'voided');
create type public.invoice_reason as enum ('new_join', 'renewal', 'rejoin', 'correction_replacement');
create type public.payment_status as enum ('recorded', 'voided');
create type public.payment_method as enum ('cash', 'upi', 'bank_transfer', 'card', 'other');
create type public.credit_transaction_type as enum ('overpayment', 'invoice_correction', 'manual_adjustment', 'applied_to_invoice');
create type public.reminder_template_type as enum ('fee_due', 'membership_expiry', 'welcome');
create type public.message_channel as enum ('whatsapp_manual', 'whatsapp_automated');
create type public.message_status as enum ('opened', 'queued', 'sent', 'failed', 'canceled');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text unique,
  phone text not null,
  address text,
  logo_url text,
  gst_number text,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gyms_set_updated_at
before update on public.gyms
for each row execute function public.set_updated_at();

create table public.gym_settings (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  currency_code text not null default 'INR',
  expiring_warning_days integer not null default 7 check (expiring_warning_days between 1 and 30),
  renewal_mode public.renewal_mode not null default 'continue_from_last_end',
  freeze_blocks_checkin boolean not null default true,
  gst_enabled boolean not null default false,
  receipt_prefix text not null default 'RCP',
  invoice_prefix text not null default 'INV',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gym_settings_set_updated_at
before update on public.gym_settings
for each row execute function public.set_updated_at();

create table public.gym_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null unique references public.gyms(id) on delete cascade,
  tier public.gym_plan_tier not null default 'basic',
  status public.gym_subscription_status not null default 'trialing',
  current_period_start date,
  current_period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger gym_subscriptions_set_updated_at
before update on public.gym_subscriptions
for each row execute function public.set_updated_at();

create table public.gym_users (
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, gym_id)
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price_paise integer not null check (price_paise >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, gym_id)
);

create unique index membership_plans_gym_name_uniq
on public.membership_plans (gym_id, lower(name));

create trigger membership_plans_set_updated_at
before update on public.membership_plans
for each row execute function public.set_updated_at();

create table public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  full_name text not null,
  phone text not null,
  photo_url text,
  notes text,
  joined_on date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, gym_id)
);

create index members_gym_phone_idx on public.members (gym_id, phone);
create index members_gym_name_idx on public.members (gym_id, lower(full_name));

create trigger members_set_updated_at
before update on public.members
for each row execute function public.set_updated_at();

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  member_id uuid not null,
  started_on date not null default current_date,
  archived_at timestamptz,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, member_id),
  unique (id, gym_id),
  constraint memberships_member_fk
    foreign key (member_id, gym_id)
    references public.members (id, gym_id)
    on delete restrict
);

create trigger memberships_set_updated_at
before update on public.memberships
for each row execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  membership_id uuid not null,
  membership_plan_id uuid,
  previous_subscription_id uuid,
  plan_snapshot_name text not null,
  plan_snapshot_duration_days integer not null check (plan_snapshot_duration_days > 0),
  plan_snapshot_price_paise integer not null check (plan_snapshot_price_paise >= 0),
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status public.subscription_status not null default 'active',
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, gym_id),
  constraint subscriptions_membership_fk
    foreign key (membership_id, gym_id)
    references public.memberships (id, gym_id)
    on delete restrict,
  constraint subscriptions_membership_plan_fk
    foreign key (membership_plan_id, gym_id)
    references public.membership_plans (id, gym_id)
    on delete set null,
  constraint subscriptions_previous_fk
    foreign key (previous_subscription_id, gym_id)
    references public.subscriptions (id, gym_id)
    on delete set null,
  constraint subscriptions_void_fields_check
    check (
      (voided_at is null and void_reason is null)
      or (voided_at is not null and void_reason is not null)
    )
);

create unique index subscriptions_one_live_per_membership
on public.subscriptions (membership_id)
where status in ('active', 'frozen');

create unique index subscriptions_one_scheduled_per_membership
on public.subscriptions (membership_id)
where status = 'scheduled';

create index subscriptions_membership_status_idx
on public.subscriptions (membership_id, status, start_date desc);

alter table public.subscriptions
add constraint subscriptions_no_overlap
exclude using gist (
  membership_id with =,
  daterange(start_date, end_date + 1, '[)') with &&
)
where (status <> 'voided');

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create table public.subscription_freezes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  subscription_id uuid not null,
  freeze_start_date date not null,
  freeze_end_date date not null check (freeze_end_date >= freeze_start_date),
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint subscription_freezes_subscription_fk
    foreign key (subscription_id, gym_id)
    references public.subscriptions (id, gym_id)
    on delete cascade
);

alter table public.subscription_freezes
add constraint subscription_freezes_no_overlap
exclude using gist (
  subscription_id with =,
  daterange(freeze_start_date, freeze_end_date + 1, '[)') with &&
);

create index subscription_freezes_subscription_idx
on public.subscription_freezes (subscription_id, freeze_start_date);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  membership_id uuid not null,
  subscription_id uuid not null,
  invoice_number text not null,
  reason public.invoice_reason not null,
  total_amount_paise integer not null check (total_amount_paise >= 0),
  issued_on date not null default current_date,
  notes text,
  voided_at timestamptz,
  void_reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, gym_id),
  unique (gym_id, invoice_number),
  constraint invoices_membership_fk
    foreign key (membership_id, gym_id)
    references public.memberships (id, gym_id)
    on delete restrict,
  constraint invoices_subscription_fk
    foreign key (subscription_id, gym_id)
    references public.subscriptions (id, gym_id)
    on delete restrict,
  constraint invoices_void_fields_check
    check (
      (voided_at is null and void_reason is null)
      or (voided_at is not null and void_reason is not null)
    )
);

create index invoices_membership_issued_idx
on public.invoices (membership_id, issued_on desc);

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create table public.invoice_corrections (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  original_invoice_id uuid not null,
  replacement_invoice_id uuid not null,
  reason text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (original_invoice_id),
  unique (replacement_invoice_id),
  constraint invoice_corrections_original_fk
    foreign key (original_invoice_id, gym_id)
    references public.invoices (id, gym_id)
    on delete restrict,
  constraint invoice_corrections_replacement_fk
    foreign key (replacement_invoice_id, gym_id)
    references public.invoices (id, gym_id)
    on delete restrict,
  constraint invoice_corrections_distinct_check
    check (original_invoice_id <> replacement_invoice_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  membership_id uuid not null,
  amount_paise integer not null check (amount_paise > 0),
  method public.payment_method not null,
  status public.payment_status not null default 'recorded',
  received_on date not null default current_date,
  received_at timestamptz not null default now(),
  reference_code text,
  note text,
  recorded_by uuid references auth.users(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  unique (id, gym_id),
  constraint payments_membership_fk
    foreign key (membership_id, gym_id)
    references public.memberships (id, gym_id)
    on delete restrict,
  constraint payments_void_fields_check
    check (
      (status = 'recorded' and voided_at is null and void_reason is null)
      or (status = 'voided' and voided_at is not null and void_reason is not null)
    )
);

create index payments_membership_received_idx
on public.payments (membership_id, received_on desc);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  payment_id uuid not null,
  invoice_id uuid not null,
  amount_paise integer not null check (amount_paise > 0),
  is_active boolean not null default true,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  constraint payment_allocations_payment_fk
    foreign key (payment_id, gym_id)
    references public.payments (id, gym_id)
    on delete restrict,
  constraint payment_allocations_invoice_fk
    foreign key (invoice_id, gym_id)
    references public.invoices (id, gym_id)
    on delete restrict,
  constraint payment_allocations_void_fields_check
    check (
      (is_active = true and voided_at is null and void_reason is null)
      or (is_active = false and voided_at is not null and void_reason is not null)
    )
);

create index payment_allocations_payment_idx
on public.payment_allocations (payment_id)
where is_active = true;

create index payment_allocations_invoice_idx
on public.payment_allocations (invoice_id)
where is_active = true;

create table public.membership_credit_transactions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  membership_id uuid not null,
  invoice_id uuid,
  payment_id uuid,
  transaction_type public.credit_transaction_type not null,
  amount_paise integer not null check (amount_paise <> 0),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint membership_credit_transactions_membership_fk
    foreign key (membership_id, gym_id)
    references public.memberships (id, gym_id)
    on delete restrict,
  constraint membership_credit_transactions_invoice_fk
    foreign key (invoice_id, gym_id)
    references public.invoices (id, gym_id)
    on delete set null,
  constraint membership_credit_transactions_payment_fk
    foreign key (payment_id, gym_id)
    references public.payments (id, gym_id)
    on delete set null,
  constraint membership_credit_transactions_shape_check
    check (
      (transaction_type = 'applied_to_invoice' and amount_paise < 0 and invoice_id is not null)
      or (transaction_type = 'overpayment' and amount_paise > 0 and payment_id is not null)
      or (transaction_type = 'invoice_correction' and amount_paise > 0)
      or (transaction_type = 'manual_adjustment' and amount_paise > 0)
    )
);

create index membership_credit_txn_membership_idx
on public.membership_credit_transactions (membership_id, created_at desc);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  payment_id uuid not null,
  receipt_number text not null,
  file_url text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (payment_id),
  unique (gym_id, receipt_number),
  constraint receipts_payment_fk
    foreign key (payment_id, gym_id)
    references public.payments (id, gym_id)
    on delete restrict
);

create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  membership_id uuid not null,
  check_in_date date not null default current_date,
  checked_in_at timestamptz not null default now(),
  source text not null default 'manual',
  recorded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint attendance_logs_membership_fk
    foreign key (membership_id, gym_id)
    references public.memberships (id, gym_id)
    on delete restrict
);

create unique index attendance_logs_one_checkin_per_day_uniq
on public.attendance_logs (membership_id, check_in_date);

create index attendance_logs_membership_date_idx
on public.attendance_logs (membership_id, check_in_date desc);

create table public.reminder_templates (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  template_type public.reminder_template_type not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, gym_id),
  unique (gym_id, template_type)
);

create trigger reminder_templates_set_updated_at
before update on public.reminder_templates
for each row execute function public.set_updated_at();

create table public.message_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  membership_id uuid not null,
  subscription_id uuid,
  invoice_id uuid,
  template_id uuid,
  channel public.message_channel not null,
  status public.message_status not null,
  recipient_phone text not null,
  rendered_body text not null,
  whatsapp_url text,
  triggered_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint message_logs_membership_fk
    foreign key (membership_id, gym_id)
    references public.memberships (id, gym_id)
    on delete restrict,
  constraint message_logs_subscription_fk
    foreign key (subscription_id, gym_id)
    references public.subscriptions (id, gym_id)
    on delete set null,
  constraint message_logs_invoice_fk
    foreign key (invoice_id, gym_id)
    references public.invoices (id, gym_id)
    on delete set null,
  constraint message_logs_template_fk
    foreign key (template_id, gym_id)
    references public.reminder_templates (id, gym_id)
    on delete set null
);

create index message_logs_membership_created_idx
on public.message_logs (membership_id, created_at desc);

create or replace function public.validate_invoice_correction()
returns trigger
language plpgsql
as $$
declare
  original_membership_id uuid;
  replacement_membership_id uuid;
  original_voided_at timestamptz;
  replacement_reason public.invoice_reason;
begin
  select membership_id, voided_at
  into original_membership_id, original_voided_at
  from public.invoices
  where id = new.original_invoice_id
    and gym_id = new.gym_id;

  select membership_id, reason
  into replacement_membership_id, replacement_reason
  from public.invoices
  where id = new.replacement_invoice_id
    and gym_id = new.gym_id;

  if original_membership_id is null or replacement_membership_id is null then
    raise exception 'Invoice correction references missing invoices';
  end if;

  if original_membership_id <> replacement_membership_id then
    raise exception 'Original and replacement invoices must belong to the same membership';
  end if;

  if original_voided_at is null then
    raise exception 'Original invoice must be voided before creating an invoice correction record';
  end if;

  if replacement_reason <> 'correction_replacement' then
    raise exception 'Replacement invoice must use reason correction_replacement';
  end if;

  return new;
end;
$$;

create trigger invoice_corrections_validate
before insert or update on public.invoice_corrections
for each row execute function public.validate_invoice_correction();

create or replace function public.validate_payment_allocation()
returns trigger
language plpgsql
as $$
declare
  payment_total integer;
  payment_membership_id uuid;
  invoice_total integer;
  invoice_membership_id uuid;
  invoice_voided_at timestamptz;
  already_allocated_for_payment integer;
  already_allocated_for_invoice integer;
  already_applied_credit_for_invoice integer;
begin
  select p.amount_paise, p.membership_id
  into payment_total, payment_membership_id
  from public.payments p
  where p.id = new.payment_id
    and p.gym_id = new.gym_id
    and p.status = 'recorded';

  if payment_total is null then
    raise exception 'Payment is missing or not recorded';
  end if;

  select i.total_amount_paise, i.membership_id, i.voided_at
  into invoice_total, invoice_membership_id, invoice_voided_at
  from public.invoices i
  where i.id = new.invoice_id
    and i.gym_id = new.gym_id;

  if invoice_total is null then
    raise exception 'Invoice is missing';
  end if;

  if invoice_voided_at is not null then
    raise exception 'Cannot allocate payment to a voided invoice';
  end if;

  if payment_membership_id <> invoice_membership_id then
    raise exception 'Payment and invoice must belong to the same membership';
  end if;

  select coalesce(sum(pa.amount_paise), 0)
  into already_allocated_for_payment
  from public.payment_allocations pa
  where pa.payment_id = new.payment_id
    and pa.is_active = true
    and (tg_op <> 'UPDATE' or pa.id <> new.id);

  if already_allocated_for_payment + new.amount_paise > payment_total then
    raise exception 'Allocation exceeds payment amount';
  end if;

  select coalesce(sum(pa.amount_paise), 0)
  into already_allocated_for_invoice
  from public.payment_allocations pa
  where pa.invoice_id = new.invoice_id
    and pa.is_active = true
    and (tg_op <> 'UPDATE' or pa.id <> new.id);

  select coalesce(sum(abs(mct.amount_paise)), 0)
  into already_applied_credit_for_invoice
  from public.membership_credit_transactions mct
  where mct.invoice_id = new.invoice_id
    and mct.transaction_type = 'applied_to_invoice';

  if already_allocated_for_invoice + already_applied_credit_for_invoice + new.amount_paise > invoice_total then
    raise exception 'Allocation exceeds invoice balance';
  end if;

  return new;
end;
$$;

create trigger payment_allocations_validate
before insert or update on public.payment_allocations
for each row
when (new.is_active = true)
execute function public.validate_payment_allocation();

create or replace function public.validate_credit_transaction()
returns trigger
language plpgsql
as $$
declare
  current_credit integer;
  payment_total integer;
  payment_membership_id uuid;
  payment_allocated integer;
  payment_credit_created integer;
  invoice_total integer;
  invoice_membership_id uuid;
  invoice_voided_at timestamptz;
  invoice_allocated integer;
  invoice_credit_applied integer;
begin
  if new.transaction_type = 'applied_to_invoice' then
    select coalesce(sum(mct.amount_paise), 0)
    into current_credit
    from public.membership_credit_transactions mct
    where mct.membership_id = new.membership_id
      and (tg_op <> 'UPDATE' or mct.id <> new.id);

    if current_credit + new.amount_paise < 0 then
      raise exception 'Credit application exceeds available membership credit';
    end if;

    select i.total_amount_paise, i.membership_id, i.voided_at
    into invoice_total, invoice_membership_id, invoice_voided_at
    from public.invoices i
    where i.id = new.invoice_id
      and i.gym_id = new.gym_id;

    if invoice_total is null then
      raise exception 'Invoice is missing';
    end if;

    if invoice_voided_at is not null then
      raise exception 'Cannot apply credit to a voided invoice';
    end if;

    if invoice_membership_id <> new.membership_id then
      raise exception 'Credit can only be applied to an invoice for the same membership';
    end if;

    select coalesce(sum(pa.amount_paise), 0)
    into invoice_allocated
    from public.payment_allocations pa
    where pa.invoice_id = new.invoice_id
      and pa.is_active = true;

    select coalesce(sum(abs(mct.amount_paise)), 0)
    into invoice_credit_applied
    from public.membership_credit_transactions mct
    where mct.invoice_id = new.invoice_id
      and mct.transaction_type = 'applied_to_invoice'
      and (tg_op <> 'UPDATE' or mct.id <> new.id);

    if invoice_allocated + invoice_credit_applied + abs(new.amount_paise) > invoice_total then
      raise exception 'Applied credit exceeds invoice balance';
    end if;
  elsif new.transaction_type = 'overpayment' then
    select p.amount_paise, p.membership_id
    into payment_total, payment_membership_id
    from public.payments p
    where p.id = new.payment_id
      and p.gym_id = new.gym_id
      and p.status = 'recorded';

    if payment_total is null then
      raise exception 'Overpayment credit must reference a recorded payment';
    end if;

    if payment_membership_id <> new.membership_id then
      raise exception 'Overpayment credit must stay on the same membership as the payment';
    end if;

    select coalesce(sum(pa.amount_paise), 0)
    into payment_allocated
    from public.payment_allocations pa
    where pa.payment_id = new.payment_id
      and pa.is_active = true;

    select coalesce(sum(mct.amount_paise), 0)
    into payment_credit_created
    from public.membership_credit_transactions mct
    where mct.payment_id = new.payment_id
      and mct.transaction_type = 'overpayment'
      and (tg_op <> 'UPDATE' or mct.id <> new.id);

    if payment_allocated + payment_credit_created + new.amount_paise > payment_total then
      raise exception 'Overpayment credit exceeds payment remainder';
    end if;
  end if;

  return new;
end;
$$;

create trigger membership_credit_transactions_validate
before insert or update on public.membership_credit_transactions
for each row execute function public.validate_credit_transaction();

create or replace function public.protect_invoice_updates()
returns trigger
language plpgsql
as $$
declare
  has_allocations boolean;
  has_credit_applications boolean;
begin
  if tg_op = 'UPDATE' and old.total_amount_paise <> new.total_amount_paise then
    select exists (
      select 1
      from public.payment_allocations pa
      where pa.invoice_id = old.id
        and pa.is_active = true
    )
    into has_allocations;

    select exists (
      select 1
      from public.membership_credit_transactions mct
      where mct.invoice_id = old.id
        and mct.transaction_type = 'applied_to_invoice'
    )
    into has_credit_applications;

    if has_allocations or has_credit_applications then
      raise exception 'Cannot change invoice amount after allocations or applied credit exist';
    end if;
  end if;

  return new;
end;
$$;

create trigger invoices_protect_updates
before update on public.invoices
for each row execute function public.protect_invoice_updates();

create or replace view public.v_subscription_effective_dates as
select
  s.id as subscription_id,
  s.gym_id,
  s.membership_id,
  s.membership_plan_id,
  s.previous_subscription_id,
  s.plan_snapshot_name,
  s.plan_snapshot_duration_days,
  s.plan_snapshot_price_paise,
  s.start_date,
  s.end_date,
  s.status,
  s.created_at,
  coalesce(sum((sf.freeze_end_date - sf.freeze_start_date) + 1), 0)::integer as frozen_days,
  (s.end_date + coalesce(sum((sf.freeze_end_date - sf.freeze_start_date) + 1), 0)::integer) as effective_end_date
from public.subscriptions s
left join public.subscription_freezes sf
  on sf.subscription_id = s.id
group by s.id;

create or replace view public.v_payment_balances as
with credit_created as (
  select
    payment_id,
    coalesce(sum(amount_paise), 0) as credited_paise
  from public.membership_credit_transactions
  where transaction_type = 'overpayment'
    and payment_id is not null
  group by payment_id
)
select
  p.id as payment_id,
  p.gym_id,
  p.membership_id,
  p.amount_paise,
  coalesce(sum(case when pa.is_active then pa.amount_paise else 0 end), 0) as allocated_paise,
  coalesce(cc.credited_paise, 0) as credit_created_paise,
  greatest(
    p.amount_paise
    - coalesce(sum(case when pa.is_active then pa.amount_paise else 0 end), 0)
    - coalesce(cc.credited_paise, 0),
    0
  ) as unallocated_paise
from public.payments p
left join public.payment_allocations pa
  on pa.payment_id = p.id
left join credit_created cc
  on cc.payment_id = p.id
where p.status = 'recorded'
group by p.id, cc.credited_paise;

create or replace view public.v_membership_credit_balances as
select
  membership_id,
  gym_id,
  coalesce(sum(amount_paise), 0) as credit_balance_paise
from public.membership_credit_transactions
group by membership_id, gym_id;

create or replace view public.v_invoice_balances as
with payment_totals as (
  select
    pa.invoice_id,
    coalesce(sum(pa.amount_paise), 0) as payment_allocated_paise
  from public.payment_allocations pa
  join public.payments p
    on p.id = pa.payment_id
  where pa.is_active = true
    and p.status = 'recorded'
  group by pa.invoice_id
),
credit_totals as (
  select
    invoice_id,
    coalesce(sum(abs(amount_paise)), 0) as credit_applied_paise
  from public.membership_credit_transactions
  where transaction_type = 'applied_to_invoice'
    and invoice_id is not null
  group by invoice_id
)
select
  i.id as invoice_id,
  i.gym_id,
  i.membership_id,
  i.subscription_id,
  i.invoice_number,
  i.reason,
  i.total_amount_paise,
  i.issued_on,
  i.voided_at,
  coalesce(pt.payment_allocated_paise, 0) as payment_allocated_paise,
  coalesce(ct.credit_applied_paise, 0) as credit_applied_paise,
  greatest(
    i.total_amount_paise
    - coalesce(pt.payment_allocated_paise, 0)
    - coalesce(ct.credit_applied_paise, 0),
    0
  ) as amount_due_paise,
  case
    when i.voided_at is not null then 'voided'
    when greatest(
      i.total_amount_paise
      - coalesce(pt.payment_allocated_paise, 0)
      - coalesce(ct.credit_applied_paise, 0),
      0
    ) = 0 then 'paid'
    when coalesce(pt.payment_allocated_paise, 0) + coalesce(ct.credit_applied_paise, 0) > 0 then 'partially_paid'
    else 'open'
  end as derived_status
from public.invoices i
left join payment_totals pt
  on pt.invoice_id = i.id
left join credit_totals ct
  on ct.invoice_id = i.id;

create or replace function public.can_access_gym(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = target_gym_id
      and gu.is_active = true
  );
$$;

create or replace function public.is_gym_owner(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gym_users gu
    where gu.user_id = auth.uid()
      and gu.gym_id = target_gym_id
      and gu.role = 'owner'
      and gu.is_active = true
  );
$$;

create or replace function public.can_access_organization(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gyms g
    join public.gym_users gu on gu.gym_id = g.id
    where g.organization_id = target_organization_id
      and gu.user_id = auth.uid()
      and gu.is_active = true
  );
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.gyms g
    join public.gym_users gu on gu.gym_id = g.id
    where g.organization_id = target_organization_id
      and gu.user_id = auth.uid()
      and gu.role = 'owner'
      and gu.is_active = true
  );
$$;

alter table public.organizations enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_settings enable row level security;
alter table public.gym_subscriptions enable row level security;
alter table public.gym_users enable row level security;
alter table public.membership_plans enable row level security;
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_freezes enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_corrections enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.membership_credit_transactions enable row level security;
alter table public.receipts enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.reminder_templates enable row level security;
alter table public.message_logs enable row level security;

create policy organizations_select on public.organizations
for select using (public.can_access_organization(id));

create policy organizations_update_owner on public.organizations
for update using (public.is_organization_owner(id))
with check (public.is_organization_owner(id));

create policy gyms_select on public.gyms
for select using (public.can_access_gym(id));

create policy gyms_update_owner on public.gyms
for update using (public.is_gym_owner(id))
with check (public.is_gym_owner(id));

create policy gym_settings_select on public.gym_settings
for select using (public.can_access_gym(gym_id));

create policy gym_settings_insert_owner on public.gym_settings
for insert with check (public.is_gym_owner(gym_id));

create policy gym_settings_update_owner on public.gym_settings
for update using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

create policy gym_subscriptions_select on public.gym_subscriptions
for select using (public.can_access_gym(gym_id));

create policy gym_subscriptions_insert_owner on public.gym_subscriptions
for insert with check (public.is_gym_owner(gym_id));

create policy gym_subscriptions_update_owner on public.gym_subscriptions
for update using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

create policy gym_users_select on public.gym_users
for select using (public.can_access_gym(gym_id));

create policy gym_users_insert_owner on public.gym_users
for insert with check (public.is_gym_owner(gym_id));

create policy gym_users_update_owner on public.gym_users
for update using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

create policy membership_plans_select on public.membership_plans
for select using (public.can_access_gym(gym_id));

create policy membership_plans_insert_owner on public.membership_plans
for insert with check (public.is_gym_owner(gym_id));

create policy membership_plans_update_owner on public.membership_plans
for update using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

create policy members_select on public.members
for select using (public.can_access_gym(gym_id));

create policy members_insert on public.members
for insert with check (public.can_access_gym(gym_id));

create policy members_update on public.members
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy memberships_select on public.memberships
for select using (public.can_access_gym(gym_id));

create policy memberships_insert on public.memberships
for insert with check (public.can_access_gym(gym_id));

create policy memberships_update on public.memberships
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy subscriptions_select on public.subscriptions
for select using (public.can_access_gym(gym_id));

create policy subscriptions_insert on public.subscriptions
for insert with check (public.can_access_gym(gym_id));

create policy subscriptions_update on public.subscriptions
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy subscription_freezes_select on public.subscription_freezes
for select using (public.can_access_gym(gym_id));

create policy subscription_freezes_insert on public.subscription_freezes
for insert with check (public.can_access_gym(gym_id));

create policy subscription_freezes_update on public.subscription_freezes
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy invoices_select on public.invoices
for select using (public.can_access_gym(gym_id));

create policy invoices_insert on public.invoices
for insert with check (public.can_access_gym(gym_id));

create policy invoices_update on public.invoices
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy invoice_corrections_select on public.invoice_corrections
for select using (public.can_access_gym(gym_id));

create policy invoice_corrections_insert_owner on public.invoice_corrections
for insert with check (public.is_gym_owner(gym_id));

create policy invoice_corrections_update_owner on public.invoice_corrections
for update using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

create policy payments_select on public.payments
for select using (public.can_access_gym(gym_id));

create policy payments_insert on public.payments
for insert with check (public.can_access_gym(gym_id));

create policy payments_update on public.payments
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy payment_allocations_select on public.payment_allocations
for select using (public.can_access_gym(gym_id));

create policy payment_allocations_insert on public.payment_allocations
for insert with check (public.can_access_gym(gym_id));

create policy payment_allocations_update on public.payment_allocations
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy membership_credit_transactions_select on public.membership_credit_transactions
for select using (public.can_access_gym(gym_id));

create policy membership_credit_transactions_insert on public.membership_credit_transactions
for insert with check (public.can_access_gym(gym_id));

create policy membership_credit_transactions_update on public.membership_credit_transactions
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy receipts_select on public.receipts
for select using (public.can_access_gym(gym_id));

create policy receipts_insert on public.receipts
for insert with check (public.can_access_gym(gym_id));

create policy receipts_update on public.receipts
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy attendance_logs_select on public.attendance_logs
for select using (public.can_access_gym(gym_id));

create policy attendance_logs_insert on public.attendance_logs
for insert with check (public.can_access_gym(gym_id));

create policy attendance_logs_update on public.attendance_logs
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));

create policy reminder_templates_select on public.reminder_templates
for select using (public.can_access_gym(gym_id));

create policy reminder_templates_insert_owner on public.reminder_templates
for insert with check (public.is_gym_owner(gym_id));

create policy reminder_templates_update_owner on public.reminder_templates
for update using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

create policy message_logs_select on public.message_logs
for select using (public.can_access_gym(gym_id));

create policy message_logs_insert on public.message_logs
for insert with check (public.can_access_gym(gym_id));

create policy message_logs_update on public.message_logs
for update using (public.can_access_gym(gym_id))
with check (public.can_access_gym(gym_id));
