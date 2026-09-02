-- Execute uma vez no SQL Editor do Supabase antes de publicar a versão
-- com responder, editar e excluir mensagens.

alter table if exists public.messages
  add column if not exists reply_to_message_id text,
  add column if not exists reply_to_remote_message_id text,
  add column if not exists reply_preview text,
  add column if not exists reply_sender text,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;

create index if not exists messages_reply_to_message_id_idx
  on public.messages(reply_to_message_id);
