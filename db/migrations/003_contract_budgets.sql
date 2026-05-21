-- Contratos de presupuesto y distribución de bolsa por perfil.

create table if not exists public.rms_contract_budgets (
  id text primary key,
  client_id text not null references public.rms_clients (id),
  project_id text not null,
  scope text not null,
  code text not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  rate_uf_per_hour numeric not null,
  markup_percentage numeric(5,2) not null default 40.00,
  opex_percentage numeric(5,2) not null default 10.00,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, code)
);

create table if not exists public.rms_contract_profile_allocations (
  id text primary key,
  contract_id text not null references public.rms_contract_budgets (id) on delete cascade,
  profile_id text not null references public.rms_profiles (id),
  quoted_minutes int not null,
  rate_uf_per_hour numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rms_requirements
  add column if not exists contract_id text references public.rms_contract_budgets (id);

alter table public.rms_time_entries
  add column if not exists contract_id text references public.rms_contract_budgets (id);

create index if not exists rms_contract_budgets_project_idx
  on public.rms_contract_budgets (project_id, start_date, end_date);

create index if not exists rms_contract_profile_allocations_contract_idx
  on public.rms_contract_profile_allocations (contract_id, profile_id);

create index if not exists rms_requirements_contract_idx
  on public.rms_requirements (contract_id);

create index if not exists rms_time_entries_contract_idx
  on public.rms_time_entries (contract_id);
