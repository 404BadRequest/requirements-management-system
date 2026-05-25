-- Tabla de cubicación por contrato.
-- Cada fila representa una actividad estimada. Las horas derivadas (levantamiento,
-- diseño, QA, puesta en marcha, distribución por perfil) se calculan en runtime
-- usando los porcentajes almacenados aquí.

create table if not exists public.rms_cubicacion_items (
  id                    text primary key,
  contract_id           text not null references public.rms_contract_budgets(id) on delete cascade,
  requirement_id        text references public.rms_requirements(id) on delete set null,
  activity_name         text not null,
  construccion_hours    numeric(10, 4) not null default 0,
  levantamiento_pct     numeric(6, 4)  not null default 0.05,
  diseno_pct            numeric(6, 4)  not null default 0.20,
  qa_ajustes_pct        numeric(6, 4)  not null default 0.15,
  puesta_en_marcha_pct  numeric(6, 4)  not null default 0.10,
  senior_pct            numeric(6, 4)  not null default 0.10,
  ingenero_pct          numeric(6, 4)  not null default 0.30,
  junior_pct            numeric(6, 4)  not null default 0.60,
  sort_order            integer        not null default 0,
  created_at            timestamptz    not null default now(),
  updated_at            timestamptz    not null default now()
);

create index if not exists rms_cubicacion_items_contract_id_idx on public.rms_cubicacion_items(contract_id);
