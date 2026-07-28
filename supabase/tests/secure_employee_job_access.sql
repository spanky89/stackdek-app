\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('11000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'job-owner-a@test.local', now(), now()),
  ('11000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'job-owner-b@test.local', now(), now()),
  ('11000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'job-manager-a@test.local', now(), now()),
  ('11000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'job-employee-a@test.local', now(), now()),
  ('11000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'job-inactive-a@test.local', now(), now());

insert into public.companies (id, owner_id, name)
values
  ('21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 'Job Company A'),
  ('21000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000002', 'Job Company B');

insert into public.clients (id, company_id, name, phone, address)
values
  ('22000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'Client A', '555-0101', '1 Main St'),
  ('22000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'Client B', '555-0102', '2 Main St');

insert into public.jobs (
  id, company_id, client_id, title, description, date_scheduled,
  estimate_amount, status
)
values
  ('31000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Assigned Job A', 'Safe scope', current_date, 9999, 'scheduled'),
  ('31000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'Unassigned Job A', 'Private scope', current_date, 8888, 'scheduled'),
  ('31000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000002', 'Company B Job', 'Other company', current_date, 7777, 'scheduled');

insert into public.team_members (
  id, company_id, user_id, email, full_name, role, is_active
)
values
  ('41000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', 'job-manager-a@test.local', 'Job Manager A', 'manager', true),
  ('41000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000004', 'job-employee-a@test.local', 'Job Employee A', 'employee', true),
  ('41000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000005', 'job-inactive-a@test.local', 'Job Inactive A', 'employee', false);

insert into public.job_assignments (
  job_id, team_member_id, company_id, assigned_by
)
values
  ('31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001'),
  ('31000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001');

insert into public.job_line_items (
  id, job_id, description, quantity, unit_price, sort_order
)
values (
  '51000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'Install approved material',
  2,
  500,
  1
);

insert into public.tasks (
  id, company_id, job_id, title, status, due_date
)
values (
  '61000000-0000-0000-0000-000000000001',
  '21000000-0000-0000-0000-000000000001',
  '31000000-0000-0000-0000-000000000001',
  'Complete assigned step',
  'pending',
  current_date
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000004","email":"job-employee-a@test.local","role":"authenticated"}',
  true
);

do $$
declare
  v_job_json jsonb;
begin
  select to_jsonb(job_row)
  into v_job_json
  from public.get_my_operational_job('31000000-0000-0000-0000-000000000001') job_row;

  if (select count(*) from public.list_my_operational_jobs()) <> 1 then
    raise exception 'Employee must receive exactly one assigned job';
  end if;

  if exists (
    select 1 from public.list_my_operational_jobs()
    where id <> '31000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Employee received an unassigned or cross-company job';
  end if;

  if (select client_name from public.list_my_operational_jobs()) <> 'Client A' then
    raise exception 'Safe client display field was not returned';
  end if;

  if v_job_json ?| array['estimate_amount', 'quote_id', 'company_id', 'client_id'] then
    raise exception 'Employee job response exposed a protected identifier or price';
  end if;

  if (select count(*) from public.list_my_job_scope('31000000-0000-0000-0000-000000000001')) <> 1 then
    raise exception 'Assigned work scope was not returned';
  end if;

  if (select count(*) from public.list_my_job_tasks('31000000-0000-0000-0000-000000000001')) <> 1 then
    raise exception 'Assigned job task was not returned';
  end if;
end
$$;

select *
from public.set_my_job_task_completed(
  '61000000-0000-0000-0000-000000000001',
  true
);

do $$
begin
  if not (select is_completed from public.list_my_job_tasks('31000000-0000-0000-0000-000000000001')) then
    raise exception 'Employee task completion did not persist';
  end if;

  begin
    perform public.get_my_operational_job('31000000-0000-0000-0000-000000000002');
    raise exception 'Unassigned job access unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.get_my_operational_job('31000000-0000-0000-0000-000000000003');
    raise exception 'Cross-company job access unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000005","email":"job-inactive-a@test.local","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.list_my_operational_jobs()) <> 0 then
    raise exception 'Inactive employee retained job access';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"11000000-0000-0000-0000-000000000003","email":"job-manager-a@test.local","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.list_my_operational_jobs()) <> 2 then
    raise exception 'Manager must receive Company A operational jobs';
  end if;

  if exists (
    select 1 from public.list_my_operational_jobs()
    where id = '31000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'Manager received a cross-company job';
  end if;
end
$$;

rollback;

\echo 'secure_employee_job_access: all tests passed'
