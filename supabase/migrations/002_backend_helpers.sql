create or replace function public.get_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  summary jsonb;
begin
  if not public.is_admin_user() then
    raise exception 'Admin access required for dashboard metrics';
  end if;

  select jsonb_build_object(
    'total_employees', (select count(*) from profiles),
    'total_laptops', (select count(*) from laptops),
    'active_enrolled_devices', (
      select count(*)
      from device_enrollments
      where enrollment_status = 'enrolled'
    ),
    'devices_with_active_blocking', (
      select count(*)
      from laptops
      where reported_blocking_state = true
    ),
    'unassigned_laptops', (
      select count(*)
      from laptops
      where assigned_employee_id is null
    ),
    'pending_employee_registrations', (
      select count(*)
      from profiles
      where account_status = 'pending'
    ),
    'open_tickets', (
      select count(*)
      from tickets
      where status not in ('resolved', 'closed')
    ),
    'pending_laptop_change_requests', (
      select count(*)
      from laptop_change_requests
      where status = 'pending'
    )
  ) into summary;

  return summary;
end;
$$;

create or replace function public.update_employee_admin_access(
  p_employee_id uuid,
  p_can_access_admin boolean,
  p_role text default 'employee'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Only an administrator may change admin access';
  end if;

  if p_employee_id is null then
    raise exception 'Employee ID is required';
  end if;

  if p_role not in ('administrator', 'it_personnel', 'employee') then
    raise exception 'Role is invalid';
  end if;

  update profiles
     set can_access_admin = p_can_access_admin,
         role = p_role,
         updated_at = now()
   where id = p_employee_id;

  if not found then
    raise exception 'Target employee was not found';
  end if;

  insert into employee_permissions (employee_id, can_access_admin, role, permissions, updated_by, updated_at)
  values (p_employee_id, p_can_access_admin, p_role, jsonb_build_object('can_access_admin', p_can_access_admin, 'role', p_role), auth.uid(), now())
  on conflict (employee_id) do update
     set can_access_admin = excluded.can_access_admin,
         role = excluded.role,
         permissions = excluded.permissions,
         updated_by = excluded.updated_by,
         updated_at = now();

  insert into audit_logs (actor_id, entity_type, entity_id, action, details)
  values (auth.uid(), 'employee_permissions', p_employee_id, 'admin_access_updated', jsonb_build_object(
    'can_access_admin', p_can_access_admin,
    'role', p_role
  ));
end;
$$;

create or replace function public.submit_usage_event(
  p_employee_id uuid,
  p_laptop_id uuid,
  p_domain text,
  p_duration_seconds integer default 0,
  p_event_type text default 'page_view',
  p_blocked boolean default false,
  p_device_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_employee_record record;
  v_enrollment record;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_employee_id is null or p_laptop_id is null or p_domain is null or trim(p_domain) = '' then
    raise exception 'Employee, laptop, and domain are required';
  end if;

  select * into v_employee_record
  from profiles
  where id = p_employee_id and account_status = 'active';

  if not found then
    raise exception 'Employee account is not active';
  end if;

  if auth.uid() <> p_employee_id and not public.is_admin_user() then
    raise exception 'You may only submit usage events for your own employee account';
  end if;

  if not exists (
    select 1
    from laptops
    where id = p_laptop_id and assigned_employee_id = p_employee_id
  ) then
    raise exception 'Laptop assignment is invalid';
  end if;

  select * into v_enrollment
  from device_enrollments
  where laptop_id = p_laptop_id and employee_id = p_employee_id and enrollment_status = 'enrolled';

  if not found then
    raise exception 'Device is not enrolled or is not authorized';
  end if;

  insert into usage_events (
    employee_id,
    laptop_id,
    domain,
    duration_seconds,
    event_type,
    blocked,
    device_id,
    created_at
  )
  values (
    p_employee_id,
    p_laptop_id,
    lower(p_domain),
    coalesce(p_duration_seconds, 0),
    coalesce(p_event_type, 'page_view'),
    coalesce(p_blocked, false),
    p_device_id,
    now()
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.create_ticket_record(
  p_employee_id uuid,
  p_laptop_id uuid,
  p_category text,
  p_subject text,
  p_description text,
  p_priority text default 'medium'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket_id uuid;
  v_ticket_number text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  if p_employee_id is null or p_category is null or p_subject is null or p_description is null then
    raise exception 'Ticket fields are incomplete';
  end if;

  if auth.uid() <> p_employee_id and not public.is_admin_user() then
    raise exception 'You may only create tickets for your own employee account';
  end if;

  v_ticket_number := 'MND-' || to_char(now(), 'YYYYMMDD') || '-' || floor(random() * 900000 + 100000)::text;

  insert into tickets (
    ticket_number,
    employee_id,
    laptop_id,
    category,
    subject,
    description,
    priority,
    status,
    created_at,
    updated_at
  )
  values (
    v_ticket_number,
    p_employee_id,
    p_laptop_id,
    p_category,
    p_subject,
    p_description,
    coalesce(p_priority, 'medium'),
    'open',
    now(),
    now()
  )
  returning id into v_ticket_id;

  return v_ticket_id;
end;
$$;
