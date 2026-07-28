\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('12000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'cost-owner@test.local', now(), now()),
  ('12000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'cost-manager@test.local', now(), now()),
  ('12000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'cost-employee@test.local', now(), now()),
  ('12000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'cost-other@test.local', now(), now());

insert into public.companies (id, owner_id, name)
values
  ('22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', 'Cost Company'),
  ('22000000-0000-0000-0000-000000000002', '12000000-0000-0000-0000-000000000004', 'Other Cost Company');

insert into public.jobs (
  id, company_id, title, date_scheduled, estimate_amount
)
values
  ('32000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Costed Job', current_date, 1000),
  ('32000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'Other Costed Job', current_date, 500);

insert into public.team_members (
  id, company_id, user_id, email, full_name, role, hourly_rate, is_active
)
values
  ('42000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', 'cost-manager@test.local', 'Cost Manager', 'manager', 40, true),
  ('42000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000003', 'cost-employee@test.local', 'Cost Employee', 'employee', 30, true);

insert into public.job_assignments (
  job_id, team_member_id, company_id, assigned_by
)
values (
  '32000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  '22000000-0000-0000-0000-000000000001',
  '12000000-0000-0000-0000-000000000001'
);

insert into public.time_entries (
  team_member_id, job_id, company_id, clock_in, clock_out,
  hours_worked, hourly_rate_snapshot, labor_cost
)
values (
  '42000000-0000-0000-0000-000000000002',
  '32000000-0000-0000-0000-000000000001',
  '22000000-0000-0000-0000-000000000001',
  statement_timestamp() - interval '2 hours',
  statement_timestamp(),
  2,
  30,
  60
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-0000-0000-000000000003","email":"cost-employee@test.local","role":"authenticated"}',
  true
);

do $$
declare
  v_path text;
begin
  v_path := public.prepare_my_expense_receipt_path(
    '32000000-0000-0000-0000-000000000001',
    'JPG'
  );

  if v_path not like
    '22000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/12000000-0000-0000-0000-000000000003/%.jpg'
  then
    raise exception 'Receipt path was not company/job/user scoped: %', v_path;
  end if;

  begin
    perform public.prepare_my_expense_receipt_path(
      '32000000-0000-0000-0000-000000000002',
      'jpg'
    );
    raise exception 'Cross-company receipt path unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

insert into storage.objects (bucket_id, name, owner, owner_id)
values (
  'job-receipts',
  '22000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/12000000-0000-0000-0000-000000000003/receipt.jpg',
  auth.uid(),
  auth.uid()::text
);

do $$
begin
  if (select count(*) from storage.objects where bucket_id = 'job-receipts') <> 1 then
    raise exception 'Employee could not read their own receipt';
  end if;

  begin
    insert into storage.objects (bucket_id, name, owner, owner_id)
    values (
      'job-receipts',
      '22000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/12000000-0000-0000-0000-000000000004/forged.jpg',
      auth.uid(),
      auth.uid()::text
    );
    raise exception 'Receipt upload into another user folder unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select public.submit_my_job_expense(
  '32000000-0000-0000-0000-000000000001',
  125.50,
  'materials',
  'Lumber',
  null,
  '22000000-0000-0000-0000-000000000001/32000000-0000-0000-0000-000000000001/12000000-0000-0000-0000-000000000003/receipt.jpg'
);

do $$
declare
  v_expense_id uuid;
begin
  select id into v_expense_id
  from public.list_my_job_expenses('32000000-0000-0000-0000-000000000001');

  if v_expense_id is null then
    raise exception 'Employee could not read their submitted expense';
  end if;

  begin
    perform public.review_job_expense(v_expense_id, 'approved', null);
    raise exception 'Employee self-approval unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.submit_my_job_expense(
      '32000000-0000-0000-0000-000000000002',
      10,
      'fuel',
      null,
      null,
      null
    );
    raise exception 'Cross-company expense unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-0000-0000-000000000002","email":"cost-manager@test.local","role":"authenticated"}',
  true
);

select public.review_job_expense(
  (
    select id
    from public.list_my_job_expenses('32000000-0000-0000-0000-000000000001')
    limit 1
  ),
  'approved',
  null
);

do $$
declare
  v_cost record;
begin
  if (select count(*) from storage.objects where bucket_id = 'job-receipts') <> 1 then
    raise exception 'Manager could not read the company receipt';
  end if;

  select * into v_cost
  from public.get_job_costing('32000000-0000-0000-0000-000000000001');

  if v_cost.quoted_revenue <> 1000
     or v_cost.labor_cost <> 60
     or v_cost.approved_expenses <> 125.50
     or v_cost.total_cost <> 185.50
     or v_cost.projected_profit <> 814.50
     or v_cost.projected_margin <> 81.45 then
    raise exception 'Job costing totals are incorrect: %', row_to_json(v_cost);
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"12000000-0000-0000-0000-000000000003","email":"cost-employee@test.local","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.get_job_costing('32000000-0000-0000-0000-000000000001');
    raise exception 'Employee financial summary access unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

rollback;

\echo 'secure_expenses_and_job_costing: all tests passed'
