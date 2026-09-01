-- Edição completa e ordem dos departamentos no menu do bot
ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY sort_order ASC NULLS LAST, name ASC
    )::INTEGER AS new_order
  FROM public.departments
)
UPDATE public.departments AS department
SET sort_order = ordered.new_order
FROM ordered
WHERE department.id = ordered.id;

CREATE INDEX IF NOT EXISTS departments_sort_order_idx
  ON public.departments(sort_order, name);

NOTIFY pgrst, 'reload schema';
