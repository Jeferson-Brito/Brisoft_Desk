-- Execute uma vez no SQL Editor do Supabase antes de publicar esta versão.
-- Adiciona grupos permanentes do WhatsApp e fotos de perfil.

alter table if exists public.departments
  add column if not exists allow_device_message_mutations boolean not null default false;

alter table if exists public.contacts
  add column if not exists avatar_url text;

alter table if exists public.tickets
  add column if not exists is_group boolean not null default false,
  add column if not exists group_jid text,
  add column if not exists avatar_url text;

alter table if exists public.messages
  add column if not exists participant_jid text;

create unique index if not exists tickets_whatsapp_group_idx
  on public.tickets(channel, group_jid)
  where is_group = true and group_jid is not null;
