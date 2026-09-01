-- Execute uma vez no SQL Editor do Supabase antes de usar o co-atendimento.
create table if not exists public.ticket_collaborators (
  -- Compatível tanto com bancos antigos (tickets.id TEXT) quanto com novos.
  ticket_id text not null,
  user_id uuid not null references public.users(id) on delete cascade,
  added_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

-- Se uma tentativa anterior chegou a criar a coluna como UUID, converte sem
-- apagar participantes que já tenham sido cadastrados.
alter table public.ticket_collaborators
  drop constraint if exists ticket_collaborators_ticket_id_fkey;
alter table public.ticket_collaborators
  alter column ticket_id type text using ticket_id::text;

create index if not exists ticket_collaborators_user_idx
  on public.ticket_collaborators(user_id, created_at desc);

alter table public.ticket_collaborators enable row level security;
notify pgrst, 'reload schema';
