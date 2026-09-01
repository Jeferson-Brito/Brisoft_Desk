-- Execute uma vez no SQL Editor do Supabase antes de usar o co-atendimento.
create table if not exists public.ticket_collaborators (
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  added_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (ticket_id, user_id)
);

create index if not exists ticket_collaborators_user_idx
  on public.ticket_collaborators(user_id, created_at desc);

alter table public.ticket_collaborators enable row level security;
notify pgrst, 'reload schema';
