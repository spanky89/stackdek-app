begin;

insert into storage.buckets (id, name, public)
values ('job-receipts', 'job-receipts', false)
on conflict (id) do update set public = false;

create or replace function public.job_belongs_to_company(
  p_job_id uuid,
  p_company_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.jobs j
    where j.id = p_job_id
      and j.company_id = p_company_id
  );
$$;

revoke all on function public.job_belongs_to_company(uuid, uuid) from public, anon;
grant execute on function public.job_belongs_to_company(uuid, uuid) to authenticated;

drop policy if exists job_receipts_insert_own on storage.objects;
drop policy if exists job_receipts_select_scoped on storage.objects;
drop policy if exists job_receipts_delete_managers on storage.objects;

create policy job_receipts_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-receipts'
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[3] = auth.uid()::text
  and public.can_access_operational_job(((storage.foldername(name))[2])::uuid)
  and public.job_belongs_to_company(
    ((storage.foldername(name))[2])::uuid,
    ((storage.foldername(name))[1])::uuid
  )
);

create policy job_receipts_select_scoped
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-receipts'
  and array_length(storage.foldername(name), 1) = 3
  and (
    (storage.foldername(name))[3] = auth.uid()::text
    or public.has_company_role(
      ((storage.foldername(name))[1])::uuid,
      array['manager']
    )
  )
);

create policy job_receipts_delete_managers
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-receipts'
  and array_length(storage.foldername(name), 1) = 3
  and public.has_company_role(
    ((storage.foldername(name))[1])::uuid,
    array['manager']
  )
);

drop policy if exists job_expenses_insert on public.job_expenses;
drop policy if exists job_expenses_update on public.job_expenses;
drop policy if exists job_expenses_select on public.job_expenses;

create policy job_expenses_select
on public.job_expenses
for select
to authenticated
using (
  added_by = auth.uid()
  or public.has_company_role(company_id, array['manager'])
);

revoke insert, update, delete on public.job_expenses from authenticated;

create or replace function public.prepare_my_expense_receipt_path(
  p_job_id uuid,
  p_file_extension text
)
returns text
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_company_id uuid;
  v_extension text := lower(trim(leading '.' from trim(p_file_extension)));
begin
  if not public.can_access_operational_job(p_job_id) then
    raise exception 'Active job assignment required'
      using errcode = '42501';
  end if;

  if v_extension not in ('jpg', 'jpeg', 'png', 'webp', 'pdf') then
    raise exception 'Unsupported receipt file type'
      using errcode = '22023';
  end if;

  select j.company_id into v_company_id
  from public.jobs j
  where j.id = p_job_id;

  return concat(
    v_company_id, '/',
    p_job_id, '/',
    auth.uid(), '/',
    gen_random_uuid(), '.',
    v_extension
  );
end;
$$;

create or replace function public.submit_my_job_expense(
  p_job_id uuid,
  p_amount numeric,
  p_category text,
  p_description text default null,
  p_notes text default null,
  p_receipt_path text default null
)
returns public.job_expenses
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_company_id uuid;
  v_expense public.job_expenses;
begin
  if not public.can_access_operational_job(p_job_id) then
    raise exception 'Active job assignment required'
      using errcode = '42501';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Expense amount must be positive'
      using errcode = '22023';
  end if;

  if p_category not in (
    'materials', 'equipment', 'subcontractors',
    'permits', 'fuel', 'other'
  ) then
    raise exception 'Invalid expense category'
      using errcode = '22023';
  end if;

  select j.company_id into v_company_id
  from public.jobs j
  where j.id = p_job_id;

  if p_receipt_path is not null and not exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'job-receipts'
      and o.name = p_receipt_path
      and (storage.foldername(o.name))[1] = v_company_id::text
      and (storage.foldername(o.name))[2] = p_job_id::text
      and (storage.foldername(o.name))[3] = auth.uid()::text
  ) then
    raise exception 'Receipt upload was not found or is not owned by this user'
      using errcode = '42501';
  end if;

  insert into public.job_expenses (
    job_id,
    company_id,
    added_by,
    amount,
    category,
    description,
    receipt_url,
    status,
    notes
  )
  values (
    p_job_id,
    v_company_id,
    auth.uid(),
    round(p_amount, 2),
    p_category,
    nullif(trim(p_description), ''),
    p_receipt_path,
    'pending',
    nullif(trim(p_notes), '')
  )
  returning * into v_expense;

  return v_expense;
end;
$$;

drop function if exists public.list_my_job_expenses(uuid);

