# StackDek Pro MVP Checklist

**Scope set:** July 26, 2026  
**Target:** A production-safe Pro tier centered on team operations and job profitability.  
**Not in this MVP:** Contracts/e-signatures and marketing automation.

## Estimated Total

- **Core implementation and local/staging verification:** 12–18 hours
- **Production smoke test and cleanup:** 2–4 hours
- **Expected total:** 14–22 focused hours (roughly 2–3 solid workdays)
- Add contingency if Supabase Auth email delivery or the live schema differs from migrations.

## 1. Confirm the Real Database Schema — 0.5–1 hour

- [ ] Export/inspect current Supabase tables, columns, constraints, functions, and RLS policies.
- [ ] Compare production schema with migrations 12–15.
- [ ] Confirm `companies.id`, `companies.owner_id`, and subscription column names.
- [ ] Back up existing team-related policies before changing them.

**Pass condition:** We have a verified schema and a forward-only corrective migration.

## 2. Fix Team and Invitation RLS — 1.5–3 hours

- [ ] Replace incorrect `companies.user_id` references with the real ownership relationship.
- [ ] Replace incorrect `companies.company_id` selection with `companies.id`.
- [ ] Remove recursive `team_members` policy lookups.
- [ ] Create safe helper functions if needed for company/role checks.
- [ ] Restrict owner, manager, and employee actions explicitly.
- [ ] Ensure users cannot read or change another company's records.
- [ ] Apply equivalent protection to `team_invitations`.

**Test matrix:**

- [ ] Owner can list/add/edit/deactivate/remove members in own company.
- [ ] Manager can perform only approved manager actions.
- [ ] Employee can read only the minimum data needed for their workflow.
- [ ] Unauthenticated users have no access.
- [ ] User from Company A cannot read or mutate Company B.

**Pass condition:** Every allowed action succeeds and every cross-company/unauthorized action fails.

## 3. Complete Secure Invitation and Acceptance — 2–4 hours

- [ ] Owner enters employee name, email, role, and hourly rate.
- [ ] Create one pending invitation with a random, expiring, single-use token.
- [ ] Send invitation email or provide a secure acceptance link.
- [ ] New user signs up or existing user signs in.
- [ ] Verify the signed-in email matches the invitation.
- [ ] Link `team_members.user_id` to the authenticated user.
- [ ] Set `accepted_at`, activate the member, and consume the invitation.
- [ ] Handle expired, reused, wrong-email, duplicate, and canceled invitations.
- [ ] Add resend/cancel invitation controls.

**Pass condition:** A real second account can accept once, log in, and join only the intended company.

## 4. Finish Team Management UI — 1–2 hours

- [ ] Show pending versus active members clearly.
- [ ] Edit role and hourly rate.
- [ ] Activate/deactivate members.
- [ ] Remove members with a clear confirmation.
- [ ] Enforce the Pro team-member limit.
- [ ] Display useful Supabase errors instead of generic failures.
- [ ] Verify mobile layout.

**Pass condition:** The owner can manage the full member lifecycle without using Supabase manually.

## 5. Verify Login, Roles, and Navigation — 1–2 hours

- [ ] Owner lands in the owner app.
- [ ] Manager lands in the employee/team dashboard with manager permissions.
- [ ] Employee lands in the employee dashboard.
- [ ] Inactive/removed users are blocked from company data.
- [ ] Employees cannot reach owner-only pages by typing URLs directly.
- [ ] Refresh, logout/login, password reset, and expired sessions preserve correct access.

**Pass condition:** UI routing and database enforcement agree for every role.

## 6. Verify Job Assignments — 1–2 hours

- [ ] Owner/authorized manager can assign and unassign active team members.
- [ ] Employee sees only assigned jobs.
- [ ] Removed/deactivated employees disappear from assignment choices.
- [ ] Cross-company assignments are impossible.
- [ ] Job detail shows the assigned crew correctly on desktop and mobile.

**Pass condition:** Assignments work end-to-end using real owner and employee accounts.

## 7. Verify Time Tracking and Labor Rates — 1.5–3 hours

- [ ] Employee can clock in only to an assigned job.
- [ ] Employee can clock out and see the completed entry.
- [ ] Prevent or resolve overlapping/open time entries.
- [ ] Owner/manager can review and correct entries with an audit-friendly timestamp.
- [ ] Deactivated users cannot create new entries.
- [ ] Labor cost equals approved hours × that employee's hourly rate.
- [ ] Handle missing rate, overnight time, decimals, and edited entries.

**Pass condition:** A real time entry produces the correct labor cost for the correct job.

## 8. Finish Job Costing in the Real Job Workflow — 2–4 hours

- [ ] Mount the Job Costing tab in the real Job Detail page.
- [ ] Load expenses for the selected company/job instead of mock data.
- [ ] Add/edit/delete material, equipment, subcontractor, and miscellaneous costs.
- [ ] Upload and privately retrieve receipt images.
- [ ] Calculate quoted revenue, actual revenue, labor, expenses, profit, and margin consistently.
- [ ] Show estimated versus actual results.
- [ ] Verify employee expense submission permissions.
- [ ] Verify owner reporting and cross-company isolation.

**Pass condition:** One real job can move from assignment and time entry through expenses to an accurate profit number.

## 9. Pro Subscription Gating and Billing — 1–2 hours

- [ ] Confirm Stripe Pro price and subscription metadata map to the correct database tier.
- [ ] Starter users cannot access team/job-costing functions through UI or direct API calls.
- [ ] Pro users can access all included MVP functions.
- [ ] Upgrade takes effect without manual database edits.
- [ ] Downgrade/cancellation preserves data but disables Pro operations safely.
- [ ] Remove contracts and marketing from current Pro claims or label them clearly as coming later.

**Pass condition:** Paying status reliably controls Pro access without deleting customer data.

## 10. Final Regression and Production Smoke Test — 2–4 hours

- [ ] Build/lint/type-check passes.
- [ ] Starter signup and core quote → job → invoice flow still work.
- [ ] Pro owner upgrades and invites a clean test employee account.
- [ ] Employee accepts, logs in, views assignment, clocks time, and submits an expense.
- [ ] Owner sees the correct labor, expense, profit, and margin.
- [ ] Test mobile browser and desktop browser.
- [ ] Review browser/server/Supabase logs for hidden failures.
- [ ] Verify production environment variables and redirect URLs.
- [ ] Commit, push, deploy, and run a fresh-account smoke test.

**Pass condition:** The complete owner-to-employee-to-profit workflow succeeds in production with no manual database intervention.

## Pro MVP Definition of Done

Pro is MVP-complete only when:

1. A paying owner can invite and manage a team member.
2. The team member can securely accept, log in, and see assigned work.
3. The team member can track time and submit permitted expenses.
4. The owner sees correct job labor, costs, profit, and margin.
5. RLS prevents every tested cross-company access path.
6. Starter remains stable and cannot bypass Pro gating.
7. Contracts and marketing are not represented as currently available.
