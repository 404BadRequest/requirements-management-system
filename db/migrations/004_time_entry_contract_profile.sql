-- Permite registrar a qué perfil cotizado se descuenta cada hora.

alter table public.rms_time_entries
  add column if not exists contract_profile_id text references public.rms_profiles (id);

create index if not exists rms_time_entries_contract_profile_idx
  on public.rms_time_entries (contract_profile_id);
