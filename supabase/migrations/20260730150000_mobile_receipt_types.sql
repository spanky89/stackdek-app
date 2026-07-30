begin;

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

  if v_extension not in ('jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'pdf') then
    raise exception 'Unsupported receipt file type'
      using errcode = '22023';
  end if;

  select j.company_id into v_company_id
  from public.jobs j
  where j.id = p_job_id;

  return concat(v_company_id, '/', p_job_id, '/', auth.uid(), '/',
    gen_random_uuid(), '.', v_extension);
end;
$$;

revoke all on function public.prepare_my_expense_receipt_path(uuid, text) from public, anon;
grant execute on function public.prepare_my_expense_receipt_path(uuid, text) to authenticated;

commit;
