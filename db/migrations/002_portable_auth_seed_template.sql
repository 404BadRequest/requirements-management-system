-- Plantilla de seed inicial para Auth.js (adaptar valores antes de ejecutar).
-- `password_hash` debe generarse con el helper `hashPassword()` en `src/lib/auth/password-hash.ts`.

-- Ejemplo de formato:
-- scrypt$16384$8$1$<saltHex>$<hashHex>

-- insert into public.rms_profiles (id, name, hourly_rate, rate_currency, active)
-- values ('prof-admin', 'Administrador', 0, 'CLP', true)
-- on conflict (id) do nothing;

-- insert into public.rms_directory_users (id, name, email, aliases, profile_id, active, role)
-- values ('user-admin', 'Administrador RMS', 'admin@local', '[]'::jsonb, 'prof-admin', true, 'Admin')
-- on conflict (id) do nothing;

-- insert into public.rms_auth_profile (user_id, role, display_name)
-- values ('user-admin', 'Admin', 'Administrador RMS')
-- on conflict (user_id) do update set role = excluded.role, display_name = excluded.display_name;

-- insert into public.rms_app_identities (user_id, email, password_hash, active)
-- values ('user-admin', 'admin@local', '<reemplazar-hash>', true)
-- on conflict (user_id) do update set email = excluded.email, password_hash = excluded.password_hash, active = excluded.active, updated_at = now();
