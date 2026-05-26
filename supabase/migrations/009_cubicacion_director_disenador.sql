-- Agrega columnas de horas directas para perfiles Director y Diseñador.
-- Estos perfiles no pasan por el cálculo de porcentajes: las horas se asignan directamente.

alter table public.rms_cubicacion_items
  add column if not exists director_hours  numeric(10, 4) not null default 0,
  add column if not exists disenador_hours numeric(10, 4) not null default 0;
