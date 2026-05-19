-- Permite registrar horas en curso (sin hora termino).
alter table public.rms_time_entries
  alter column end_time drop not null;
