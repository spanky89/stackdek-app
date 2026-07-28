begin;

-- Canonical entitlement for the live schema. Data is preserved on downgrade;
-- only Pro operations are disabled.
create or replace function public.company_has_active_pro(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.subscription_plan = 'pro'
      and c.subscription_status in ('active', 'trial')
  );
$$;

revoke all on function public.company_has_active_pro(uuid) from public, anon;
grant execute on function public.company_has_active_pro(uuid) to authenticated;

-- All role-based Pro access now depends on the company's current entitlement.
create or replace function public.is_company_owner(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.company_has_active_pro(p_company_id)
    and exists (
      select 1 from public.companies c
      where c.id = p_company_id and c.owner_id = auth.uid()
    );
$$;

create or replace function public.has_company_role(p_company_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.company_has_active_pro(p_company_id)
    and (
      public.is_company_owner(p_company_id)
      or exists (
        select 1 from public.team_members tm
        where tm.company_id = p_company_id
          and tm.user_id = auth.uid()
          and tm.is_active = true
          and tm.role = any (p_roles)
      )
    );
$$;

create or replace function public.current_team_member_id(p_company_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select tm.id
  from public.team_members tm
  where public.company_has_active_pro(p_company_id)
    and tm.company_id = p_company_id
    and tm.user_id = auth.uid()
    and tm.is_active = true
  limit 1;
$$;

create or replace function public.can_access_operational_job(p_job_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.jobs j
    where j.id = p_job_id
      and public.company_has_active_pro(j.company_id)
      and (
        public.has_company_role(j.company_id, array['manager'])
        or exists (
          select 1
          from public.job_assignments ja
          join public.team_members tm on tm.id = ja.team_member_id
          where ja.job_id = j.id
            and ja.company_id = j.company_id
            and tm.company_id = j.company_id
            and tm.user_id = auth.uid()
            and tm.is_active = true
        )
      )
  );
$$;

create or replace function public.list_my_operational_jobs()
returns table (
  id uuid,
  title text,
  status text,
  date_scheduled date,
  location text,
  client_name text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select j.id, j.title, j.status, j.date_scheduled, j.location, c.name
  from public.jobs j
  left join public.clients c
    on c.id = j.client_id and c.company_id = j.company_id
  where j.status <> 'completed'
    and public.company_has_active_pro(j.company_id)
    and (
      public.has_company_role(j.company_id, array['manager'])
      or exists (
        select 1
        from public.job_assignments ja
        join public.team_members tm on tm.id = ja.team_member_id
        where ja.job_id = j.id
          and ja.company_id = j.company_id
          and tm.company_id = j.company_id
          and tm.user_id = auth.uid()
          and tm.is_active = true
      )
    )
  order by j.date_scheduled nulls last, j.created_at;
$$;

-- Defense in depth: every write to a Pro-only table is rejected after a
-- downgrade, including writes made through SECURITY DEFINER RPCs.
create or replace function public.enforce_active_pro_write()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
begin
  v_company_id := coalesce(new.company_id, old.company_id);
  if not public.company_has_active_pro(v_company_id) then
    raise exception 'An active Pro subscription is required'
      using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists enforce_team_members_pro on public.team_members;
create trigger enforce_team_members_pro
before insert or update or delete on public.team_members
for each row execute function public.enforce_active_pro_write();

drop trigger if exists enforce_job_assignments_pro on public.job_assignments;
create trigger enforce_job_assignments_pro
before insert or update or delete on public.job_assignments
for each row execute function public.enforce_active_pro_write();

drop trigger if exists enforce_time_entries_pro on public.time_entries;
create trigger enforce_time_entries_pro
before insert or update or delete on public.time_entries
for each row execute function public.enforce_active_pro_write();

drop trigger if exists enforce_job_expenses_pro on public.job_expenses;
create trigger enforce_job_expenses_pro
before insert or update or delete on public.job_expenses
for each row execute function public.enforce_active_pro_write();

-- Ten invited/active records total per company. This is authoritative; the UI
-- counter is only a convenience.
create or replace function public.enforce_pro_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.team_members tm where tm.company_id = new.company_id) >= 10 then
    raise exception 'Pro supports up to 10 team members'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_team_member_seat_limit on public.team_members;
create trigger enforce_team_member_seat_limit
before insert on public.team_members
for each row execute function public.enforce_pro_seat_limit();

commit;
