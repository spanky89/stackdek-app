\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('71000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@manager.test', now(), now()),
  ('71000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'manager@manager.test', now(), now()),
  ('71000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'employee@manager.test', now(), now()),
  ('71000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'outsider@manager.test', now(), now())
on conflict (id) do nothing;

insert into public.companies (id, owner_id, name, subscription_plan, subscription_status)
values
  ('71000000-0000-0000-0000-000000000010', '71000000-0000-0000-0000-000000000001', 'Manager Test Co', 'pro', 'active'),
  ('71000000-0000-0000-0000-000000000011', '71000000-0000-0000-0000-000000000004', 'Other Co', 'pro', 'active');

insert into public.team_members (id, company_id, user_id, email, full_name, role, hourly_rate, is_active)
values
  ('71000000-0000-0000-0000-000000000020', '71000000-0000-0000-0000-000000000010', '71000000-0000-0000-0000-000000000002', 'manager@manager.test', 'Manager Test', 'manager', 35, true),
  ('71000000-0000-0000-0000-000000000021', '71000000-0000-0000-0000-000000000010', '71000000-0000-0000-0000-000000000003', 'employee@manager.test', 'Employee Test', 'employee', 25, true);

insert into public.clients (id, company_id, name)
values
  ('71000000-0000-0000-0000-000000000030', '71000000-0000-0000-0000-000000000010', 'Own Client'),
  ('71000000-0000-0000-0000-000000000031', '71000000-0000-0000-0000-000000000011', 'Other Client');

insert into public.quotes (id, company_id, client_id, title, amount, status)
values (
  '71000000-0000-0000-0000-000000000032',
  '71000000-0000-0000-0000-000000000010',
  '71000000-0000-0000-0000-000000000030',
  'Manager Quote',
  100,
  'draft'
);

insert into public.time_entries (
  id, team_member_id, company_id, clock_in, clock_out, hours_worked,
  hourly_rate_snapshot, labor_cost, activity_summary
) values
  ('71000000-0000-0000-0000-000000000040', '71000000-0000-0000-0000-000000000021', '71000000-0000-0000-0000-000000000010', '2026-07-30 08:00:00', '2026-07-30 16:00:00', 8, 25, 200, 'Employee work'),
  ('71000000-0000-0000-0000-000000000041', '71000000-0000-0000-0000-000000000020', '71000000-0000-0000-0000-000000000010', '2026-07-30 08:00:00', '2026-07-30 16:00:00', 8, 35, 280, 'Manager work');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"71000000-0000-0000-0000-000000000002","email":"manager@manager.test","role":"authenticated"}',
  true
);

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.clients
  where company_id = '71000000-0000-0000-0000-000000000010';
  if v_count <> 1 then raise exception 'Manager could not read company client'; end if;

  insert into public.clients (company_id, name)
  values ('71000000-0000-0000-0000-000000000010', 'Manager Created');

  update public.clients set name = 'Manager Updated'
  where id = '71000000-0000-0000-0000-000000000030';

  insert into public.quote_line_items (quote_id, description, quantity, unit_price)
  values ('71000000-0000-0000-0000-000000000032', 'Manager line item', 1, 100);

  begin
    insert into public.clients (company_id, name)
    values ('71000000-0000-0000-0000-000000000011', 'Cross-company');
    raise exception 'Manager unexpectedly wrote cross-company client';
  exception when insufficient_privilege then null;
  end;

  update public.team_members set role = 'manager'
  where id = '71000000-0000-0000-0000-000000000021';
  if exists (
    select 1 from public.team_members
    where id = '71000000-0000-0000-0000-000000000021'
      and role = 'manager'
  ) then
    raise exception 'Manager unexpectedly elevated another member';
  end if;
end;
$$;

select public.correct_team_time_entry(
  '71000000-0000-0000-0000-000000000040',
  '2026-07-30 08:30:00',
  '2026-07-30 16:30:00',
  null,
  'Manager correction'
);
select public.set_time_entry_approval('71000000-0000-0000-0000-000000000040', true);

do $$
begin
  begin
    perform public.set_time_entry_approval('71000000-0000-0000-0000-000000000041', true);
    raise exception 'Manager unexpectedly approved own time';
  exception when insufficient_privilege then null;
  end;
end;
$$;

rollback;
