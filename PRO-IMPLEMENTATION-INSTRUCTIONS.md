# StackDek Pro Implementation Instructions

**Owner:** Spanky  
**Implementation agent:** Atlas / OpenAI Codex  
**Created:** July 26, 2026  
**Status:** Governing playbook for Pro MVP implementation and testing

## 1. Objective

Finish a reliable, secure StackDek Pro MVP centered on team operations while preserving the existing Starter product.

The finished owner-to-employee workflow is:

1. A paying owner invites a team member.
2. The invited person securely accepts and creates or links an account.
3. The owner assigns that team member to jobs.
4. The employee logs in and sees only assigned work.
5. The employee can review work details, complete allowed tasks, clock time, and submit expenses.
6. The owner can manage roles/status and see labor and approved expenses reflected in job costing.
7. RLS proves that no user can access another company’s data.

## 2. Approved Pro Scope

Build and production-test:

- Team invitations and secure acceptance
- Owner, manager, and employee roles
- Team member activation, deactivation, removal, and role changes
- Hourly rates
- Employee login and dashboard
- Job assignments
- Time tracking
- Employee expense submission and receipt storage
- Job costing using real labor and approved expense data
- Subscription/feature gating required to support these features
- Complete team-related Supabase RLS and authorization

## 3. Explicitly Out of Scope

Do not implement as part of this work:

- Contracts
- E-signatures
- Contract templates
- Marketing campaigns
- Marketing automation
- Email/SMS drip sequences
- Referral campaigns
- Broad redesigns
- New unrelated Starter features

Held features must not be advertised as currently available in Pro. They may be labeled “Coming later” only if Spanky approves that wording.

## 4. Design Preservation Rule

The Starter version is the visual and interaction source of truth.

Do:

- Reuse existing colors, spacing, typography, cards, borders, shadows, buttons, inputs, modals, headers, menus, and mobile patterns.
- Build new Pro screens so they look native to StackDek.
- Add small Pro entry points only where the workflow requires them.
- Preserve existing responsive behavior.
- Prefer extending an existing component over introducing a new visual language.

Do not:

- Redesign the dashboard.
- Restyle or reorganize working Starter pages.
- Change the main navigation except for role-aware visibility or a required Pro entry point.
- Replace working components merely to make the code cleaner.
- Add decorative complexity, new color systems, or unrelated UI libraries.
- Change existing behavior unless a reproduced bug or Pro requirement demands it.

Permitted changes to existing pages are limited to examples such as:

- Team access in Settings
- Assignment controls on job pages
- Labor/expense information in job costing
- Role-aware navigation
- Pro feature gates
- Security fixes

## 5. Safety Rules

### Preserve working systems

- Do not rewrite a working system because duplicate or obsolete files exist.
- First prove which endpoint, migration, environment variable, and database field production actually uses.
- Dead code can remain until the live path is mapped and replacement behavior is verified.
- Fix reproduced problems, not theoretical architecture preferences.

### Production changes

- Begin with read-only inspection and backups.
- Do not change production auth, RLS, Stripe webhooks, Stripe secrets, OAuth, or billing configuration without staging/preview verification.
- Obtain Spanky’s explicit “deploy it” approval immediately before final production auth/RLS/billing changes.
- Make one production system change at a time.
- Keep a tested rollback commit or reverse migration ready.
- Verify the affected workflow immediately after each production change.
- If verification fails, roll back before continuing.

### Secrets

- Never place secrets in Git, documentation, Telegram, screenshots, logs, or remote URLs.
- Use dashboard/CLI authorization rather than asking Spanky to send passwords or service-role keys.
- Do not print environment-variable values during diagnostics.
- Use only variable names in reports.

### Data

- Never delete or rewrite customer data as a cleanup step.
- Back up schema/policies before migrations.
- Prefer additive, reversible migrations.
- Validate existing data before adding constraints.
- Use transactions where practical.

## 6. Stripe Architecture — Do Not Merge These Systems

StackDek intentionally has two distinct Stripe payment flows.

### A. StackDek platform subscriptions

Purpose:

- StackDek bills contractors for Starter/Pro access.

Requirements:

- Use StackDek’s platform Stripe account.
- Maintain one authoritative subscription checkout implementation.
- Maintain one authoritative platform-subscription webhook.
- Store and update the canonical StackDek subscription fields.
- Handle checkout completion, renewal, payment failure, cancellation, and portal management.

### B. Contractor client payments through Stripe Connect

Purpose:

- A contractor connects a Stripe account.
- The contractor’s clients pay quotes/invoices to that connected account.

Requirements:

- Keep this separate from StackDek subscription billing.
- Maintain one authoritative Connect/client-payment webhook path.
- Use connected account IDs rather than per-contractor secret keys.
- Preserve working quote/invoice payment behavior.
- Secure OAuth state with a one-time server-side nonce and ownership verification.

### Stripe change policy

