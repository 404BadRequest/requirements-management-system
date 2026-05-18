-- Esquema portable para Postgres gestionado (Neon, RDS, etc.)
-- No depende de `auth.users` ni funciones de Supabase (`auth.uid`, `auth.role`).

create extension if not exists "pgcrypto";

create table if not exists public.rms_auth_profile (
  user_id text primary key,
  role text not null default 'Contributor',
  display_name text
);

create table if not exists public.rms_app_identities (
  user_id text primary key,
  email text not null unique,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  auth_user_id text,
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

create table if not exists public.rms_financial_settings (
  id text primary key default 'default',
  uf_to_clp numeric not null default 39500,
  usd_to_clp numeric not null default 950,
  updated_at timestamptz not null default now(),
  constraint rms_financial_settings_singleton check (id = 'default')
);

insert into public.rms_financial_settings (id, uf_to_clp, usd_to_clp)
values ('default', 39500, 950)
on conflict (id) do nothing;

create table if not exists public.rms_notifications (
  id text primary key,
  recipient_user_id text not null references public.rms_directory_users (id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rms_notifications_recipient_created_idx
  on public.rms_notifications (recipient_user_id, created_at desc);
