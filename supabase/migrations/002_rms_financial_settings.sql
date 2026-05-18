-- Valores de referencia UF→CLP y USD→CLP (configurables desde /settings/exchange-rates)

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

alter table public.rms_financial_settings enable row level security;

create policy "rms_financial_settings_all"
  on public.rms_financial_settings
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
