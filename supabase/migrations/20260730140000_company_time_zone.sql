begin;

alter table public.companies
  add column if not exists time_zone text not null default 'America/New_York';

drop function if exists public.get_my_employee_workspace();

create function public.get_my_employee_workspace()
returns table (
  member_id uuid,
  full_name text,
  email text,
  role text,
  hourly_rate numeric,
  company_name text,
  pay_period_frequency text,
  pay_period_start_date date,
  time_zone text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select tm.id, tm.full_name, tm.email, tm.role, tm.hourly_rate,
         c.name, c.pay_period_frequency, c.pay_period_start_date, c.time_zone
  from public.team_members tm
  join public.companies c on c.id = tm.company_id
  where tm.user_id = auth.uid() and tm.is_active = true
  limit 1;
$$;

revoke all on function public.get_my_employee_workspace() from public, anon;
grant execute on function public.get_my_employee_workspace() to authenticated;

commit;
