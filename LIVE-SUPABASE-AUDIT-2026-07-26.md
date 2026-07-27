# StackDek Live Supabase Audit — 2026-07-26

Status: read-only discovery complete. No production changes were made.

## Evidence and recovery point

- Project: `duhmbhxlmvczrztccmus`
- Dated export: `C:\Users\x\.openclaw\workspace\StackDek-Supabase-Backups\20260726-214728`
- Export contents:
  - `public-schema.sql` — schema, RLS policies, functions, and triggers
  - `roles.sql` — database roles
  - `public-data.sql` — public-table data snapshot

This audit treats the live export as authoritative where it differs from repository migrations.

## Confirmed live Pro foundation

The live database already contains:

- `team_members`
- `team_invitations`
- `job_assignments`
- `time_entries`
- `job_expenses`

The live team policies correctly reference `companies.owner_id`. The older repository migrations that reference incorrect company fields are stale and must not be applied as-is.

## Critical security findings

### 1. Quotes are globally readable

Live policies grant unrestricted `SELECT` access:

- `Public can view quotes` uses `USING (true)`
- `Public can view quote line items` uses `USING (true)`

The `quotes` table has no public share token. Any anonymous client with the public Supabase credentials can enumerate all quotes and their line items.

Required fix: introduce an unguessable quote share token and restrict anonymous access to a server-controlled/token-validated path. Do not simply remove public access until the existing customer quote-link flow has been mapped and replaced.

### 2. Broader customer and invoice data is publicly readable

Live policies also include:

- `Public can read clients` with `USING (true)`
- `Public can read companies` with `USING (true)`
- `Public can read invoice line items` with `USING (true)`
- anonymous invoice access based only on `invoice_token IS NOT NULL`

Because most public invoice policies do not compare a supplied token within RLS, an anonymous caller can enumerate rows that have tokens. Public document access needs a token-bound server/RPC design.

### 3. Signup company creation is too broad

`Allow signup company creation` permits inserts by both `authenticated` and `anon` with `WITH CHECK (true)`. A separate authenticated policy correctly checks `auth.uid() = owner_id`, but permissive RLS policies are ORed, so the broad policy defeats that protection.

Required fix: prove the current signup path, then replace the broad policy with an authenticated owner-bound insert or a controlled server function.

## Pro authorization gaps

### 4. Managers have no live management permissions

Live policies support company owners and employees acting on their own records. They do not grant managers the intended company-level access to:

- team members and invitations
- job assignments
- team time entries
- expense review/approval

Manager authority should be defined once in non-recursive security-definer helper functions and reused consistently.

### 5. Invitation acceptance is not implemented securely

The schema has invitation tokens, expiration, and acceptance state, but current UI code inserts only an inactive `team_members` row. It does not:

- create a `team_invitations` record
- send or expose a controlled acceptance URL
- validate token, email, expiration, and unused state
- link the accepting `auth.users.id` to `team_members.user_id`
- atomically mark the invitation accepted and member active

Acceptance should be one server-side transaction/RPC. Raw invitation tokens should not be generally selectable.

### 6. Team members can update privileged fields on their own row

`team_members_update` allows a member to update their row with no `WITH CHECK` or column restriction. Through direct Supabase calls, an employee may be able to change fields such as `role`, `hourly_rate`, `company_id`, or `is_active`.

Required fix: owners/managers control privileged fields; members may update only explicitly safe profile fields through a constrained RPC or dedicated profile table.

### 7. Time entries trust client-calculated payroll values

Employees can insert/update their own `time_entries`, including `hours_worked`, `labor_cost`, `company_id`, and potentially arbitrary clock times. There is no confirmed server-side calculation or single-open-clock constraint.

Required fix:

- server-side clock-in/clock-out functions
- derive member/company from `auth.uid()`
- calculate duration and labor cost from stored hourly rate
- prevent overlapping/open duplicate entries
- restrict owner/manager corrections and retain audit fields

### 8. Assignment integrity is under-constrained

Owners can insert assignments, but the policy checks only ownership of the submitted `company_id`. It does not prove that the selected job and team member both belong to that same company.

Required fix: validate the company relationship for all three fields and add a unique `(job_id, team_member_id)` constraint if not already present.

### 9. Expense authorization is incomplete

Employees may submit expenses for assigned jobs, but:

- submitted `company_id` is not derived server-side
- employee update permissions are broad while status is pending
- manager approval is absent
- no delete policy is present
- receipt storage authorization has not yet been proven from the database export

Approval/rejection should use controlled functions with company-role checks.

## Repository/live drift

- Repository migrations 12–15 do not match all live policies and contain stale/broken company lookups.
- Existing migrations must be treated as historical evidence, not replayable production truth.
- A new forward-only migration should replace named policies explicitly and add helper functions/constraints idempotently.

## Safe implementation order

1. Map current public quote/invoice routes and preserve their customer experience.
2. Add secure public-document token/RPC architecture and test it before removing broad policies.
3. Add non-recursive company-role helper functions.
4. Implement transactional invitation acceptance.
5. Replace team/member/assignment/time/expense policies and constraints.
6. Update the existing UI only where Pro functionality requires it.
7. Test with separate Owner A, Owner B, manager, employee, and anonymous sessions.
8. Run Starter regression tests and deploy to preview.
9. Request explicit approval before production RLS/auth/billing changes.

## Required isolation tests

- Anonymous cannot enumerate quotes, invoices, clients, companies, or line items.
- A valid public document link can read only its intended document.
- Owner A cannot read or mutate Company B.
- Manager can perform only the agreed company-management actions.
- Employee sees only their membership, assigned jobs, own time, and permitted expenses.
- Employee cannot self-promote, change pay rate, move companies, or activate themselves.
- Assignment cannot connect a job and member from different companies.
- Clocking cannot forge labor cost, overlap entries, or create multiple open clocks.
- Invitation cannot be reused, used after expiry, or accepted by the wrong email.

