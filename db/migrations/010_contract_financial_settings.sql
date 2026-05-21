alter table if exists public.rms_contract_budgets
  add column if not exists markup_percentage numeric(5,2) not null default 40.00,
  add column if not exists opex_percentage numeric(5,2) not null default 10.00;
