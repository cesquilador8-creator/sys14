create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_number text,
  full_name text not null,
  work_email text unique not null,
  department text,
  account_status text not null default 'active' check (account_status in ('active','inactive','suspended')),
  can_access_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  can_manage_employees boolean not null default false,
  can_manage_schedules boolean not null default false,
  can_view_analytics boolean not null default false,
  can_manage_tickets boolean not null default false,
  can_manage_laptops boolean not null default false,
  can_access_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.laptops (
  id uuid primary key default gen_random_uuid(),
  asset_tag text not null unique,
  device_name text not null,
  serial_number text,
  operating_system text,
  browser_name text,
  browser_version text,
  enrollment_status text not null default 'unregistered' check (enrollment_status in ('unregistered','registered','active','revoked','inactive')),
  assigned_employee_id uuid references public.profiles(id),
  registration_date timestamptz not null default now(),
  last_sync_at timestamptz,
  blocking_config_status text not null default 'not_configured' check (blocking_config_status in ('not_configured','configured','error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_enrollments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  laptop_id uuid not null references public.laptops(id) on delete cascade,
  device_id text not null,
  enrollment_status text not null default 'pending' check (enrollment_status in ('pending','active','revoked','inactive')),
  last_successful_sync timestamptz,
  enrolled_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (laptop_id, device_id)
);

create table if not exists public.blocking_schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  enabled boolean not null default true,
  monday boolean not null default false,
  tuesday boolean not null default false,
  wednesday boolean not null default false,
  thursday boolean not null default false,
  friday boolean not null default false,
  saturday boolean not null default false,
  sunday boolean not null default false,
  start_time time not null,
  end_time time not null,
  time_zone text not null default 'UTC',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.blocked_domains (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.blocking_schedules(id) on delete cascade,
  domain text not null,
  normalized_domain text not null,
  created_at timestamptz not null default now(),
  unique (schedule_id, normalized_domain)
);

create table if not exists public.schedule_assignments (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.blocking_schedules(id) on delete cascade,
  employee_id uuid references public.profiles(id),
  laptop_id uuid references public.laptops(id),
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (schedule_id, employee_id, laptop_id)
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  laptop_id uuid not null references public.laptops(id) on delete cascade,
  device_enrollment_id uuid references public.device_enrollments(id),
  event_type text not null check (event_type in ('visit','blocked_domain','usage_summary','sync')),
  domain text,
  visit_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  laptop_id uuid references public.laptops(id),
  subject text not null,
  description text not null,
  category text not null check (category in ('Laptop hardware','Laptop performance','Browser extension','Website blocking','Network connectivity','Software issue','Other')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','pending','resolved','closed')),
  assigned_admin_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('employee','admin')),
  message text not null,
  is_internal boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.laptop_change_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete cascade,
  current_laptop_id uuid references public.laptops(id),
  reason text not null,
  description text,
  request_date timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','additional_info','approved','rejected','resolved')),
  it_response text,
  resolution_details text,
  replacement_laptop_id uuid references public.laptops(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  target_table text,
  target_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version text,
  details text not null,
  published_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  theme text not null default 'light' check (theme in ('light','dark')),
  accent_color text default '#2563eb',
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_work_email on public.profiles(work_email);
create index if not exists idx_laptops_asset_tag on public.laptops(asset_tag);
create index if not exists idx_device_enrollments_employee on public.device_enrollments(employee_id);
create index if not exists idx_usage_events_employee on public.usage_events(employee_id, created_at desc);
create index if not exists idx_ticket_messages_ticket on public.ticket_messages(ticket_id, created_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
create index if not exists idx_blocked_domains_schedule on public.blocked_domains(schedule_id);

alter table public.profiles enable row level security;
alter table public.employee_permissions enable row level security;
alter table public.laptops enable row level security;
alter table public.device_enrollments enable row level security;
alter table public.blocking_schedules enable row level security;
alter table public.blocked_domains enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.usage_events enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.laptop_change_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.announcements enable row level security;
alter table public.admin_preferences enable row level security;

create policy "profiles_self_or_admin" on public.profiles
for select using (
  auth.uid() = id or
  exists (
    select 1 from public.employee_permissions ep
    where ep.profile_id = auth.uid() and ep.can_access_admin = true
  )
);

create policy "profiles_admin_insert_update" on public.profiles
for insert with check (
  exists (
    select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true
  )
);

create policy "profiles_self_update" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

create policy "employee_permissions_admin_only" on public.employee_permissions
for all using (
  exists (
    select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true
  )
) with check (
  exists (
    select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true
  )
);

create policy "laptops_admin_or_assigned_employee" on public.laptops
for select using (
  assigned_employee_id = auth.uid() or
  exists (
    select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true
  )
);

create policy "laptops_admin_update" on public.laptops
for update using (
  exists (
    select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true
  )
) with check (
  exists (
    select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true
  )
);

create policy "device_enrollments_admin_or_owner" on public.device_enrollments
for select using (
  employee_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create policy "blocking_schedules_admin_or_assignee" on public.blocking_schedules
for select using (
  exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
  or exists (
    select 1 from public.schedule_assignments sa
    where sa.schedule_id = public.blocking_schedules.id and sa.employee_id = auth.uid()
  )
);

create policy "blocked_domains_admin_or_assignee" on public.blocked_domains
for select using (
  exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
  or exists (
    select 1 from public.schedule_assignments sa
    join public.blocking_schedules bs on bs.id = sa.schedule_id
    where sa.schedule_id = public.blocked_domains.schedule_id and sa.employee_id = auth.uid()
  )
);

create policy "usage_events_self_or_admin" on public.usage_events
for select using (
  employee_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create policy "usage_events_insert_employee_or_admin" on public.usage_events
for insert with check (
  employee_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create policy "tickets_self_or_admin" on public.tickets
for select using (
  employee_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create policy "tickets_employee_insert" on public.tickets
for insert with check (employee_id = auth.uid());

create policy "ticket_messages_self_or_admin" on public.ticket_messages
for select using (
  sender_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
  or exists (
    select 1 from public.tickets t
    where t.id = ticket_id and t.employee_id = auth.uid()
  )
);

create policy "ticket_messages_insert_self_or_admin" on public.ticket_messages
for insert with check (
  sender_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create policy "laptop_change_requests_self_or_admin" on public.laptop_change_requests
for select using (
  employee_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create policy "audit_logs_admin_only" on public.audit_logs
for select using (
  exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create policy "announcements_public" on public.announcements
for select using (is_active = true);

create policy "admin_preferences_self_or_admin" on public.admin_preferences
for select using (
  profile_id = auth.uid() or exists (select 1 from public.employee_permissions ep where ep.profile_id = auth.uid() and ep.can_access_admin = true)
);

create or replace function public.get_dashboard_summary()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'employees', (select count(*) from public.profiles),
    'laptops', (select count(*) from public.laptops),
    'devices', (select count(*) from public.device_enrollments),
    'schedules', (select count(*) from public.blocking_schedules where enabled = true),
    'usage_events', (select count(*) from public.usage_events),
    'blocked_events', (select count(*) from public.usage_events where event_type = 'blocked_domain'),
    'open_tickets', (select count(*) from public.tickets where status <> 'closed'),
    'pending_replacements', (select count(*) from public.laptop_change_requests where status <> 'resolved')
  );
$$;

create or replace function public.normalize_domain(domain_input text)
returns text
language plpgsql
as $$
begin
  return lower(trim(regexp_replace(coalesce(domain_input, ''), '^https?://', '', 'gi')));
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger employee_permissions_updated_at before update on public.employee_permissions
for each row execute procedure public.set_updated_at();

create trigger laptops_updated_at before update on public.laptops
for each row execute procedure public.set_updated_at();

create trigger device_enrollments_updated_at before update on public.device_enrollments
for each row execute procedure public.set_updated_at();

create trigger blocking_schedules_updated_at before update on public.blocking_schedules
for each row execute procedure public.set_updated_at();

create trigger tickets_updated_at before update on public.tickets
for each row execute procedure public.set_updated_at();

create trigger laptop_change_requests_updated_at before update on public.laptop_change_requests
for each row execute procedure public.set_updated_at();

create trigger admin_preferences_updated_at before update on public.admin_preferences
for each row execute procedure public.set_updated_at();
