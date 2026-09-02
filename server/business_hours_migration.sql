-- Horários individuais por departamento e espera interna fora do expediente.
alter table public.departments
  add column if not exists business_hours jsonb not null default '{"enabled":false,"timezone":"America/Sao_Paulo","days":{}}'::jsonb,
  add column if not exists after_hours_message text;

alter table public.tickets
  add column if not exists scheduled_queue_at timestamptz,
  add column if not exists group_participant_count integer not null default 0;

create index if not exists tickets_scheduled_queue_idx
  on public.tickets(status, scheduled_queue_at)
  where status = 'fora_horario';

notify pgrst, 'reload schema';
