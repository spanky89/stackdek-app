\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('60000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner@teamops.test', now(), now()),
  ('60000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'employee@teamops.test', now(), now())
on conflict (id) do nothing;

insert into public.companies (id, owner_id, name, subscription_plan, subscription_status)
values ('60000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-000000000001', 'Team Ops Co', 'pro', 'active');

insert into public.team_members (id, company_id, user_id, email, full_name, role, hourly_rate, is_active)
values (
  '60000000-0000-0000-0000-000000000004',
  '60000000-0000-0000-0000-000000000003',
  '60000000-0000-0000-0000-000000000002',
  'employee@teamops.test', 'Employee Test', 'employee', 25, true
);

insert into public.time_entries (
  id, team_member_id, company_id, clock_in, clock_out, hours_worked,
  hourly_rate_snapshot, labor_cost, activity_summary
) values (
  '60000000-0000-0000-0000-000000000005',
  '60000000-0000-0000-0000-000000000004',
  '60000000-0000-0000-0000-000000000003',
  '2026-07-29 08:00:00', '2026-07-29 16:00:00', 8, 25, 200, 'General work'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000002","email":"employee@teamops.test","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform public.set_time_entry_approval('60000000-0000-0000-0000-000000000005', true);
    raise exception 'Employee unexpectedly approved a time entry';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-0000-0000-000000000001","email":"owner@teamops.test","role":"authenticated"}',
  true
);

select public.correct_team_time_entry(
  '60000000-0000-0000-0000-000000000005',
  '2026-07-29 08:30:00',
  '2026-07-29 16:30:00',
  null,
  'Employee forgot the correct start time'
);
select public.set_time_entry_approval('60000000-0000-0000-0000-000000000005', true);

do $$
declare
  v_entry public.time_entries;
  v_audits integer;
begin
  select * into v_entry
  from public.time_entries
  where id = '60000000-0000-0000-0000-000000000005';

  if v_entry.hours_worked <> 8 or v_entry.labor_cost <> 200 then
    raise exception 'Correction did not recalculate hours and labor';
  end if;
  if v_entry.approval_status <> 'approved' or v_entry.approved_by <> '60000000-0000-0000-0000-000000000001' then
    raise exception 'Owner approval was not recorded';
  end if;

  select count(*) into v_audits
  from public.time_entry_audit
  where time_entry_id = v_entry.id;
  if v_audits <> 2 then
    raise exception 'Expected correction and approval audit rows, got %', v_audits;
  end if;
end;
$$;

rollback;
