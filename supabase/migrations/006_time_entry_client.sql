alter table if exists public.rms_time_entries
  add column if not exists client_id text references public.rms_clients (id) on delete set null;
