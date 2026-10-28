create or replace function public.register_laptop(
  p_asset_id text,
  p_laptop_name text,
  p_serial_number text default null,
  p_operating_system text default null,
  p_browser_type text default null,
  p_notes text default null,
  p_employee_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_laptop_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'Only administrators can register company laptops';
  end if;

  if p_asset_id is null or trim(p_asset_id) = '' or p_laptop_name is null or trim(p_laptop_name) = '' then
    raise exception 'Asset ID and laptop name are required';
  end if;

  insert into laptops (
    asset_id,
    laptop_name,
    serial_number,
    operating_system,
    browser_type,
    notes,
    assigned_employee_id,
    registration_status,
    device_enrollment_status,
    created_at,
    updated_at
  )
  values (
    trim(p_asset_id),
    trim(p_laptop_name),
    p_serial_number,
    p_operating_system,
    p_browser_type,
    p_notes,
    p_employee_id,
    'registered',
    'pending',
    now(),
    now()
  )
  returning id into v_laptop_id;

  insert into audit_logs (actor_id, entity_type, entity_id, action, details)
  values (auth.uid(), 'laptops', v_laptop_id, 'laptop_registered', jsonb_build_object(
    'asset_id', trim(p_asset_id),
    'laptop_name', trim(p_laptop_name),
    'assigned_employee_id', p_employee_id
  ));

  return v_laptop_id;
end;
$$;

create or replace function public.assign_blocking_schedule(
  p_schedule_id uuid,
  p_employee_id uuid default null,
  p_laptop_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment_id uuid;
begin
  if not public.is_admin_user() then
    raise exception 'Only administrators may assign blocking schedules';
  end if;

  if p_schedule_id is null then
    raise exception 'Schedule ID is required';
  end if;

  if p_employee_id is null and p_laptop_id is null then
    raise exception 'Provide either an employee or laptop assignment target';
  end if;

  if p_employee_id is not null and not exists (select 1 from profiles where id = p_employee_id) then
    raise exception 'Employee was not found';
  end if;

  if p_laptop_id is not null and not exists (select 1 from laptops where id = p_laptop_id) then
    raise exception 'Laptop was not found';
  end if;

  insert into schedule_assignments (
    schedule_id,
    employee_id,
    laptop_id,
    assigned_by,
    assigned_at,
    is_active
  )
  values (
    p_schedule_id,
    p_employee_id,
    p_laptop_id,
    auth.uid(),
    now(),
    true
  )
  returning id into v_assignment_id;

  insert into audit_logs (actor_id, entity_type, entity_id, action, details)
  values (auth.uid(), 'schedule_assignments', v_assignment_id, 'schedule_assigned', jsonb_build_object(
    'schedule_id', p_schedule_id,
    'employee_id', p_employee_id,
    'laptop_id', p_laptop_id
  ));

  return v_assignment_id;
end;
$$;

create or replace function public.submit_laptop_change_request(
  p_employee_id uuid,
  p_current_laptop_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_employee_id is null or p_current_laptop_id is null or p_reason is null or trim(p_reason) = '' then
    raise exception 'Employee, current laptop, and reason are required';
  end if;

  if auth.uid() <> p_employee_id and not public.is_admin_user() then
    raise exception 'You can only create a laptop-change request for your own employee account';
  end if;

  insert into laptop_change_requests (
    employee_id,
    current_laptop_id,
    reason,
    status,
    request_date,
    created_at,
    updated_at
  )
  values (
    p_employee_id,
    p_current_laptop_id,
    trim(p_reason),
    'pending',
    now(),
    now(),
    now()
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

create or replace function public.add_ticket_message(
  p_ticket_id uuid,
  p_message text,
  p_is_internal boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_ticket_id is null or p_message is null or trim(p_message) = '' then
    raise exception 'Ticket ID and message are required';
  end if;

  if not exists (
    select 1 from tickets t
    where t.id = p_ticket_id
      and (
        t.employee_id = auth.uid() or public.is_admin_user()
      )
  ) then
    raise exception 'Ticket access denied';
  end if;

  insert into ticket_messages (
    ticket_id,
    sender_id,
    message,
    is_internal,
    created_at
  )
  values (
    p_ticket_id,
    auth.uid(),
    trim(p_message),
    p_is_internal,
    now()
  )
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create or replace function public.get_usage_summary_for_employee(p_employee_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary jsonb;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if auth.uid() <> p_employee_id and not public.is_admin_user() then
    raise exception 'Access denied';
  end if;

  select jsonb_build_object(
    'tracked_duration_seconds', coalesce((select sum(duration_seconds) from usage_events where employee_id = p_employee_id), 0),
    'daily_usage', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', day_bucket,
        'seconds', seconds_total
      ) order by day_bucket desc)
      from (
        select created_at::date as day_bucket, sum(duration_seconds) as seconds_total
        from usage_events
        where employee_id = p_employee_id
        group by created_at::date
        order by created_at::date desc
        limit 7
      ) s
    ), jsonb_build_array()),
    'top_domains', coalesce((
      select jsonb_agg(jsonb_build_object(
        'domain', domain,
        'count', domain_count
      ))
      from (
        select domain, count(*) as domain_count
        from usage_events
        where employee_id = p_employee_id
        group by domain
        order by count(*) desc
        limit 10
      ) d
    ), jsonb_build_array()),
    'blocked_events', coalesce((select count(*) from usage_events where employee_id = p_employee_id and blocked = true), 0)
  ) into v_summary;

  return coalesce(v_summary, jsonb_build_object(
    'tracked_duration_seconds', 0,
    'daily_usage', jsonb_build_array(),
    'top_domains', jsonb_build_array(),
    'blocked_events', 0
  ));
end;
$$;
