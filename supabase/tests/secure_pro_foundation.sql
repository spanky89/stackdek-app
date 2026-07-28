\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-a@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'owner-b@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'manager-a@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'employee-a@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'inactive-a@test.local', now(), now()),
  ('10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'invitee-a@test.local', now(), now());

insert into public.companies (id, owner_id, name)
values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Company A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Company B');

insert into public.jobs (id, company_id, title, date_scheduled)
values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Job A', current_date),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'Job B', current_date);

insert into public.team_members (
  id, company_id, user_id, email, full_name, role, hourly_rate, is_active
)
values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'manager-a@test.local', 'Manager A', 'manager', 40, true),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'employee-a@test.local', 'Employee A', 'employee', 30, true),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'inactive-a@test.local', 'Inactive A', 'employee', 25, false);

insert into public.job_assignments (
  id, job_id, team_member_id, company_id, assigned_by
)
values (
  '50000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000004","email":"employee-a@test.local","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.team_members) <> 1 then
    raise exception 'Employee must see only their own team member row';
  end if;
  if (select count(*) from public.job_assignments) <> 1 then
    raise exception 'Employee must see exactly their own assignment';
  end if;
end
$$;

do $$
declare
  v_rows integer;
begin
  update public.team_members
  set role = 'manager'
  where id = '40000000-0000-0000-0000-000000000002';
  get diagnostics v_rows = row_count;
  if v_rows <> 0 then
    raise exception 'Employee privilege escalation unexpectedly succeeded';
  end if;
end
$$;

select public.clock_in_to_job(
  '30000000-0000-0000-0000-000000000001',
  'Started assigned work'
);

do $$
begin
  begin
    perform public.clock_in_to_job(
      '30000000-0000-0000-0000-000000000001',
      null
    );
    raise exception 'Duplicate open clock unexpectedly succeeded';
  exception
    when unique_violation then null;
  end;
end
$$;

do $$
begin
  begin
    perform public.clock_in_to_job(
      '30000000-0000-0000-0000-000000000002',
      null
    );
    raise exception 'Cross-company clock-in unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

reset role;
update public.time_entries
set clock_in = statement_timestamp() - interval '2 hours'
where team_member_id = '40000000-0000-0000-0000-000000000002'
  and clock_out is null;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000004","email":"employee-a@test.local","role":"authenticated"}',
  true
);
select public.clock_out_current('Finished assigned work');

do $$
declare
  v_entry public.time_entries;
begin
  select * into v_entry
  from public.time_entries
  where team_member_id = '40000000-0000-0000-0000-000000000002';

  if v_entry.hours_worked <> 2.00 or v_entry.labor_cost <> 60.00 then
    raise exception 'Server labor calculation failed: hours %, cost %',
      v_entry.hours_worked, v_entry.labor_cost;
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000003","email":"manager-a@test.local","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.team_members) <> 3 then
    raise exception 'Manager must see operational team rows for Company A';
  end if;
  if (select count(*) from public.jobs where company_id = '20000000-0000-0000-0000-000000000002') <> 0 then
    raise exception 'Manager unexpectedly saw Company B jobs';
  end if;
end
$$;

do $$
begin
  begin
    insert into public.job_assignments (
      job_id, team_member_id, company_id, assigned_by
    )
    values (
      '30000000-0000-0000-0000-000000000002',
      '40000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000003'
    );
    raise exception 'Cross-company assignment unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","email":"owner-a@test.local","role":"authenticated"}',
  true
);

create temporary table invitation_result as
select *
from public.create_team_invitation(
  '20000000-0000-0000-0000-000000000001',
  'Invitee-A@Test.Local',
  'Invitee A',
  'employee',
  35
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000006","email":"invitee-a@test.local","role":"authenticated"}',
  true
);

select public.accept_team_invitation(
  (select invitation_token from invitation_result)
);

do $$
begin
  if not exists (
    select 1
    from public.team_members
    where user_id = '10000000-0000-0000-0000-000000000006'
      and is_active = true
      and accepted_at is not null
  ) then
    raise exception 'Invitation acceptance did not activate the member';
  end if;

  begin
    perform public.accept_team_invitation(
      (select invitation_token from invitation_result)
    );
    raise exception 'Invitation replay unexpectedly succeeded';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

rollback;

\echo 'secure_pro_foundation: all tests passed'
