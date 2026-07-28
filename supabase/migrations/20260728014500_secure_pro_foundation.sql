begin;

create or replace function public.is_company_owner(p_company_id uuid)
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
      and c.owner_id = auth.uid()
  );
$$;

create or replace function public.has_company_role(
  p_company_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_company_owner(p_company_id)
    or exists (
      select 1
      from public.team_members tm
      where tm.company_id = p_company_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and tm.role = any (p_roles)
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
  where tm.company_id = p_company_id
    and tm.user_id = auth.uid()
    and tm.is_active = true
  limit 1;
$$;

revoke all on function public.is_company_owner(uuid) from public, anon;
revoke all on function public.has_company_role(uuid, text[]) from public, anon;
revoke all on function public.current_team_member_id(uuid) from public, anon;
grant execute on function public.is_company_owner(uuid) to authenticated;
grant execute on function public.has_company_role(uuid, text[]) to authenticated;
grant execute on function public.current_team_member_id(uuid) to authenticated;

alter table public.time_entries
  add column if not exists hourly_rate_snapshot numeric(10,2),
  add column if not exists corrected_at timestamp without time zone,
  add column if not exists corrected_by uuid references auth.users(id);

create unique index if not exists time_entries_one_open_per_member
  on public.time_entries (team_member_id)
  where clock_out is null;

drop policy if exists team_members_select on public.team_members;
drop policy if exists team_members_insert on public.team_members;
drop policy if exists team_members_update on public.team_members;
drop policy if exists team_members_delete on public.team_members;

create policy team_members_select
on public.team_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_company_role(company_id, array['manager'])
);

create policy team_members_insert
on public.team_members
for insert
to authenticated
with check (public.is_company_owner(company_id));

create policy team_members_update
on public.team_members
for update
to authenticated
using (public.is_company_owner(company_id))
with check (
  public.is_company_owner(company_id)
  and role in ('manager', 'employee')
);

create policy team_members_delete
on public.team_members
for delete
to authenticated
using (public.is_company_owner(company_id));

drop policy if exists team_invitations_select on public.team_invitations;
drop policy if exists team_invitations_insert on public.team_invitations;
drop policy if exists team_invitations_update on public.team_invitations;

create policy team_invitations_select
on public.team_invitations
for select
to authenticated
using (public.is_company_owner(company_id));

create policy team_invitations_insert
on public.team_invitations
for insert
to authenticated
with check (
  public.is_company_owner(company_id)
  and invited_by = auth.uid()
  and accepted = false
);

create policy team_invitations_update
on public.team_invitations
for update
to authenticated
using (public.is_company_owner(company_id))
with check (public.is_company_owner(company_id));

drop policy if exists job_assignments_select on public.job_assignments;
drop policy if exists job_assignments_insert on public.job_assignments;
drop policy if exists job_assignments_delete on public.job_assignments;

create policy job_assignments_select
on public.job_assignments
for select
to authenticated
using (
  public.has_company_role(company_id, array['manager'])
  or team_member_id = public.current_team_member_id(company_id)
);

create policy job_assignments_insert
on public.job_assignments
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['manager'])
  and assigned_by = auth.uid()
  and exists (
    select 1 from public.jobs j
    where j.id = job_id and j.company_id = company_id
  )
  and exists (
    select 1 from public.team_members tm
    where tm.id = team_member_id
      and tm.company_id = company_id
      and tm.is_active = true
  )
);

create policy job_assignments_delete
on public.job_assignments
for delete
to authenticated
using (public.has_company_role(company_id, array['manager']));

drop policy if exists time_entries_select on public.time_entries;
drop policy if exists time_entries_insert on public.time_entries;
drop policy if exists time_entries_update on public.time_entries;

create policy time_entries_select
on public.time_entries
for select
to authenticated
using (
  public.has_company_role(company_id, array['manager'])
  or team_member_id = public.current_team_member_id(company_id)
);

revoke insert, update, delete on public.time_entries from authenticated;

create or replace function public.clock_in_to_job(
  p_job_id uuid,
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
  join public.job_assignments ja on ja.team_member_id = tm.id
  join public.jobs j on j.id = ja.job_id
  where tm.user_id = auth.uid()
    and tm.is_active = true
    and ja.job_id = p_job_id
    and ja.company_id = tm.company_id
    and j.company_id = tm.company_id
  limit 1;

  if v_member.id is null then
    raise exception 'Active assignment required'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.time_entries te
    where te.team_member_id = v_member.id
      and te.clock_out is null
  ) then
    raise exception 'A clock session is already open'
      using errcode = '23505';
  end if;

  insert into public.time_entries (
    team_member_id,
    job_id,
    company_id,
    clock_in,
    notes,
    hourly_rate_snapshot
  )
  values (
    v_member.id,
    p_job_id,
    v_member.company_id,
    statement_timestamp(),
    nullif(trim(p_notes), ''),
    v_member.hourly_rate
  )
  returning * into v_entry;

  return v_entry;
