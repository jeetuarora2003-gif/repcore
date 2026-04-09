create or replace function public.require_auth_uid()
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  return v_user_id;
end;
$$;

create or replace function public.require_gym_access(target_gym_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.require_auth_uid();

  if not public.can_access_gym(target_gym_id) then
    raise exception 'You do not have access to this gym';
  end if;

  return v_user_id;
end;
$$;

create or replace function public.require_gym_owner_access(target_gym_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  v_user_id := public.require_auth_uid();

  if not public.is_gym_owner(target_gym_id) then
    raise exception 'Owner access is required for this action';
  end if;

  return v_user_id;
end;
$$;

create or replace function public.next_invoice_number(p_gym_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_gym_id::text || ':invoice_number'));

  select gs.invoice_prefix
  into v_prefix
  from public.gym_settings gs
  where gs.gym_id = p_gym_id;

  if v_prefix is null then
    v_prefix := 'INV';
  end if;

  select coalesce(count(*), 0) + 1
  into v_next_number
  from public.invoices i
  where i.gym_id = p_gym_id;

  return v_prefix || '-' || lpad(v_next_number::text, 6, '0');
end;
$$;

create or replace function public.next_receipt_number(p_gym_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_next_number integer;
begin
  perform pg_advisory_xact_lock(hashtext(p_gym_id::text || ':receipt_number'));

  select gs.receipt_prefix
  into v_prefix
  from public.gym_settings gs
  where gs.gym_id = p_gym_id;

  if v_prefix is null then
    v_prefix := 'RCP';
  end if;

  select coalesce(count(*), 0) + 1
  into v_next_number
  from public.receipts r
  where r.gym_id = p_gym_id;

  return v_prefix || '-' || lpad(v_next_number::text, 6, '0');
end;
$$;

create or replace function public.sync_subscription_runtime_status(p_subscription_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.subscription_status;
  v_effective_end_date date;
  v_has_current_freeze boolean;
begin
  select s.status, vsed.effective_end_date
  into v_status, v_effective_end_date
  from public.subscriptions s
  join public.v_subscription_effective_dates vsed
    on vsed.subscription_id = s.id
  where s.id = p_subscription_id;

  if v_status is null then
    return;
  end if;

  if v_status not in ('active', 'frozen', 'scheduled') then
    return;
  end if;

  if v_status = 'scheduled' then
    return;
  end if;

  if v_effective_end_date < current_date then
    update public.subscriptions
    set status = 'expired'
    where id = p_subscription_id
      and status in ('active', 'frozen');

    return;
  end if;

  select exists (
    select 1
    from public.subscription_freezes sf
    where sf.subscription_id = p_subscription_id
      and current_date between sf.freeze_start_date and sf.freeze_end_date
  )
  into v_has_current_freeze;

  update public.subscriptions
  set status = case when v_has_current_freeze then 'frozen' else 'active' end
  where id = p_subscription_id
    and status in ('active', 'frozen');
end;
$$;

create or replace function public.sync_membership_runtime_statuses(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record record;
  v_live_exists boolean;
begin
  for v_record in
    select s.id, s.status, s.start_date
    from public.subscriptions s
    where s.membership_id = p_membership_id
      and s.status in ('scheduled', 'active', 'frozen')
    order by s.start_date asc, s.created_at asc
  loop
    if v_record.status = 'scheduled' and v_record.start_date <= current_date then
      select exists (
        select 1
        from public.v_subscription_effective_dates vsed
        join public.subscriptions live
          on live.id = vsed.subscription_id
        where live.membership_id = p_membership_id
          and live.id <> v_record.id
          and live.status in ('active', 'frozen')
          and vsed.effective_end_date >= current_date
      )
      into v_live_exists;

      if not v_live_exists then
        update public.subscriptions
        set status = 'active'
        where id = v_record.id
          and status = 'scheduled';
      end if;
    end if;

    perform public.sync_subscription_runtime_status(v_record.id);
  end loop;
end;
$$;

create or replace function public.complete_onboarding(
  p_org_name text,
  p_gym_name text,
  p_phone text,
  p_address text,
  p_timezone text,
  p_first_plan_name text,
  p_first_plan_duration_days integer,
  p_first_plan_price_paise integer,
  p_renewal_mode public.renewal_mode,
  p_gst_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_org_id uuid;
  v_gym_id uuid;
  v_plan_id uuid;
begin
  v_user_id := public.require_auth_uid();

  if exists (
    select 1
    from public.gym_users gu
    where gu.user_id = v_user_id
      and gu.is_active = true
  ) then
    raise exception 'This user is already linked to a gym';
  end if;

  insert into public.organizations (name)
  values (trim(p_org_name))
  returning id into v_org_id;

  insert into public.gyms (
    organization_id,
    name,
    phone,
    address,
    timezone
  )
  values (
    v_org_id,
    trim(p_gym_name),
    trim(p_phone),
    nullif(trim(coalesce(p_address, '')), ''),
    coalesce(nullif(trim(coalesce(p_timezone, '')), ''), 'Asia/Kolkata')
  )
  returning id into v_gym_id;

  insert into public.gym_users (user_id, gym_id, role, is_active)
  values (v_user_id, v_gym_id, 'owner', true);

  insert into public.gym_settings (
    gym_id,
    renewal_mode,
    gst_enabled
  )
  values (
    v_gym_id,
    coalesce(p_renewal_mode, 'continue_from_last_end'),
    coalesce(p_gst_enabled, false)
  );

  insert into public.gym_subscriptions (
    gym_id,
    tier,
    status,
    current_period_start
  )
  values (
    v_gym_id,
    'basic',
    'active',
    current_date
  );

  insert into public.membership_plans (
    gym_id,
    name,
    duration_days,
    price_paise,
    is_active
  )
  values (
    v_gym_id,
    trim(p_first_plan_name),
    p_first_plan_duration_days,
    p_first_plan_price_paise,
    true
  )
  returning id into v_plan_id;

  insert into public.reminder_templates (gym_id, template_type, body, is_active)
  values
    (
      v_gym_id,
      'fee_due',
      'Hi [Name], you have pending dues at [Gym Name]. Please clear them to continue. Contact: [Phone]',
      true
    ),
    (
      v_gym_id,
      'membership_expiry',
      'Hi [Name], your membership at [Gym Name] expires on [Date]. Please renew to continue. Contact: [Phone]',
      true
    ),
    (
      v_gym_id,
      'welcome',
      'Hi [Name], welcome to [Gym Name]. Your membership starts on [Date]. Contact: [Phone]',
      true
    );

  return jsonb_build_object(
    'organization_id', v_org_id,
    'gym_id', v_gym_id,
    'plan_id', v_plan_id
  );
end;
$$;

create or replace function public.create_membership_sale(
  p_gym_id uuid,
  p_member_id uuid,
  p_member_name text,
  p_phone text,
  p_photo_url text,
  p_notes text,
  p_plan_id uuid,
  p_start_date date,
  p_invoice_reason public.invoice_reason
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_member_id uuid;
  v_membership_id uuid;
  v_previous_subscription_id uuid;
  v_subscription_id uuid;
  v_invoice_id uuid;
  v_invoice_number text;
  v_plan_name text;
  v_plan_duration_days integer;
  v_plan_price_paise integer;
  v_subscription_status public.subscription_status;
begin
  v_user_id := public.require_gym_access(p_gym_id);

  if p_invoice_reason not in ('new_join', 'rejoin') then
    raise exception 'Membership sale reason must be new_join or rejoin';
  end if;

  select mp.name, mp.duration_days, mp.price_paise
  into v_plan_name, v_plan_duration_days, v_plan_price_paise
  from public.membership_plans mp
  where mp.id = p_plan_id
    and mp.gym_id = p_gym_id
    and mp.is_active = true;

  if v_plan_name is null then
    raise exception 'Membership plan not found';
  end if;

  if p_member_id is null then
    insert into public.members (
      gym_id,
      full_name,
      phone,
      photo_url,
      notes,
      joined_on,
      created_by
    )
    values (
      p_gym_id,
      trim(p_member_name),
      trim(p_phone),
      nullif(trim(coalesce(p_photo_url, '')), ''),
      nullif(trim(coalesce(p_notes, '')), ''),
      p_start_date,
      v_user_id
    )
    returning id into v_member_id;

    insert into public.memberships (
      gym_id,
      member_id,
      started_on
    )
    values (
      p_gym_id,
      v_member_id,
      p_start_date
    )
    returning id into v_membership_id;
  else
    if p_invoice_reason <> 'rejoin' then
      raise exception 'Existing members must use rejoin as the sale reason';
    end if;

    select m.id, ms.id
    into v_member_id, v_membership_id
    from public.members m
    join public.memberships ms
      on ms.member_id = m.id
     and ms.gym_id = m.gym_id
    where m.id = p_member_id
      and m.gym_id = p_gym_id;

    if v_member_id is null or v_membership_id is null then
      raise exception 'Existing member not found in this gym';
    end if;

    update public.members
    set
      full_name = trim(p_member_name),
      phone = trim(p_phone),
      photo_url = nullif(trim(coalesce(p_photo_url, '')), ''),
      notes = nullif(trim(coalesce(p_notes, '')), '')
    where id = v_member_id
      and gym_id = p_gym_id;

    update public.memberships
    set
      archived_at = null,
      archive_reason = null
    where id = v_membership_id
      and gym_id = p_gym_id;

    perform public.sync_membership_runtime_statuses(v_membership_id);
  end if;

  if exists (
    select 1
    from public.subscriptions s
    where s.membership_id = v_membership_id
      and s.status in ('scheduled', 'active', 'frozen')
  ) then
    raise exception 'This membership already has a live or scheduled subscription';
  end if;

  select s.id
  into v_previous_subscription_id
  from public.subscriptions s
  where s.membership_id = v_membership_id
  order by s.start_date desc, s.created_at desc
  limit 1;

  if p_start_date > current_date then
    v_subscription_status := 'scheduled';
  else
    v_subscription_status := 'active';
  end if;

  insert into public.subscriptions (
    gym_id,
    membership_id,
    membership_plan_id,
    previous_subscription_id,
    plan_snapshot_name,
    plan_snapshot_duration_days,
    plan_snapshot_price_paise,
    start_date,
    end_date,
    status,
    created_by
  )
  values (
    p_gym_id,
    v_membership_id,
    p_plan_id,
    v_previous_subscription_id,
    v_plan_name,
    v_plan_duration_days,
    v_plan_price_paise,
    p_start_date,
    p_start_date + (v_plan_duration_days - 1),
    v_subscription_status,
    v_user_id
  )
  returning id into v_subscription_id;

  v_invoice_number := public.next_invoice_number(p_gym_id);

  insert into public.invoices (
    gym_id,
    membership_id,
    subscription_id,
    invoice_number,
    reason,
    total_amount_paise,
    issued_on,
    created_by
  )
  values (
    p_gym_id,
    v_membership_id,
    v_subscription_id,
    v_invoice_number,
    p_invoice_reason,
    v_plan_price_paise,
    current_date,
    v_user_id
  )
  returning id into v_invoice_id;

  return jsonb_build_object(
    'member_id', v_member_id,
    'membership_id', v_membership_id,
    'subscription_id', v_subscription_id,
    'invoice_id', v_invoice_id
  );
end;
$$;

create or replace function public.renew_subscription(
  p_gym_id uuid,
  p_membership_id uuid,
  p_plan_id uuid,
  p_start_date date default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_membership_archived_at timestamptz;
  v_renewal_mode public.renewal_mode;
  v_live_subscription_id uuid;
  v_live_effective_end_date date;
  v_latest_subscription_id uuid;
  v_latest_effective_end_date date;
  v_scheduled_subscription_id uuid;
  v_plan_name text;
  v_plan_duration_days integer;
  v_plan_price_paise integer;
  v_new_start_date date;
  v_new_status public.subscription_status;
  v_invoice_id uuid;
  v_invoice_number text;
  v_subscription_id uuid;
begin
  v_user_id := public.require_gym_access(p_gym_id);

  select m.archived_at, gs.renewal_mode
  into v_membership_archived_at, v_renewal_mode
  from public.memberships m
  join public.gym_settings gs
    on gs.gym_id = m.gym_id
  where m.id = p_membership_id
    and m.gym_id = p_gym_id;

  if v_renewal_mode is null then
    raise exception 'Membership not found in this gym';
  end if;

  if v_membership_archived_at is not null then
    raise exception 'Archived memberships must be restored before renewal';
  end if;

  perform public.sync_membership_runtime_statuses(p_membership_id);

  select mp.name, mp.duration_days, mp.price_paise
  into v_plan_name, v_plan_duration_days, v_plan_price_paise
  from public.membership_plans mp
  where mp.id = p_plan_id
    and mp.gym_id = p_gym_id
    and mp.is_active = true;

  if v_plan_name is null then
    raise exception 'Membership plan not found';
  end if;

  select s.id
  into v_scheduled_subscription_id
  from public.subscriptions s
  where s.membership_id = p_membership_id
    and s.status = 'scheduled'
  limit 1;

  if v_scheduled_subscription_id is not null then
    raise exception 'This membership already has a scheduled subscription';
  end if;

  select s.id, vsed.effective_end_date
  into v_live_subscription_id, v_live_effective_end_date
  from public.subscriptions s
  join public.v_subscription_effective_dates vsed
    on vsed.subscription_id = s.id
  where s.membership_id = p_membership_id
    and s.status in ('active', 'frozen')
  order by vsed.effective_end_date desc
  limit 1;

  select s.id, vsed.effective_end_date
  into v_latest_subscription_id, v_latest_effective_end_date
  from public.subscriptions s
  join public.v_subscription_effective_dates vsed
    on vsed.subscription_id = s.id
  where s.membership_id = p_membership_id
  order by vsed.effective_end_date desc, s.start_date desc
  limit 1;

  if v_live_subscription_id is not null then
    v_new_start_date := v_live_effective_end_date + 1;
    v_new_status := 'scheduled';
  elsif v_latest_subscription_id is not null then
    if v_renewal_mode = 'continue_from_last_end' then
      v_new_start_date := v_latest_effective_end_date + 1;
    else
      v_new_start_date := coalesce(p_start_date, current_date);
    end if;

    if v_new_start_date > current_date then
      v_new_status := 'scheduled';
    else
      v_new_status := 'active';
    end if;
  else
    v_new_start_date := coalesce(p_start_date, current_date);
    if v_new_start_date > current_date then
      v_new_status := 'scheduled';
    else
      v_new_status := 'active';
    end if;
  end if;

  insert into public.subscriptions (
    gym_id,
    membership_id,
    membership_plan_id,
    previous_subscription_id,
    plan_snapshot_name,
    plan_snapshot_duration_days,
    plan_snapshot_price_paise,
    start_date,
    end_date,
    status,
    notes,
    created_by
  )
  values (
    p_gym_id,
    p_membership_id,
    p_plan_id,
    coalesce(v_live_subscription_id, v_latest_subscription_id),
    v_plan_name,
    v_plan_duration_days,
    v_plan_price_paise,
    v_new_start_date,
    v_new_start_date + (v_plan_duration_days - 1),
    v_new_status,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id
  )
  returning id into v_subscription_id;

  v_invoice_number := public.next_invoice_number(p_gym_id);

  insert into public.invoices (
    gym_id,
    membership_id,
    subscription_id,
    invoice_number,
    reason,
    total_amount_paise,
    issued_on,
    notes,
    created_by
  )
  values (
    p_gym_id,
    p_membership_id,
    v_subscription_id,
    v_invoice_number,
    'renewal',
    v_plan_price_paise,
    current_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id
  )
  returning id into v_invoice_id;

  return jsonb_build_object(
    'subscription_id', v_subscription_id,
    'invoice_id', v_invoice_id
  );
end;
$$;

create or replace function public.freeze_subscription(
  p_gym_id uuid,
  p_subscription_id uuid,
  p_freeze_start_date date,
  p_freeze_end_date date,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_membership_id uuid;
  v_subscription_status public.subscription_status;
  v_subscription_start_date date;
  v_effective_end_date date;
  v_freeze_id uuid;
  v_freeze_days integer;
begin
  v_user_id := public.require_gym_access(p_gym_id);

  select s.membership_id, s.status, s.start_date, vsed.effective_end_date
  into v_membership_id, v_subscription_status, v_subscription_start_date, v_effective_end_date
  from public.subscriptions s
  join public.v_subscription_effective_dates vsed
    on vsed.subscription_id = s.id
  where s.id = p_subscription_id
    and s.gym_id = p_gym_id;

  if v_membership_id is null then
    raise exception 'Subscription not found in this gym';
  end if;

  perform public.sync_membership_runtime_statuses(v_membership_id);

  select s.status, vsed.effective_end_date
  into v_subscription_status, v_effective_end_date
  from public.subscriptions s
  join public.v_subscription_effective_dates vsed
    on vsed.subscription_id = s.id
  where s.id = p_subscription_id
    and s.gym_id = p_gym_id;

  if v_subscription_status not in ('active', 'frozen') then
    raise exception 'Only active or frozen subscriptions can be paused';
  end if;

  if p_freeze_end_date < p_freeze_start_date then
    raise exception 'Freeze end date must be on or after freeze start date';
  end if;

  if p_freeze_start_date < v_subscription_start_date then
    raise exception 'Freeze cannot start before the subscription starts';
  end if;

  if p_freeze_start_date > v_effective_end_date then
    raise exception 'Freeze cannot start after the effective end date';
  end if;

  insert into public.subscription_freezes (
    gym_id,
    subscription_id,
    freeze_start_date,
    freeze_end_date,
    reason,
    created_by
  )
  values (
    p_gym_id,
    p_subscription_id,
    p_freeze_start_date,
    p_freeze_end_date,
    nullif(trim(coalesce(p_reason, '')), ''),
    v_user_id
  )
  returning id into v_freeze_id;

  v_freeze_days := (p_freeze_end_date - p_freeze_start_date) + 1;

  update public.subscriptions
  set
    start_date = start_date + v_freeze_days,
    end_date = end_date + v_freeze_days
  where membership_id = v_membership_id
    and status = 'scheduled';

  perform public.sync_membership_runtime_statuses(v_membership_id);

  return jsonb_build_object(
    'freeze_id', v_freeze_id,
    'freeze_days', v_freeze_days
  );
end;
$$;

create or replace function public.record_payment_and_allocate(
  p_gym_id uuid,
  p_membership_id uuid,
  p_amount_paise integer,
  p_method public.payment_method,
  p_received_on date,
  p_reference_code text default null,
  p_note text default null,
  p_allocations jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_membership_exists boolean;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_receipt_number text;
  v_allocation_item jsonb;
  v_unallocated_paise integer;
begin
  v_user_id := public.require_gym_access(p_gym_id);

  select exists (
    select 1
    from public.memberships m
    where m.id = p_membership_id
      and m.gym_id = p_gym_id
  )
  into v_membership_exists;

  if not v_membership_exists then
    raise exception 'Membership not found in this gym';
  end if;

  insert into public.payments (
    gym_id,
    membership_id,
    amount_paise,
    method,
    received_on,
    received_at,
    reference_code,
    note,
    recorded_by
  )
  values (
    p_gym_id,
    p_membership_id,
    p_amount_paise,
    p_method,
    p_received_on,
    now(),
    nullif(trim(coalesce(p_reference_code, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    v_user_id
  )
  returning id into v_payment_id;

  for v_allocation_item in
    select value
    from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb))
  loop
    insert into public.payment_allocations (
      gym_id,
      payment_id,
      invoice_id,
      amount_paise,
      is_active
    )
    values (
      p_gym_id,
      v_payment_id,
      (v_allocation_item ->> 'invoice_id')::uuid,
      (v_allocation_item ->> 'amount_paise')::integer,
      true
    );
  end loop;

  select vpb.unallocated_paise
  into v_unallocated_paise
  from public.v_payment_balances vpb
  where vpb.payment_id = v_payment_id;

  if coalesce(v_unallocated_paise, 0) > 0 then
    insert into public.membership_credit_transactions (
      gym_id,
      membership_id,
      payment_id,
      transaction_type,
      amount_paise,
      note,
      created_by
    )
    values (
      p_gym_id,
      p_membership_id,
      v_payment_id,
      'overpayment',
      v_unallocated_paise,
      coalesce(nullif(trim(coalesce(p_note, '')), ''), 'Overpayment credit created from payment'),
      v_user_id
    );
  end if;

  v_receipt_number := public.next_receipt_number(p_gym_id);

  insert into public.receipts (
    gym_id,
    payment_id,
    receipt_number
  )
  values (
    p_gym_id,
    v_payment_id,
    v_receipt_number
  )
  returning id into v_receipt_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number,
    'credit_created_paise', coalesce(v_unallocated_paise, 0)
  );
end;
$$;

create or replace function public.apply_membership_credit(
  p_gym_id uuid,
  p_membership_id uuid,
  p_invoice_id uuid,
  p_amount_paise integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_credit_transaction_id uuid;
begin
  v_user_id := public.require_gym_access(p_gym_id);

  insert into public.membership_credit_transactions (
    gym_id,
    membership_id,
    invoice_id,
    transaction_type,
    amount_paise,
    note,
    created_by
  )
  values (
    p_gym_id,
    p_membership_id,
    p_invoice_id,
    'applied_to_invoice',
    -p_amount_paise,
    nullif(trim(coalesce(p_note, '')), ''),
    v_user_id
  )
  returning id into v_credit_transaction_id;

  return jsonb_build_object(
    'credit_transaction_id', v_credit_transaction_id
  );
end;
$$;

create or replace function public.correct_invoice(
  p_gym_id uuid,
  p_original_invoice_id uuid,
  p_replacement_total_paise integer,
  p_reason text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_original_invoice public.invoices%rowtype;
  v_replacement_invoice_id uuid;
  v_replacement_invoice_number text;
  v_remaining_paise integer;
  v_reallocate_paise integer;
  v_available_credit_paise integer;
  v_credit_to_apply_paise integer;
  v_payment_allocation record;
  v_applied_credit record;
begin
  v_user_id := public.require_gym_owner_access(p_gym_id);

  select *
  into v_original_invoice
  from public.invoices i
  where i.id = p_original_invoice_id
    and i.gym_id = p_gym_id;

  if v_original_invoice.id is null then
    raise exception 'Original invoice not found in this gym';
  end if;

  if v_original_invoice.voided_at is not null then
    raise exception 'Original invoice is already voided';
  end if;

  if exists (
    select 1
    from public.invoice_corrections ic
    where ic.original_invoice_id = p_original_invoice_id
  ) then
    raise exception 'This invoice has already been corrected';
  end if;

  v_replacement_invoice_number := public.next_invoice_number(p_gym_id);

  insert into public.invoices (
    gym_id,
    membership_id,
    subscription_id,
    invoice_number,
    reason,
    total_amount_paise,
    issued_on,
    notes,
    created_by
  )
  values (
    p_gym_id,
    v_original_invoice.membership_id,
    v_original_invoice.subscription_id,
    v_replacement_invoice_number,
    'correction_replacement',
    p_replacement_total_paise,
    current_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_user_id
  )
  returning id into v_replacement_invoice_id;

  update public.invoices
  set
    voided_at = now(),
    void_reason = trim(p_reason)
  where id = p_original_invoice_id
    and gym_id = p_gym_id;

  insert into public.invoice_corrections (
    gym_id,
    original_invoice_id,
    replacement_invoice_id,
    reason,
    created_by
  )
  values (
    p_gym_id,
    p_original_invoice_id,
    v_replacement_invoice_id,
    trim(p_reason),
    v_user_id
  );

  for v_applied_credit in
    select abs(mct.amount_paise) as amount_paise
    from public.membership_credit_transactions mct
    where mct.invoice_id = p_original_invoice_id
      and mct.transaction_type = 'applied_to_invoice'
    order by mct.created_at asc, mct.id asc
  loop
    insert into public.membership_credit_transactions (
      gym_id,
      membership_id,
      transaction_type,
      amount_paise,
      note,
      created_by
    )
    values (
      p_gym_id,
      v_original_invoice.membership_id,
      'invoice_correction',
      v_applied_credit.amount_paise,
      'Credit restored after invoice correction',
      v_user_id
    );
  end loop;

  v_remaining_paise := p_replacement_total_paise;

  for v_payment_allocation in
    select pa.id, pa.payment_id, pa.amount_paise
    from public.payment_allocations pa
    where pa.invoice_id = p_original_invoice_id
      and pa.is_active = true
    order by pa.created_at asc, pa.id asc
  loop
    update public.payment_allocations
    set
      is_active = false,
      voided_at = now(),
      void_reason = 'Reallocated after invoice correction'
    where id = v_payment_allocation.id;

    if v_remaining_paise > 0 then
      v_reallocate_paise := least(v_payment_allocation.amount_paise, v_remaining_paise);

      insert into public.payment_allocations (
        gym_id,
        payment_id,
        invoice_id,
        amount_paise,
        is_active
      )
      values (
        p_gym_id,
        v_payment_allocation.payment_id,
        v_replacement_invoice_id,
        v_reallocate_paise,
        true
      );

      v_remaining_paise := v_remaining_paise - v_reallocate_paise;
    else
      v_reallocate_paise := 0;
    end if;

    if v_payment_allocation.amount_paise - v_reallocate_paise > 0 then
      insert into public.membership_credit_transactions (
        gym_id,
        membership_id,
        payment_id,
        transaction_type,
        amount_paise,
        note,
        created_by
      )
      values (
        p_gym_id,
        v_original_invoice.membership_id,
        v_payment_allocation.payment_id,
        'overpayment',
        v_payment_allocation.amount_paise - v_reallocate_paise,
        'Credit created from invoice correction',
        v_user_id
      );
    end if;
  end loop;

  if v_remaining_paise > 0 then
    select coalesce(sum(mct.amount_paise), 0)
    into v_available_credit_paise
    from public.membership_credit_transactions mct
    where mct.gym_id = p_gym_id
      and mct.membership_id = v_original_invoice.membership_id;

    if v_available_credit_paise > 0 then
      v_credit_to_apply_paise := least(v_available_credit_paise, v_remaining_paise);

      insert into public.membership_credit_transactions (
        gym_id,
        membership_id,
        invoice_id,
        transaction_type,
        amount_paise,
        note,
        created_by
      )
      values (
        p_gym_id,
        v_original_invoice.membership_id,
        v_replacement_invoice_id,
        'applied_to_invoice',
        -v_credit_to_apply_paise,
        'Credit reapplied after invoice correction',
        v_user_id
      );

      v_remaining_paise := v_remaining_paise - v_credit_to_apply_paise;
    end if;
  end if;

  return jsonb_build_object(
    'original_invoice_id', p_original_invoice_id,
    'replacement_invoice_id', v_replacement_invoice_id,
    'remaining_due_paise', v_remaining_paise
  );
end;
$$;

grant execute on function public.complete_onboarding(
  text,
  text,
  text,
  text,
  text,
  text,
  integer,
  integer,
  public.renewal_mode,
  boolean
) to authenticated;

grant execute on function public.create_membership_sale(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  date,
  public.invoice_reason
) to authenticated;

grant execute on function public.renew_subscription(
  uuid,
  uuid,
  uuid,
  date,
  text
) to authenticated;

grant execute on function public.freeze_subscription(
  uuid,
  uuid,
  date,
  date,
  text
) to authenticated;

grant execute on function public.record_payment_and_allocate(
  uuid,
  uuid,
  integer,
  public.payment_method,
  date,
  text,
  text,
  jsonb
) to authenticated;

grant execute on function public.apply_membership_credit(
  uuid,
  uuid,
  uuid,
  integer,
  text
) to authenticated;

grant execute on function public.correct_invoice(
  uuid,
  uuid,
  integer,
  text,
  text
) to authenticated;
