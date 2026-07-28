begin;

alter table public.tasks
  add column if not exists job_id uuid references public.jobs(id) on delete cascade;

create index if not exists idx_tasks_job_id
  on public.tasks (job_id);

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

revoke all on function public.can_access_operational_job(uuid) from public, anon;
grant execute on function public.can_access_operational_job(uuid) to authenticated;

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
  select
    j.id,
    j.title,
    j.status,
    j.date_scheduled,
    j.location,
    c.name as client_name
  from public.jobs j
  left join public.clients c
    on c.id = j.client_id
   and c.company_id = j.company_id
  where j.status <> 'completed'
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

create or replace function public.get_my_operational_job(p_job_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  date_scheduled date,
  location text,
  status text,
  video_url text,
  photos jsonb,
  client_name text,
  client_phone text,
  client_address text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_access_operational_job(p_job_id) then
    raise exception 'Active job assignment required'
      using errcode = '42501';
  end if;

  return query
  select
    j.id,
    j.title,
    j.description,
    j.date_scheduled,
    j.location,
    j.status,
    j.video_url,
    j.photos,
    c.name,
    c.phone,
    c.address
  from public.jobs j
  left join public.clients c
    on c.id = j.client_id
   and c.company_id = j.company_id
  where j.id = p_job_id;
end;
$$;

create or replace function public.list_my_job_scope(p_job_id uuid)
returns table (
  id uuid,
  description text,
  quantity numeric,
  sort_order integer
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_access_operational_job(p_job_id) then
    raise exception 'Active job assignment required'
      using errcode = '42501';
  end if;

  if exists (
    select 1 from public.job_line_items jli where jli.job_id = p_job_id
  ) then
    return query
    select jli.id, jli.description, jli.quantity, jli.sort_order
    from public.job_line_items jli
    where jli.job_id = p_job_id
    order by jli.sort_order, jli.created_at;
  else
    return query
    select qli.id, qli.description, qli.quantity, qli.sort_order
    from public.jobs j
    join public.quote_line_items qli on qli.quote_id = j.quote_id
    where j.id = p_job_id
    order by qli.sort_order, qli.created_at;
  end if;
end;
$$;

create or replace function public.list_my_job_tasks(p_job_id uuid)
returns table (
  id uuid,
  title text,
  is_completed boolean,
  due_date date
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_access_operational_job(p_job_id) then
    raise exception 'Active job assignment required'
      using errcode = '42501';
  end if;

  return query
  select
    t.id,
    t.title,
    t.status = 'completed',
    t.due_date
  from public.tasks t
  where t.job_id = p_job_id
  order by t.created_at;
end;
$$;

create or replace function public.set_my_job_task_completed(
  p_task_id uuid,
  p_completed boolean
)
returns table (
  id uuid,
  title text,
  is_completed boolean,
  due_date date
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job_id uuid;
begin
  select t.job_id into v_job_id
  from public.tasks t
  where t.id = p_task_id;

  if v_job_id is null or not public.can_access_operational_job(v_job_id) then
    raise exception 'Active job assignment required'
      using errcode = '42501';
  end if;

  return query
  update public.tasks t
  set status = case when p_completed then 'completed' else 'pending' end,
      completed_at = case when p_completed then statement_timestamp() else null end,
      updated_at = statement_timestamp()
  where t.id = p_task_id
  returning t.id, t.title, t.status = 'completed', t.due_date;
end;
$$;

revoke all on function public.list_my_operational_jobs() from public, anon;
revoke all on function public.get_my_operational_job(uuid) from public, anon;
revoke all on function public.list_my_job_scope(uuid) from public, anon;
revoke all on function public.list_my_job_tasks(uuid) from public, anon;
revoke all on function public.set_my_job_task_completed(uuid, boolean) from public, anon;

grant execute on function public.list_my_operational_jobs() to authenticated;
grant execute on function public.get_my_operational_job(uuid) to authenticated;
grant execute on function public.list_my_job_scope(uuid) to authenticated;
grant execute on function public.list_my_job_tasks(uuid) to authenticated;
grant execute on function public.set_my_job_task_completed(uuid, boolean) to authenticated;

commit;
