-- Identificação de funcionários e separação dos indicadores de clientes.
-- Execute uma vez no SQL Editor do Supabase antes de publicar esta versão.

alter table if exists public.contacts
  add column if not exists is_employee boolean not null default false;

alter table if exists public.tickets
  add column if not exists is_employee boolean not null default false;

create index if not exists contacts_employee_phone_idx
  on public.contacts (is_employee, phone);

create index if not exists tickets_customer_metrics_idx
  on public.tickets (is_employee, department_id, created_at);

-- Sincroniza atendimentos existentes dos contatos que já forem marcados.
update public.tickets t
   set is_employee = c.is_employee
  from public.contacts c
 where t.contact_id = c.id
   and t.is_employee is distinct from c.is_employee;

notify pgrst, 'reload schema';