- Do not combine the platform-subscription and Connect payment webhooks.
- Map live Stripe webhook URLs and recent successful events before changing code or configuration.
- Do not rotate signing secrets or endpoints until the replacement is deployed and verified.
- Test subscription events separately from connected-account client-payment events.

## 7. Required Initial Discovery

Before implementation:

1. Obtain one-time Supabase CLI authorization from Spanky.
2. Link project `duhmbhxlmvczrztccmus`.
3. Create a read-only dump/inventory of:
   - Tables and columns
   - Constraints and indexes
   - RLS enablement and policies
   - Functions, triggers, and RPCs
   - Storage buckets and policies
   - Applied migration history when available
4. Compare live state with repository migrations.
5. Identify the live Vercel production branch.
6. Inventory Vercel environment-variable names without printing values.
7. Identify the exact deployed subscription and Connect endpoints.
8. Inspect Stripe webhook endpoint URLs, enabled events, modes, and recent delivery results.
9. Update the code review if a repository finding is not present in production.

No production mutation belongs in this discovery phase.

## 8. Implementation Order

### Phase 0 — Baseline and rollback

- Record current Git commit and branch.
- Commit the review/playbook documents separately.
- Create a dedicated implementation branch from the confirmed production baseline.
- Capture screenshots or smoke-test notes for working Starter flows.
- Verify current production login and core owner workflow.
- Prepare a rollback plan.

### Phase 1 — Urgent security verification

- Check whether universal public quote policies are live.
- Verify public invoice policies and returned fields.
- Verify storage isolation.
- Verify Stripe Connect OAuth state behavior.
- Prepare narrowly scoped fixes for confirmed live vulnerabilities.

### Phase 2 — Canonical subscription mapping

- Select canonical subscription database fields based on live schema.
- Identify the one live platform checkout and subscription webhook.
- Preserve the separate Connect payment system.
- Update only active application paths.
- Verify the stale-customer recovery behavior.
- Test subscription state as read by the UI and feature gates.

### Phase 3 — Team data model and RLS

- Build non-recursive company membership and role checks.
- Prefer tightly scoped `SECURITY DEFINER` helper functions with:
  - Fixed `search_path`
  - Explicit ownership
  - Minimal execute permissions
- Implement policies for:
  - Team members
  - Invitations
  - Job assignments
  - Time entries
  - Expenses
  - Required job/task/client fields
  - Receipt storage
- Ensure policy errors fail closed.

### Phase 4 — Secure invitations

- Owner initiates invite through an authenticated server endpoint/RPC.
- Normalize email addresses.
- Enforce seat and plan limits server-side.
- Create a single-use, expiring invitation.
- Send or expose the approved invitation delivery mechanism.
- Bind acceptance to the intended email/account.
- Atomically link `user_id`, mark accepted, and activate membership.
- Prevent token replay.
- Support safe resend/revoke behavior.

### Phase 5 — Role-aware application shell

- Create one authoritative membership/role loader.
- Protect route groups consistently.
- Unknown role, inactive membership, lookup failure, and policy errors must deny access.
- Owners retain existing Starter navigation and pages.
- Managers and employees see only their approved navigation.
- Direct URL entry must not bypass UI rules.

### Phase 6 — Assignments and employee dashboard

- Owner/authorized manager assigns active team members to jobs.
- Employee dashboard shows only assigned jobs.
- Employee job view exposes only required fields.
- Do not expose quote prices, invoices, billing, company settings, or other restricted data unless explicitly approved.
- Deactivation must remove access immediately.

### Phase 7 — Time tracking

- Use server/database time for clock-in and clock-out.
- Permit only one open time entry per team member.
- Validate active membership and job assignment.
- Prevent overlapping or negative sessions.
- Restrict which fields employees can mutate.
- Snapshot the hourly rate used for labor cost.
- Support owner correction with an audit trail if corrections are added.

### Phase 8 — Expenses and job costing

- Employees submit expenses only for assigned jobs.
- Validate positive amount, allowed category, company/job consistency, and receipt path.
- Owners/managers approve or reject according to the agreed role model.
- Employees cannot self-approve.
- Job costing includes:
  - Labor from validated time entries
  - Approved expenses
  - Existing revenue/estimate data
- Preserve existing job pages; add the minimum matching UI required.

### Phase 9 — Quality and regression

- Make `tsc --noEmit` pass.
- Add lint and type-check scripts.
- Add focused automated tests for critical authorization and payment logic.
- Resolve applicable high-severity dependency findings without blind forced upgrades.
- Run full Starter regression.
- Run complete Pro test matrix.

### Phase 10 — Preview and production

- Push implementation branch.
- Deploy a Vercel preview.
- Use test/staging accounts and Stripe test mode where possible.
- Record test results.
- Present Spanky with a short production decision:
  - Exact problem fixed
  - Exact systems changing
  - Tests passed
  - Rollback method
- Wait for “deploy it.”
- Apply one production layer at a time and smoke-test immediately.

## 9. Authorization Model

