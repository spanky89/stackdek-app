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

rollback;
\echo authoritative_pro_gating: all tests passed
