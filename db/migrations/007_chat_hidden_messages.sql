-- Ocultación de mensajes por usuario (soft-delete personal).
create table if not exists public.rms_chat_message_hidden_for_user (
  message_id text not null references public.rms_chat_messages (id) on delete cascade,
  user_id text not null references public.rms_directory_users (id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists rms_chat_message_hidden_user_idx
  on public.rms_chat_message_hidden_for_user (user_id, hidden_at desc);
