create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'account_status') then
    create type public.account_status as enum ('active', 'pending', 'inactive', 'disabled');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum ('open', 'in_progress', 'waiting_for_employee', 'waiting_for_it', 'resolved', 'closed');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_priority') then
    create type public.ticket_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'laptop_status') then
    create type public.laptop_status as enum ('registered', 'assigned', 'unassigned', 'retired', 'inactive');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'schedule_status') then
    create type public.schedule_status as enum ('active', 'paused', 'draft');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'device_status') then
    create type public.device_status as enum ('enrolled', 'pending', 'revoked', 'inactive');
  end if;
end $$;

create table if not exists laptops (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null unique,
  laptop_name text not null,
  serial_number text,
  operating_system text,
  browser_type text,
  registration_status laptop_status not null default 'registered',
  notes text,
  assigned_employee_id uuid,
  device_enrollment_status device_status not null default 'pending',
  last_sync_at timestamptz,
  last_heartbeat_at timestamptz,
  reported_blocking_state boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_id text not null unique,
  full_name text not null,
  work_email text not null unique,
  department text,
  role text not null default 'employee' check (role in ('administrator', 'it_personnel', 'employee')),
  account_status account_status not null default 'pending',
  can_access_admin boolean not null default false,
  assigned_laptop_id uuid references laptops(id),
  assigned_schedule_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists employee_permissions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null unique references profiles(id) on delete cascade,
  can_access_admin boolean not null default false,
  role text not null default 'employee' check (role in ('administrator', 'it_personnel', 'employee')),
  permissions jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists device_enrollments (
  id uuid primary key default gen_random_uuid(),
  laptop_id uuid not null references laptops(id) on delete cascade,
  employee_id uuid references profiles(id) on delete set null,
  browser_type text,
  browser_version text,
  extension_version text,
  enrollment_status device_status not null default 'pending',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laptop_id, employee_id)
);

create table if not exists blocking_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'UTC',
  is_active boolean not null default false,
  status schedule_status not null default 'draft',
  days_of_week integer[] not null default '{1,2,3,4,5}',
  start_time time not null default '09:00:00',
  end_time time not null default '17:00:00',
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists blocked_domains (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references blocking_schedules(id) on delete cascade,
  domain text not null,
  match_subdomains boolean not null default true,
  created_at timestamptz not null default now(),
  unique (schedule_id, domain)
);

create table if not exists schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references blocking_schedules(id) on delete cascade,
  employee_id uuid references profiles(id) on delete cascade,
  laptop_id uuid references laptops(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  is_active boolean not null default true,
  unique (schedule_id, employee_id, laptop_id)
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  laptop_id uuid not null references laptops(id) on delete cascade,
  domain text not null,
  duration_seconds integer not null default 0,
  event_type text not null default 'page_view',
  blocked boolean not null default false,
  device_id text,
  created_at timestamptz not null default now()
);

create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  employee_id uuid references profiles(id) on delete set null,
  laptop_id uuid references laptops(id) on delete set null,
  category text not null check (category in ('laptop_hardware_issue','laptop_performance_issue','internet_issue','browser_issue','website_blocking_issue','extension_error','software_issue','request_change_laptop','other')),
  subject text not null,
  description text not null,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists laptop_change_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  current_laptop_id uuid references laptops(id),
  proposed_laptop_id uuid references laptops(id),
  reason text not null,
  request_date timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','approved','rejected','more_info','completed')),
  admin_decision text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  title text not null,
  body text not null,
  release_date timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists admin_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text default 'light' check (theme in ('light','dark','system')),
  notifications_enabled boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_profiles_employee_id on profiles (employee_id);
