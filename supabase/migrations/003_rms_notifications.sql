-- Avisos in-app (`rms-data-access`: list, unread count, create, mark read).
-- RLS alineada con el resto del esquema: usuarios autenticados (la app valida permisos en servidor).

create table if not exists public.rms_notifications (
  id text primary key,
  recipient_user_id text not null references public.rms_directory_users (id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rms_notifications_recipient_created_idx
  on public.rms_notifications (recipient_user_id, created_at desc);

alter table public.rms_notifications enable row level security;

create policy "rms_notifications_all"
  on public.rms_notifications
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
