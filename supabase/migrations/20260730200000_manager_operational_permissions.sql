begin;

-- Managers share the owner's operational workspace, but never ownership,
-- subscription, Stripe, invitation, or role-management powers.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'clients', 'requests', 'jobs', 'tasks', 'quotes', 'invoices',
    'services', 'products'
  ]
  loop
    execute format('drop policy if exists manager_operational_select on public.%I', v_table);
    execute format(
      'create policy manager_operational_select on public.%I for select to authenticated using (public.has_company_role(company_id, array[''manager'']))',
      v_table
    );

    execute format('drop policy if exists manager_operational_insert on public.%I', v_table);
    execute format(
      'create policy manager_operational_insert on public.%I for insert to authenticated with check (public.has_company_role(company_id, array[''manager'']))',
      v_table
    );

    execute format('drop policy if exists manager_operational_update on public.%I', v_table);
    execute format(
      'create policy manager_operational_update on public.%I for update to authenticated using (public.has_company_role(company_id, array[''manager''])) with check (public.has_company_role(company_id, array[''manager'']))',
      v_table
    );
  end loop;

  foreach v_table in array array[
    'clients', 'requests', 'jobs', 'tasks', 'quotes', 'services', 'products'
  ]
  loop
    execute format('drop policy if exists manager_operational_delete on public.%I', v_table);
    execute format(
      'create policy manager_operational_delete on public.%I for delete to authenticated using (public.has_company_role(company_id, array[''manager'']))',
      v_table
    );
  end loop;
end;
$$;

drop policy if exists manager_operational_all on public.client_notes;
create policy manager_operational_all
on public.client_notes
for all
to authenticated
using (
  exists (
    select 1 from public.clients c
    where c.id = client_notes.client_id
      and public.has_company_role(c.company_id, array['manager'])
  )
)
with check (
  exists (
    select 1 from public.clients c
    where c.id = client_notes.client_id
      and public.has_company_role(c.company_id, array['manager'])
  )
);

drop policy if exists manager_operational_all on public.job_line_items;
create policy manager_operational_all
on public.job_line_items
for all
to authenticated
using (
  exists (
    select 1 from public.jobs j
    where j.id = job_line_items.job_id
      and public.has_company_role(j.company_id, array['manager'])
  )
)
with check (
  exists (
    select 1 from public.jobs j
    where j.id = job_line_items.job_id
      and public.has_company_role(j.company_id, array['manager'])
  )
);

drop policy if exists manager_operational_all on public.quote_line_items;
create policy manager_operational_all
on public.quote_line_items
for all
to authenticated
using (
  exists (
    select 1 from public.quotes q
    where q.id = quote_line_items.quote_id
      and public.has_company_role(q.company_id, array['manager'])
  )
)
with check (
  exists (
    select 1 from public.quotes q
    where q.id = quote_line_items.quote_id
      and public.has_company_role(q.company_id, array['manager'])
  )
);

drop policy if exists manager_operational_all on public.invoice_line_items;
create policy manager_operational_all
on public.invoice_line_items
for all
to authenticated
using (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and public.has_company_role(i.company_id, array['manager'])
  )
)
with check (
  exists (
    select 1 from public.invoices i
    where i.id = invoice_line_items.invoice_id
      and public.has_company_role(i.company_id, array['manager'])
  )
);

-- Rebuild assignment writes with explicit same-company checks.
drop policy if exists job_assignments_insert on public.job_assignments;
create policy job_assignments_insert
on public.job_assignments
for insert
to authenticated
with check (
  public.has_company_role(company_id, array['manager'])
  and assigned_by = auth.uid()
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.company_id = job_assignments.company_id
  )
  and exists (
    select 1
    from public.team_members tm
    where tm.id = team_member_id
      and tm.company_id = job_assignments.company_id
      and tm.is_active = true
  )
);

create or replace function public.correct_team_time_entry(
  p_entry_id uuid,
  p_clock_in timestamp without time zone,
  p_clock_out timestamp without time zone,
  p_job_id uuid default null,
  p_reason text default null
)
returns public.time_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.time_entries;
  v_before jsonb;
  v_hours numeric;
  v_actor_member_id uuid;