end;
$$;

create or replace function public.clock_out_current(
  p_notes text default null
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
    raise exception 'No open clock session'
      using errcode = 'P0002';
  end if;

  update public.time_entries te
  set clock_out = v_clock_out,
      hours_worked = round(
        (extract(epoch from (v_clock_out - te.clock_in)) / 3600.0)::numeric,
        2
      ),
      labor_cost = case
        when te.hourly_rate_snapshot is null then null
        else round(
          te.hourly_rate_snapshot
          * (extract(epoch from (v_clock_out - te.clock_in)) / 3600.0)::numeric,
          2
        )
      end,
      notes = coalesce(nullif(trim(p_notes), ''), te.notes),
      updated_at = v_clock_out
  where te.id = v_entry.id
  returning * into v_entry;

  return v_entry;
end;
$$;

revoke all on function public.clock_in_to_job(uuid, text) from public, anon;
revoke all on function public.clock_out_current(text) from public, anon;
grant execute on function public.clock_in_to_job(uuid, text) to authenticated;
grant execute on function public.clock_out_current(text) to authenticated;

create or replace function public.create_team_invitation(
  p_company_id uuid,
  p_email text,
  p_full_name text,
  p_role text default 'employee',
  p_hourly_rate numeric default null
)
returns table(invitation_id uuid, invitation_token text, expires_at timestamp without time zone)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_invitation public.team_invitations;
begin
  if not public.is_company_owner(p_company_id) then
    raise exception 'Only the company owner may invite team members'
      using errcode = '42501';
  end if;

  if v_email = '' or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Valid email required'
      using errcode = '22023';
  end if;

  if p_role not in ('manager', 'employee') then
    raise exception 'Invalid team role'
      using errcode = '22023';
  end if;

  if p_hourly_rate is not null and p_hourly_rate < 0 then
    raise exception 'Hourly rate cannot be negative'
      using errcode = '22023';
  end if;

  insert into public.team_members (
    company_id, email, full_name, role, hourly_rate, is_active
  )
  values (
    p_company_id, v_email, trim(p_full_name), p_role, p_hourly_rate, false
  )
  on conflict (company_id, email)
  do update set
    full_name = excluded.full_name,
    role = excluded.role,
    hourly_rate = excluded.hourly_rate,
    is_active = false,
    updated_at = now();

  update public.team_invitations
  set accepted = true
  where company_id = p_company_id
    and lower(email) = v_email
    and accepted = false;

  insert into public.team_invitations (
    company_id, email, role, invited_by
  )
  values (
    p_company_id, v_email, p_role, auth.uid()
  )
  returning * into v_invitation;

  return query
  select v_invitation.id, v_invitation.token, v_invitation.expires_at;
end;
$$;

create or replace function public.accept_team_invitation(p_token text)
returns public.team_members
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invitation public.team_invitations;
  v_member public.team_members;
begin
  if auth.uid() is null or v_email = '' then
    raise exception 'Authenticated email required'
      using errcode = '42501';
  end if;

  select ti.*
    into v_invitation
  from public.team_invitations ti
  where ti.token = p_token
    and ti.accepted = false
    and ti.expires_at > statement_timestamp()
  for update;

  if v_invitation.id is null
     or lower(v_invitation.email) <> v_email then
    raise exception 'Invitation is invalid, expired, or belongs to another account'
      using errcode = '42501';
  end if;

  update public.team_members tm
  set user_id = auth.uid(),
      role = v_invitation.role,
      is_active = true,
      accepted_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where tm.company_id = v_invitation.company_id
    and lower(tm.email) = v_email
    and (tm.user_id is null or tm.user_id = auth.uid())
  returning * into v_member;

  if v_member.id is null then
    raise exception 'Matching team member record not found'
      using errcode = 'P0002';
  end if;

  update public.team_invitations
  set accepted = true
  where id = v_invitation.id;

  return v_member;
end;
$$;

revoke all on function public.create_team_invitation(uuid, text, text, text, numeric) from public, anon;
revoke all on function public.accept_team_invitation(text) from public, anon;
grant execute on function public.create_team_invitation(uuid, text, text, text, numeric) to authenticated;
grant execute on function public.accept_team_invitation(text) to authenticated;

commit;
