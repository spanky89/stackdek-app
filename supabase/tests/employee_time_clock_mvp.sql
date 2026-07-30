\set ON_ERROR_STOP on
begin;

insert into auth.users (id, aud, role, email, created_at, updated_at)
values ('50000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'general-clock@test.local', now(), now())
on conflict (id) do nothing;

insert into public.companies (id, owner_id, name, subscription_plan, subscription_status)
values (
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  'General Clock Co', 'pro', 'active'
);

insert into public.team_members (id, company_id, user_id, email, full_name, role, hourly_rate, is_active)
values (
  '50000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000002',
  '50000000-0000-0000-0000-000000000001',
  'general-clock@test.local', 'Mike Employee', 'employee', 24, true
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-0000-0000-000000000001","email":"general-clock@test.local","role":"authenticated"}',
  true
);

-- No assignment and no job are required for payroll time.
select public.clock_in_general(null, null);

do $$
begin
  if not exists (
    select 1 from public.time_entries
    where team_member_id = '50000000-0000-0000-0000-000000000003'
      and job_id is null and clock_out is null
  ) then
    raise exception 'General clock-in did not create an open entry';
  end if;
end;
$$;

select public.clock_out_current('Good day', 'Shop cleanup and equipment maintenance');

do $$
declare v_entry public.time_entries;
begin
  select * into v_entry from public.time_entries
  where team_member_id = '50000000-0000-0000-0000-000000000003'
  order by clock_in desc limit 1;
  if v_entry.clock_out is null or v_entry.activity_summary <> 'Shop cleanup and equipment maintenance' then
    raise exception 'Clock-out summary was not stored';
  end if;
  if v_entry.hourly_rate_snapshot <> 24 then
    raise exception 'Hourly rate was not snapshotted';
  end if;
end;
$$;

rollback;
