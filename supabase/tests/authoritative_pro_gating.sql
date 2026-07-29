\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('13000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'gate-owner@test.local', now(), now()),
  ('13000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'gate-worker@test.local', now(), now());

insert into public.companies (
  id, owner_id, name, subscription_plan, subscription_status
)
values (
  '23000000-0000-0000-0000-000000000001',
  '13000000-0000-0000-0000-000000000001',
  'Gate Company',
  'basic',
  'active'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","email":"gate-owner@test.local","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.create_team_invitation(
      '23000000-0000-0000-0000-000000000001',
      'gate-worker@test.local',
      'Gate Worker',
      'employee',
      25
    );
    raise exception 'Starter owner created a team invitation';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;
update public.companies
set subscription_plan = 'pro', subscription_status = 'active'
where id = '23000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","email":"gate-owner@test.local","role":"authenticated"}',
  true
);

select public.create_team_invitation(
  '23000000-0000-0000-0000-000000000001',
  'gate-worker@test.local',
  'Gate Worker',
  'employee',
  25
);

reset role;
update public.team_members
set user_id = '13000000-0000-0000-0000-000000000002',
    is_active = true,
    accepted_at = now()
where company_id = '23000000-0000-0000-0000-000000000001'
  and email = 'gate-worker@test.local';

insert into public.jobs (id, company_id, title, date_scheduled)
values (
  '33000000-0000-0000-0000-000000000001',
  '23000000-0000-0000-0000-000000000001',
  'Gated Job',
  current_date
);

insert into public.job_assignments (job_id, team_member_id, company_id, assigned_by)
select
  '33000000-0000-0000-0000-000000000001',
  tm.id,
  tm.company_id,
  '13000000-0000-0000-0000-000000000001'
from public.team_members tm
where tm.company_id = '23000000-0000-0000-0000-000000000001'
  and tm.email = 'gate-worker@test.local';

update public.companies
set subscription_status = 'canceled'
where id = '23000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000001","email":"gate-owner@test.local","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.team_members
      where company_id = '23000000-0000-0000-0000-000000000001') <> 0 then
    raise exception 'Canceled Pro data was exposed';
  end if;

  begin
    perform public.create_team_invitation(
      '23000000-0000-0000-0000-000000000001',
      'second-worker@test.local',
      'Second Worker',
      'employee',
      25
    );
    raise exception 'Canceled Pro owner created a team invitation';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1 from public.team_members
    where company_id = '23000000-0000-0000-0000-000000000001'
      and email = 'gate-worker@test.local'
  ) then
    raise exception 'Downgrade deleted existing team data';
  end if;
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"13000000-0000-0000-0000-000000000002","email":"gate-worker@test.local","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.list_my_operational_jobs()) <> 0 then
    raise exception 'Canceled Pro employee retained assigned-job access';
  end if;

  if public.can_access_operational_job(
    '33000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'Canceled Pro employee retained direct job access';
  end if;

  begin
    perform public.clock_in_to_job(
      '33000000-0000-0000-0000-000000000001',
      'should fail'
    );
    raise exception 'Canceled Pro employee clocked in';
  exception
    when insufficient_privilege then null;
  end;
end;
$$;

reset role;

rollback;
\echo authoritative_pro_gating: all tests passed
