-- Agrega columna color al catálogo de settings (estados, prioridades, etc.)
alter table public.rms_settings_catalog
  add column if not exists color text default null;
