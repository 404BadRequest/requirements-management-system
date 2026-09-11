-- Horas directas dinámicas por perfil (profile_id → horas).
-- Reemplaza el modelo fijo Director/Diseñador; esas columnas se mantienen sincronizadas por compatibilidad.

alter table public.rms_cubicacion_items
  add column if not exists direct_profile_hours jsonb not null default '{}'::jsonb;

-- Backfill desde columnas legacy cuando hay horas y existen perfiles con nombres conocidos.
update public.rms_cubicacion_items c
set direct_profile_hours = coalesce(c.direct_profile_hours, '{}'::jsonb)
  || case
       when c.director_hours > 0 and exists (
         select 1 from public.rms_profiles p
         where lower(p.name) like '%director%'
       ) then jsonb_build_object(
         (
           select p.id from public.rms_profiles p
           where lower(p.name) like '%director%'
           order by p.name
           limit 1
         ),
         c.director_hours
       )
       else '{}'::jsonb
     end
  || case
       when c.disenador_hours > 0 and exists (
         select 1 from public.rms_profiles p
         where lower(p.name) like '%dise%'
       ) then jsonb_build_object(
         (
           select p.id from public.rms_profiles p
           where lower(p.name) like '%dise%'
           order by p.name
           limit 1
         ),
         c.disenador_hours
       )
       else '{}'::jsonb
     end
where c.director_hours > 0 or c.disenador_hours > 0;
