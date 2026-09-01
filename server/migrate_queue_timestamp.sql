-- Registra o momento real em que cada atendimento entra na fila.
-- Execute este arquivo uma vez no SQL Editor do Supabase.

alter table if exists public.tickets
  add column if not exists queued_at timestamptz;

update public.tickets
   set queued_at = coalesce(
     queued_at,
     (
       select max(message.created_at)
         from public.messages message
        where message.ticket_id = tickets.id
          and message.sender = 'system'
          and (
            message.text ilike '[Chatbot] Cliente escolheu:%'
            or message.text ilike '%Atendimento transferido de%para%'
          )
     ),
     created_at
   )
 where status = 'aguardando'
   and queued_at is null;

create or replace function public.set_ticket_queued_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'aguardando' then
    if tg_op = 'INSERT' then
      new.queued_at := coalesce(new.queued_at, now());
    elsif old.status is distinct from 'aguardando' then
      new.queued_at := now();
    elsif new.queued_at is null then
      new.queued_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tickets_set_queued_at on public.tickets;
create trigger tickets_set_queued_at
before insert or update of status on public.tickets
for each row execute function public.set_ticket_queued_at();

notify pgrst, 'reload schema';