create function public.list_my_job_expenses(p_job_id uuid)
returns table (
  id uuid,
  amount numeric,
  category text,
  description text,
  status text,
  created_at timestamp without time zone,
  receipt_url text,
  rejection_reason text,
  added_by uuid,
  added_by_name text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
begin
  if not public.can_access_operational_job(p_job_id) then
    raise exception 'Active job assignment required'
      using errcode = '42501';
  end if;

  select j.company_id into v_company_id
  from public.jobs j
  where j.id = p_job_id;

  return query
  select
    e.id,
    e.amount,
    e.category,
    e.description,
    e.status,
    e.created_at,
    e.receipt_url,
    e.rejection_reason,
    e.added_by,
    coalesce(tm.full_name, 'Company owner')
  from public.job_expenses e
  left join public.team_members tm
    on tm.user_id = e.added_by
   and tm.company_id = e.company_id
  where e.job_id = p_job_id
    and e.company_id = v_company_id
    and (
      e.added_by = auth.uid()
      or public.has_company_role(v_company_id, array['manager'])
    )
  order by e.created_at desc;
end;
$$;

create or replace function public.review_job_expense(
  p_expense_id uuid,
  p_status text,
  p_rejection_reason text default null
)
returns public.job_expenses
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_expense public.job_expenses;
begin
  select e.* into v_expense
  from public.job_expenses e
  where e.id = p_expense_id
  for update;

  if v_expense.id is null
     or not public.has_company_role(v_expense.company_id, array['manager']) then
    raise exception 'Owner or manager approval required'
      using errcode = '42501';
  end if;

  if v_expense.added_by = auth.uid() then
    raise exception 'A user cannot approve their own expense'
      using errcode = '42501';
  end if;

  if v_expense.status <> 'pending' then
    raise exception 'Only pending expenses may be reviewed'
      using errcode = '22023';
  end if;

  if p_status not in ('approved', 'rejected') then
    raise exception 'Review status must be approved or rejected'
      using errcode = '22023';
  end if;

  if p_status = 'rejected' and nullif(trim(p_rejection_reason), '') is null then
    raise exception 'A rejection reason is required'
      using errcode = '22023';
  end if;

  update public.job_expenses e
  set status = p_status,
      approved_by = auth.uid(),
      approved_at = statement_timestamp(),
      rejection_reason = case
        when p_status = 'rejected' then trim(p_rejection_reason)
        else null
      end,
      updated_at = statement_timestamp()
  where e.id = p_expense_id
  returning * into v_expense;

  return v_expense;
end;
$$;

create or replace function public.get_job_costing(p_job_id uuid)
returns table (
  job_id uuid,
  quoted_revenue numeric,
  labor_cost numeric,
  approved_expenses numeric,
  total_cost numeric,
  projected_profit numeric,
  projected_margin numeric
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
begin
  select j.company_id into v_company_id
  from public.jobs j
  where j.id = p_job_id;

  if v_company_id is null
     or not public.has_company_role(v_company_id, array['manager']) then
    raise exception 'Owner or manager access required'
      using errcode = '42501';
  end if;

  return query
  with totals as (
    select
      coalesce((
        select sum(te.labor_cost)
        from public.time_entries te
        where te.job_id = p_job_id
          and te.company_id = v_company_id
          and te.clock_out is not null
      ), 0)::numeric as labor,
      coalesce((
        select sum(e.amount)
        from public.job_expenses e
        where e.job_id = p_job_id
          and e.company_id = v_company_id
          and e.status = 'approved'
      ), 0)::numeric as expenses
  )
  select
    j.id,
    coalesce(j.estimate_amount, 0)::numeric,
    round(t.labor, 2),
    round(t.expenses, 2),
    round(t.labor + t.expenses, 2),
    round(coalesce(j.estimate_amount, 0) - t.labor - t.expenses, 2),
    case
      when coalesce(j.estimate_amount, 0) <= 0 then null
      else round(
        (
          (coalesce(j.estimate_amount, 0) - t.labor - t.expenses)
          / j.estimate_amount
        ) * 100,
        2
      )
    end
  from public.jobs j
  cross join totals t
  where j.id = p_job_id
    and j.company_id = v_company_id;
end;
$$;

revoke all on function public.prepare_my_expense_receipt_path(uuid, text) from public, anon;
revoke all on function public.submit_my_job_expense(uuid, numeric, text, text, text, text) from public, anon;
revoke all on function public.list_my_job_expenses(uuid) from public, anon;
revoke all on function public.review_job_expense(uuid, text, text) from public, anon;
revoke all on function public.get_job_costing(uuid) from public, anon;

grant execute on function public.prepare_my_expense_receipt_path(uuid, text) to authenticated;
grant execute on function public.submit_my_job_expense(uuid, numeric, text, text, text, text) to authenticated;
grant execute on function public.list_my_job_expenses(uuid) to authenticated;
grant execute on function public.review_job_expense(uuid, text, text) to authenticated;
grant execute on function public.get_job_costing(uuid) to authenticated;

commit;
