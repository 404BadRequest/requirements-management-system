-- Agrega la columna weekly_capacity_hours a rms_financial_settings.
-- Permite configurar la capacidad laboral semanal estándar del equipo (en horas por persona)
-- desde el panel de configuración, en vez de tenerla hardcodeada en el código.

alter table if exists public.rms_financial_settings
  add column if not exists weekly_capacity_hours integer not null default 40;
