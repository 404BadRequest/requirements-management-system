-- Tareas (subtareas) dentro de requerimientos
create table if not exists public.rms_requirement_tasks (
  id text primary key,
  requirement_id text not null
    references public.rms_requirements(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'pending',
  estimated_hours numeric(6,2) default null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rms_requirement_tasks_req_idx
  on public.rms_requirement_tasks(requirement_id);