### Owner

- Full company access
- Team invitations and removal
- Role and active-status changes
- Hourly rate management
- Job assignment
- Time/expense review and permitted corrections
- Job costing
- Billing and company settings

### Manager

Final manager permissions must be confirmed against the existing product intent, but the default target is:

- Employee dashboard access
- View approved company/team operational data
- Assign employees if enabled
- Review time and expenses if enabled
- No StackDek subscription billing
- No ownership transfer
- No ability to promote self or others to owner

### Employee

- View own membership/profile-safe fields
- View only assigned jobs and required job details
- Clock in/out only for allowed jobs
- Complete only allowed assigned-job tasks
- Submit own expenses
- View own time/expense history
- No team administration
- No company settings or StackDek billing
- No client/quote/invoice administration
- No access to other employees’ private operational/pay data

## 10. Required Security Test Matrix

Use at least:

- Owner A / Company A
- Owner B / Company B
- Manager A
- Employee A
- Inactive Employee A
- Anonymous browser

Test:

### Company isolation

- Company A cannot read or mutate any Company B row by changing UUIDs, URLs, request bodies, or direct Supabase queries.
- Company B cannot access Company A.
- Anonymous users cannot list private tables.

### Public documents

- A valid public token returns exactly one intended document.
- An invalid, expired, or altered token returns nothing.
- Anonymous callers cannot enumerate quotes, line items, invoices, clients, or companies.
- Public responses expose only display-required fields.

### Invitations

- Wrong email/account cannot accept an invitation.
- Expired, revoked, or reused tokens fail.
- Duplicate membership is prevented.
- Seat limits cannot be bypassed with direct API calls.

### Roles and routes

- Employee direct URLs to owner pages fail closed.
- Manager direct URLs follow manager permissions.
- Inactive member loses access immediately.
- Role lookup errors deny access.
- Employee cannot change role, company, rate, or active state.

### Assignments

- Employee sees only assigned jobs.
- Removed assignment removes access.
- Employee cannot assign self or others.
- Cross-company assignments are rejected.

### Time

- Only one open session exists per employee.
- Unassigned/inactive employees cannot clock in.
- Client clock manipulation does not change server-calculated time.
- Employee cannot edit protected fields or another member’s entries.
- Labor cost uses the correct snapshotted rate.

### Expenses

- Employee can submit only to an assigned job.
- Cross-company job IDs fail.
- Invalid/negative amounts fail.
- Receipt access is company-scoped.
- Employee cannot approve own expense.
- Rejected expenses do not enter job cost.

### Platform subscriptions

- New checkout creates or reuses the correct live/test customer.
- Stale customer ID recovery works.
- Checkout completion grants the exact Pro field used by feature gates.
- Renewal preserves access.
- Payment failure changes state as intended.
- Cancellation changes state as intended.
- Billing portal opens and returns to the correct route.

### Stripe Connect client payments

- Contractor can connect only their own company.
- OAuth state cannot be forged or replayed.
- Quote/invoice checkout targets the correct connected account.
- Successful payment updates only the intended quote/invoice/company.
- Platform subscription events cannot trigger client-payment handling.
- Connected-account events cannot alter StackDek subscription status.

### Starter regression

- Google login
- Company loading/creation
- Dashboard
- Clients
- Quotes and public quote view
- Jobs and drag ordering
- Requests
- Tasks
- Invoices and public invoice view
- Contractor Stripe Connect settings
- Client quote/invoice payment
- Account/settings
- Mobile navigation and primary responsive layouts

## 11. Definition of Done

Pro MVP is done only when:

- The full owner invite-to-job-cost workflow works.
- All critical and high-severity findings relevant to the live Pro workflow are fixed or explicitly documented as not applicable.
- Cross-company and anonymous-access tests pass.
- Starter regression passes.
- Platform subscription and Connect payment tests pass independently.
- Type checking and build pass.
- Preview deployment is verified.
- Production changes are approved by Spanky and smoke-tested.
- Rollback steps are documented.
- Customer-facing Pro claims match what is actually live.

## 12. Reporting Rules

Keep updates short and outcome-focused.

Tell Spanky:

- What was confirmed
- What changed
- What passed/failed
- Whether production was touched
- What decision, login, MFA, payment test, or approval is required

Do not overwhelm Spanky with:

- Raw logs
- Every implementation detail
- Long lists of theoretical concerns
- Repeated status messages

When blocked, ask for only the smallest required action.

## 13. Reference Documents

- `CODE-REVIEW-FROM-GPT.md` — prioritized audit findings
- `PRO-MVP-CHECKLIST.md` — original delivery checklist
- `PRO-FEATURES-PLAN.md` — historical Pro planning
- `AUTH-CHANGE-CHECKLIST.md` — auth safety procedures
- `POST-MORTEM-MAR3.md` — production auth incident lessons
- `BRANCH-WORKFLOW.md` — repository branch conventions
- `migrations/` — database migration history

