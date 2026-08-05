-- A StackDek auth user owns at most one company. This also makes the
-- client-side get-or-create fallback safe under concurrent auth events.
create unique index if not exists companies_one_per_owner
  on public.companies (owner_id);
