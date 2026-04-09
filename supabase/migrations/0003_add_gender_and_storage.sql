-- 1. Add gender to members table
alter table public.members 
add column gender text check (gender in ('male', 'female', 'other'));

-- 2. Update the create_membership_sale RPC to include gender
drop function if exists public.create_membership_sale;

create or replace function public.create_membership_sale(
  p_gym_id uuid,
  p_member_id uuid,
  p_member_name text,
  p_phone text,
  p_photo_url text,
  p_gender text,
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
  v_plan_name text;
  v_plan_duration_days integer;
  v_plan_price_paise integer;
  v_subscription_status public.subscription_status;
  v_subscription_id uuid;
  v_invoice_number text;
  v_invoice_id uuid;
begin
  v_user_id := public.require_gym_access(p_gym_id);

  select mp.name, mp.duration_days, mp.price_paise
  into v_plan_name, v_plan_duration_days, v_plan_price_paise
  from public.membership_plans mp
  where mp.id = p_plan_id
    and mp.gym_id = p_gym_id
    and mp.is_active = true;

  if v_plan_name is null then
    raise exception 'Membership plan not found';
  end if;

  if p_start_date > current_date then
    v_subscription_status := 'scheduled';
  else
    v_subscription_status := 'active';
  end if;

  if p_member_id is null then
    insert into public.members (
      gym_id,
      full_name,
      phone,
      photo_url,
      gender,
      notes,
      joined_on,
      created_by
    )
    values (
      p_gym_id,
      trim(p_member_name),
      trim(p_phone),
      nullif(trim(coalesce(p_photo_url, '')), ''),
      nullif(trim(coalesce(p_gender, '')), ''),
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

    v_member_id := p_member_id;

    select m.id
    into v_membership_id
    from public.memberships m
    where m.member_id = v_member_id
      and m.gym_id = p_gym_id;

    if v_membership_id is null then
      raise exception 'Membership not found for this member';
    end if;

    update public.memberships
    set archived_at = null, archive_reason = null
    where id = v_membership_id;

    select s.id
    into v_previous_subscription_id
    from public.subscriptions s
    join public.v_subscription_effective_dates vsed
      on vsed.subscription_id = s.id
    where s.membership_id = v_membership_id
    order by vsed.effective_end_date desc
    limit 1;
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

grant execute on function public.create_membership_sale(
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  text,
  uuid,
  date,
  public.invoice_reason
) to authenticated;

-- 3. Storage Setup for avatars and logos
insert into storage.buckets (id, name, public) values ('gym_logos', 'gym_logos', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('member_photos', 'member_photos', true) on conflict do nothing;

create policy "Publicly readable gym_logos" on storage.objects for select using (bucket_id = 'gym_logos');
create policy "Publicly readable member_photos" on storage.objects for select using (bucket_id = 'member_photos');

create policy "Authenticated users can upload gym_logos" on storage.objects for insert with check (bucket_id = 'gym_logos' and auth.role() = 'authenticated');
create policy "Authenticated users can upload member_photos" on storage.objects for insert with check (bucket_id = 'member_photos' and auth.role() = 'authenticated');
create policy "Authenticated users can update member_photos" on storage.objects for update with check (bucket_id = 'member_photos' and auth.role() = 'authenticated');
create policy "Authenticated users can update gym_logos" on storage.objects for update with check (bucket_id = 'gym_logos' and auth.role() = 'authenticated');
