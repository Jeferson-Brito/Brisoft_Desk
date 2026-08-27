-- Compatibilidade para instalações existentes do Brisoft Desk.
-- Execute uma vez no SQL Editor do Supabase antes de publicar esta versão.

alter table if exists public.messages
  add column if not exists media_url text,
  add column if not exists media_type text,
  add column if not exists remote_message_id text,
  add column if not exists whatsapp_account_id text,
  add column if not exists file_name text;

alter table if exists public.tickets
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists assumed_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists awaiting_rating boolean not null default false;

-- O projeto legado usa tickets.id como TEXT, enquanto instalações novas usam UUID.
-- Descobre o tipo existente e cria a FK com exatamente o mesmo tipo.
do $$
declare
  ticket_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into ticket_id_type
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace schema on schema.oid = relation.relnamespace
   where schema.nspname = 'public'
     and relation.relname = 'tickets'
     and attribute.attname = 'id'
     and attribute.attnum > 0
     and not attribute.attisdropped;

  if ticket_id_type is null then
    raise exception 'A tabela public.tickets ou a coluna tickets.id não foi encontrada.';
  end if;

  execute format(
    'create table if not exists public.ratings (
       id uuid primary key default gen_random_uuid(),
       ticket_id %s not null references public.tickets(id) on delete cascade,
       agent_name text,
       score integer not null check (score between 1 and 5),
       phone text,
       jid text,
       created_at timestamptz not null default now()
     )',
    ticket_id_type
  );
end $$;

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists tickets_department_status_idx
  on public.tickets(department_id, status);
create index if not exists tickets_user_status_idx
  on public.tickets(user_id, status);
create index if not exists tickets_channel_phone_status_idx
  on public.tickets(channel, phone, status, created_at desc);
create index if not exists tickets_channel_jid_status_idx
  on public.tickets(channel, jid, status, created_at desc);
create index if not exists messages_ticket_created_idx
  on public.messages(ticket_id, created_at);
create unique index if not exists messages_whatsapp_remote_unique_idx
  on public.messages(whatsapp_account_id, remote_message_id)
  where whatsapp_account_id is not null and remote_message_id is not null;

do $$
begin
  if to_regclass('public.avaliacoes') is not null then
    insert into public.ratings (ticket_id, agent_name, score, phone, jid, created_at)
    select ticket_id, agent_name, rating, phone, jid, created_at
      from public.avaliacoes a
     where not exists (
       select 1 from public.ratings r
        where r.ticket_id = a.ticket_id and r.created_at = a.created_at
     );
  end if;
end $$;

-- Tabela de contatos (clientes capturados pelo bot ou cadastrados manualmente)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  cnpj text,
  channel text default 'WhatsApp',
  status text default 'Ativo',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_phone_idx on public.contacts(phone);

-- Adiciona coluna contact_id na tabela tickets se não existir
alter table if exists public.tickets
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

-- Solicita ao PostgREST/Supabase que atualize imediatamente o cache do schema.
notify pgrst, 'reload schema';
