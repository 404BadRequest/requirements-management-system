-- RMS schema + RLS (Supabase). Ejecutar en SQL editor o `supabase db push`.
-- Enlaza sesión: `rms_auth_profile.user_id` = `auth.users.id`

create extension if not exists "pgcrypto";

create table if not exists public.rms_auth_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'Contributor',
  display_name text
);

create table if not exists public.rms_clients (
  id text primary key,
  name text not null,
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rms_profiles (
  id text primary key,
  name text not null,
  hourly_rate numeric not null default 0,
  rate_currency text not null default 'CLP',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rms_directory_users (
  id text primary key,
  name text not null,
  email text not null,
  aliases jsonb not null default '[]'::jsonb,
  profile_id text not null references public.rms_profiles (id),
  active boolean not null default true,
  role text not null default 'Contributor',
  auth_user_id uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rms_settings_catalog (
  id text primary key,
  kind text not null,
  code text not null,
  label text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, code)
);

create table if not exists public.rms_requirements (
  id text primary key,
  project_id text not null,
  client_id text not null references public.rms_clients (id),
  origin text not null,
  title text not null,
  description text not null,
  priority text not null,
  owner_id text not null,
  status text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.rms_time_entries (
  id text primary key,
  project_id text not null,
  requirement_id text references public.rms_requirements (id),
  category text not null,
  task_description text not null,
  date text not null,
  start_time text not null,
  end_time text not null,
  duration_minutes int not null,
  user_id text not null,
  observations text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rms_budget_allocations (
  id text primary key,
  project_id text not null,
  scope text not null,
  profile_id text not null references public.rms_profiles (id),
  quoted_minutes int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rms_requirement_comments (
  id text primary key,
  requirement_id text not null references public.rms_requirements (id) on delete cascade,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.rms_requirement_status_history (
  id text primary key,
  requirement_id text not null references public.rms_requirements (id) on delete cascade,
  from_status text not null,
  to_status text not null,
  changed_by_id text not null,
  changed_at timestamptz not null default now()
);

create table if not exists public.rms_audit_logs (
  id text primary key,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_json text not null,
  after_json text not null,
  user_id text not null,
  created_at timestamptz not null default now()
);

alter table public.rms_auth_profile enable row level security;
alter table public.rms_clients enable row level security;
alter table public.rms_profiles enable row level security;
alter table public.rms_directory_users enable row level security;
alter table public.rms_settings_catalog enable row level security;
alter table public.rms_requirements enable row level security;
alter table public.rms_time_entries enable row level security;
alter table public.rms_budget_allocations enable row level security;
alter table public.rms_requirement_comments enable row level security;
alter table public.rms_requirement_status_history enable row level security;
alter table public.rms_audit_logs enable row level security;

create policy "rms_auth_self" on public.rms_auth_profile for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "rms_clients_all" on public.rms_clients for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_profiles_all" on public.rms_profiles for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_users_all" on public.rms_directory_users for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_cat_all" on public.rms_settings_catalog for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_req_all" on public.rms_requirements for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_te_all" on public.rms_time_entries for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_bud_all" on public.rms_budget_allocations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_rc_all" on public.rms_requirement_comments for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_rsh_all" on public.rms_requirement_status_history for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "rms_audit_all" on public.rms_audit_logs for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