begin
  select te.* into v_entry
  from public.time_entries te
  where te.id = p_entry_id
  for update;

  if v_entry.id is null then
    raise exception 'Time entry not found' using errcode = 'P0002';
  end if;
  if not public.has_company_role(v_entry.company_id, array['manager']) then
    raise exception 'Manager access required' using errcode = '42501';
  end if;

  v_actor_member_id := public.current_team_member_id(v_entry.company_id);
  if v_actor_member_id is not null and v_actor_member_id = v_entry.team_member_id then
    raise exception 'Managers cannot correct their own time entries' using errcode = '42501';
  end if;
  if p_clock_out <= p_clock_in then
    raise exception 'Clock-out must be after clock-in' using errcode = '22007';
  end if;
  if p_job_id is not null and not exists (
    select 1 from public.jobs j
    where j.id = p_job_id and j.company_id = v_entry.company_id
  ) then
    raise exception 'Job does not belong to this company' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.time_entries other
    where other.team_member_id = v_entry.team_member_id
      and other.id <> v_entry.id
      and other.clock_out is not null
      and tsrange(other.clock_in, other.clock_out, '[)')
          && tsrange(p_clock_in, p_clock_out, '[)')
  ) then
    raise exception 'Corrected time overlaps another entry' using errcode = '23P01';
  end if;

  v_before := to_jsonb(v_entry);
  v_hours := round((extract(epoch from (p_clock_out - p_clock_in)) / 3600.0)::numeric, 2);

  update public.time_entries te
  set clock_in = p_clock_in,
      clock_out = p_clock_out,
      job_id = p_job_id,
      hours_worked = v_hours,
      labor_cost = case when te.hourly_rate_snapshot is null then null
        else round(te.hourly_rate_snapshot * v_hours, 2) end,
      corrected_at = statement_timestamp(),
      corrected_by = auth.uid(),
      approval_status = 'pending',
      approved_at = null,
      approved_by = null,
      updated_at = statement_timestamp()
  where te.id = p_entry_id
  returning * into v_entry;

  insert into public.time_entry_audit (
    time_entry_id, company_id, changed_by, action, before_values, after_values, reason
  ) values (
    v_entry.id, v_entry.company_id, auth.uid(), 'corrected',
    v_before, to_jsonb(v_entry), nullif(trim(p_reason), '')
  );

  return v_entry;
end;
$$;

create or replace function public.set_time_entry_approval(
  p_entry_id uuid,
  p_approved boolean
)
returns public.time_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.time_entries;
  v_before jsonb;
  v_actor_member_id uuid;
begin
  select te.* into v_entry
  from public.time_entries te
  where te.id = p_entry_id
  for update;

  if v_entry.id is null then
    raise exception 'Time entry not found' using errcode = 'P0002';
  end if;
  if not public.has_company_role(v_entry.company_id, array['manager']) then
    raise exception 'Manager access required' using errcode = '42501';
  end if;

  v_actor_member_id := public.current_team_member_id(v_entry.company_id);
  if v_actor_member_id is not null and v_actor_member_id = v_entry.team_member_id then
    raise exception 'Managers cannot approve their own time entries' using errcode = '42501';
  end if;
  if v_entry.clock_out is null then
    raise exception 'Open time entries cannot be approved' using errcode = '22023';
  end if;

  v_before := to_jsonb(v_entry);
  update public.time_entries te
  set approval_status = case when p_approved then 'approved' else 'pending' end,
      approved_at = case when p_approved then statement_timestamp() else null end,
      approved_by = case when p_approved then auth.uid() else null end,
      updated_at = statement_timestamp()
  where te.id = p_entry_id
  returning * into v_entry;

  insert into public.time_entry_audit (
    time_entry_id, company_id, changed_by, action, before_values, after_values
  ) values (
    v_entry.id, v_entry.company_id, auth.uid(),
    case when p_approved then 'approved' else 'unapproved' end,
    v_before, to_jsonb(v_entry)
  );

  return v_entry;
end;
$$;

revoke all on function public.correct_team_time_entry(uuid, timestamp without time zone, timestamp without time zone, uuid, text) from public, anon;
revoke all on function public.set_time_entry_approval(uuid, boolean) from public, anon;
grant execute on function public.correct_team_time_entry(uuid, timestamp without time zone, timestamp without time zone, uuid, text) to authenticated;
grant execute on function public.set_time_entry_approval(uuid, boolean) to authenticated;

commit;
