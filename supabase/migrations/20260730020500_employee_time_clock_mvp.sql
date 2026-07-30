begin;

alter table public.companies
  add column if not exists pay_period_frequency text not null default 'weekly'
    check (pay_period_frequency in ('weekly', 'biweekly')),
  add column if not exists pay_period_start_date date not null default date '2026-01-04';

alter table public.time_entries
  alter column job_id drop not null,
  add column if not exists activity_summary text;

create or replace function public.clock_in_general(
  p_job_id uuid default null,
  p_notes text default null
)
returns public.time_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member public.team_members;
  v_entry public.time_entries;
begin
  select tm.*
    into v_member
  from public.team_members tm
  where tm.user_id = auth.uid()
    and tm.is_active = true
  limit 1;

  if v_member.id is null then
    raise exception 'Active team membership required' using errcode = '42501';
  end if;

  if not public.company_has_active_pro(v_member.company_id) then
    raise exception 'An active Pro subscription is required' using errcode = '42501';
  end if;

  if p_job_id is not null and not exists (
    select 1
    from public.job_assignments ja
    join public.jobs j on j.id = ja.job_id
    where ja.team_member_id = v_member.id
      and ja.job_id = p_job_id
      and ja.company_id = v_member.company_id
      and j.company_id = v_member.company_id
  ) then
    raise exception 'Active assignment required for selected job' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.time_entries te
    where te.team_member_id = v_member.id and te.clock_out is null
  ) then
    raise exception 'A clock session is already open' using errcode = '23505';
  end if;

  insert into public.time_entries (
    team_member_id, job_id, company_id, clock_in, notes, hourly_rate_snapshot
  )
  values (
    v_member.id, p_job_id, v_member.company_id, statement_timestamp(),
    nullif(trim(p_notes), ''), v_member.hourly_rate
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

drop function if exists public.clock_out_current(text);
drop function if exists public.clock_out_current(text, text);

create function public.clock_out_current(
  p_notes text default null,
  p_activity_summary text default null
)
returns public.time_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.time_entries;
  v_clock_out timestamp without time zone := statement_timestamp();
begin
  select te.*
    into v_entry
  from public.time_entries te
  join public.team_members tm on tm.id = te.team_member_id
  where tm.user_id = auth.uid()
    and tm.is_active = true
    and te.clock_out is null
  for update of te
  limit 1;

  if v_entry.id is null then
    raise exception 'No open clock session' using errcode = 'P0002';
  end if;

  update public.time_entries te
  set clock_out = v_clock_out,
      hours_worked = round((extract(epoch from (v_clock_out - te.clock_in)) / 3600.0)::numeric, 2),
      labor_cost = case
        when te.hourly_rate_snapshot is null then null
        else round(te.hourly_rate_snapshot * (extract(epoch from (v_clock_out - te.clock_in)) / 3600.0)::numeric, 2)
      end,
      notes = coalesce(nullif(trim(p_notes), ''), te.notes),
      activity_summary = nullif(trim(p_activity_summary), ''),
      updated_at = v_clock_out
  where te.id = v_entry.id
  returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.get_my_employee_workspace()
returns table (
  member_id uuid,
  full_name text,
  email text,
  role text,
  hourly_rate numeric,
  company_name text,
  pay_period_frequency text,
  pay_period_start_date date
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select tm.id, tm.full_name, tm.email, tm.role, tm.hourly_rate,
         c.name, c.pay_period_frequency, c.pay_period_start_date
  from public.team_members tm
  join public.companies c on c.id = tm.company_id
  where tm.user_id = auth.uid() and tm.is_active = true
  limit 1;
$$;

revoke all on function public.clock_in_general(uuid, text) from public, anon;
revoke all on function public.clock_out_current(text, text) from public, anon;
revoke all on function public.get_my_employee_workspace() from public, anon;
grant execute on function public.clock_in_general(uuid, text) to authenticated;
grant execute on function public.clock_out_current(text, text) to authenticated;
grant execute on function public.get_my_employee_workspace() to authenticated;

commit;
