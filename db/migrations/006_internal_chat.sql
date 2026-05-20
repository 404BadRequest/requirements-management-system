-- Chat interno: threads, mensajes, lectura y presencia.

create table if not exists public.rms_chat_threads (
  id text primary key,
  type text not null check (type in ('direct', 'channel')),
  name text,
  direct_key text unique,
  created_by_user_id text not null references public.rms_directory_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz
);

create table if not exists public.rms_chat_thread_members (
  thread_id text not null references public.rms_chat_threads (id) on delete cascade,
  user_id text not null references public.rms_directory_users (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'owner')),
  muted_until timestamptz,
  joined_at timestamptz not null default now(),
  last_read_message_id text,
  primary key (thread_id, user_id)
);

create table if not exists public.rms_chat_messages (
  id text primary key,
  thread_id text not null references public.rms_chat_threads (id) on delete cascade,
  sender_user_id text not null references public.rms_directory_users (id),
  body text not null,
  kind text not null default 'text' check (kind in ('text')),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create table if not exists public.rms_chat_presence_preferences (
  user_id text primary key references public.rms_directory_users (id) on delete cascade,
  status text not null default 'offline' check (status in ('online', 'away', 'dnd', 'offline')),
  dnd_until timestamptz,
  custom_status text,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rms_chat_attachments (
  id text primary key,
  message_id text not null references public.rms_chat_messages (id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes int not null,
  storage_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists rms_chat_threads_last_message_idx
  on public.rms_chat_threads (last_message_at desc nulls last);

create index if not exists rms_chat_members_user_idx
  on public.rms_chat_thread_members (user_id, thread_id);

create index if not exists rms_chat_messages_thread_created_idx
  on public.rms_chat_messages (thread_id, created_at desc);

create index if not exists rms_chat_presence_status_idx
  on public.rms_chat_presence_preferences (status, last_seen_at desc);