create index if not exists idx_profiles_email on profiles (work_email);
create index if not exists idx_laptops_assigned_employee on laptops (assigned_employee_id);
create index if not exists idx_usage_events_employee_created on usage_events (employee_id, created_at desc);
create index if not exists idx_tickets_status on tickets (status);
create index if not exists idx_ticket_messages_ticket on ticket_messages (ticket_id, created_at desc);
create index if not exists idx_laptop_change_requests_employee on laptop_change_requests (employee_id, status);
create index if not exists idx_audit_entity on audit_logs (entity_type, entity_id);

alter table laptops enable row level security;
alter table profiles enable row level security;
alter table employee_permissions enable row level security;
alter table device_enrollments enable row level security;
alter table blocking_schedules enable row level security;
alter table blocked_domains enable row level security;
alter table schedule_assignments enable row level security;
alter table usage_events enable row level security;
alter table tickets enable row level security;
alter table ticket_messages enable row level security;
alter table laptop_change_requests enable row level security;
alter table audit_logs enable row level security;
alter table announcements enable row level security;
alter table admin_preferences enable row level security;

create or replace function public.is_admin_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from profiles p
    where p.id = auth.uid()
      and p.can_access_admin = true
  );
$$;

create or replace function public.get_user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'admins_manage_profiles'
  ) then
    create policy "admins_manage_profiles" on profiles
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'employees_view_own_profile'
  ) then
    create policy "employees_view_own_profile" on profiles
      for select using (auth.uid() = id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'employees_update_own_profile'
  ) then
    create policy "employees_update_own_profile" on profiles
      for update
      using (auth.uid() = id)
      with check (
        auth.uid() = id
        and role = (select role from public.profiles where id = auth.uid())
        and can_access_admin = (select can_access_admin from public.profiles where id = auth.uid())
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'employee_permissions' and policyname = 'admins_manage_employee_permissions'
  ) then
    create policy "admins_manage_employee_permissions" on employee_permissions
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'employee_permissions' and policyname = 'employees_view_own_permission'
  ) then
    create policy "employees_view_own_permission" on employee_permissions
      for select using (employee_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'laptops' and policyname = 'admins_manage_laptops'
  ) then
    create policy "admins_manage_laptops" on laptops
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'laptops' and policyname = 'employees_view_assigned_laptop'
  ) then
    create policy "employees_view_assigned_laptop" on laptops
      for select using (
        assigned_employee_id = auth.uid()
        or public.is_admin_user()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'device_enrollments' and policyname = 'admins_manage_enrollments'
  ) then
    create policy "admins_manage_enrollments" on device_enrollments
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'device_enrollments' and policyname = 'employees_view_own_enrollment'
  ) then
    create policy "employees_view_own_enrollment" on device_enrollments
      for select using (employee_id = auth.uid() or public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'blocking_schedules' and policyname = 'admins_manage_schedules'
  ) then
    create policy "admins_manage_schedules" on blocking_schedules
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'blocking_schedules' and policyname = 'employees_view_assigned_schedules'
  ) then
    create policy "employees_view_assigned_schedules" on blocking_schedules
      for select using (
        exists (
          select 1 from schedule_assignments sa
          where sa.schedule_id = id and (
            sa.employee_id = auth.uid() or sa.laptop_id in (
              select assigned_laptop_id from profiles where id = auth.uid()
            )
          )
        ) or public.is_admin_user()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'blocked_domains' and policyname = 'admins_manage_blocked_domains'
  ) then
    create policy "admins_manage_blocked_domains" on blocked_domains
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'schedule_assignments' and policyname = 'admins_manage_schedule_assignments'
  ) then
    create policy "admins_manage_schedule_assignments" on schedule_assignments
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'schedule_assignments' and policyname = 'employees_view_own_schedule_assignments'
  ) then
    create policy "employees_view_own_schedule_assignments" on schedule_assignments
      for select using (employee_id = auth.uid() or public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'usage_events' and policyname = 'admins_manage_usage_events'
  ) then
    create policy "admins_manage_usage_events" on usage_events
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'usage_events' and policyname = 'employees_view_own_usage_events'
  ) then
    create policy "employees_view_own_usage_events" on usage_events
      for select using (employee_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'tickets' and policyname = 'admins_manage_tickets'
  ) then
    create policy "admins_manage_tickets" on tickets
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'tickets' and policyname = 'employees_manage_own_tickets'
  ) then
    create policy "employees_manage_own_tickets" on tickets
      for insert with check (employee_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'tickets' and policyname = 'employees_view_own_tickets'
  ) then
    create policy "employees_view_own_tickets" on tickets
      for select using (employee_id = auth.uid() or public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'tickets' and policyname = 'employees_update_own_ticket_status'
  ) then
    create policy "employees_update_own_ticket_status" on tickets
      for update using (employee_id = auth.uid()) with check (employee_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'ticket_messages' and policyname = 'admins_manage_ticket_messages'
  ) then
    create policy "admins_manage_ticket_messages" on ticket_messages
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'ticket_messages' and policyname = 'employees_view_own_ticket_messages'
  ) then
    create policy "employees_view_own_ticket_messages" on ticket_messages
      for select using (
        exists (
          select 1 from tickets t
          where t.id = ticket_messages.ticket_id and (t.employee_id = auth.uid() or public.is_admin_user())
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'ticket_messages' and policyname = 'employees_insert_own_ticket_messages'
  ) then
    create policy "employees_insert_own_ticket_messages" on ticket_messages
      for insert with check (
        sender_id = auth.uid() and exists (
          select 1 from tickets t where t.id = ticket_messages.ticket_id and t.employee_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'laptop_change_requests' and policyname = 'admins_manage_laptop_change_requests'
  ) then
    create policy "admins_manage_laptop_change_requests" on laptop_change_requests
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'laptop_change_requests' and policyname = 'employees_view_own_change_requests'
  ) then
    create policy "employees_view_own_change_requests" on laptop_change_requests
      for select using (employee_id = auth.uid() or public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'laptop_change_requests' and policyname = 'employees_submit_own_change_requests'
  ) then
    create policy "employees_submit_own_change_requests" on laptop_change_requests
      for insert with check (employee_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'audit_logs' and policyname = 'admins_read_audit_logs'
  ) then
    create policy "admins_read_audit_logs" on audit_logs
      for select using (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'announcements' and policyname = 'authenticated_users_read_announcements'
  ) then
    create policy "authenticated_users_read_announcements" on announcements
      for select using (auth.uid() is not null and is_active = true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'admin_preferences' and policyname = 'admins_manage_admin_preferences'
  ) then
    create policy "admins_manage_admin_preferences" on admin_preferences
      for all using (public.is_admin_user()) with check (public.is_admin_user());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public' and tablename = 'admin_preferences' and policyname = 'employees_manage_own_preferences'
  ) then
    create policy "employees_manage_own_preferences" on admin_preferences
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

create or replace function public.record_audit_event(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
 insert into audit_logs (actor_id, entity_type, entity_id, action, details)
 values (auth.uid(), p_entity_type, p_entity_id, p_action, p_details);
end;
$$;

create or replace function public.refresh_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles for each row execute procedure public.refresh_updated_at();
create trigger laptops_updated_at before update on laptops for each row execute procedure public.refresh_updated_at();
create trigger device_enrollments_updated_at before update on device_enrollments for each row execute procedure public.refresh_updated_at();
create trigger blocking_schedules_updated_at before update on blocking_schedules for each row execute procedure public.refresh_updated_at();
create trigger schedule_assignments_updated_at before update on schedule_assignments for each row execute procedure public.refresh_updated_at();
create trigger tickets_updated_at before update on tickets for each row execute procedure public.refresh_updated_at();
create trigger laptop_change_requests_updated_at before update on laptop_change_requests for each row execute procedure public.refresh_updated_at();
create trigger admin_preferences_updated_at before update on admin_preferences for each row execute procedure public.refresh_updated_at();
