# Code Review From GPT

**Project:** StackDek App  
**Branch reviewed:** `pro-features`  
**Commit reviewed:** `3148b33`  
**Review date:** July 26, 2026  
**Scope:** React frontend, Vercel API functions, Stripe subscriptions/Connect, Supabase schema and RLS migrations, team management, employee workflow, build health, and dependency security.

## Executive Summary

The app builds and the core owner CRM appears structurally sound, but it is not ready to call the Pro/team workflow secure or complete.

The most urgent findings are:

1. A quote migration grants anonymous read access to every quote and every quote line item.
2. Stripe Connect OAuth uses unsigned client-controlled state, allowing a crafted callback to update an arbitrary company through the service-role client.
3. Team, assignment, time-entry, and expense RLS migrations consistently reference nonexistent company columns and include recursive policies.
4. Subscription code uses multiple incompatible database column and environment-variable naming systems, which can prevent successful checkout events from activating Pro.
5. Employee route protection is incomplete and fails open when role lookup fails.

No application code was changed during this review. This file is the only review artifact added.

## Severity Guide

- **Critical:** Possible cross-company exposure, account/payment compromise, or a core production flow cannot safely operate.
- **High:** Major feature failure, authorization weakness, billing inconsistency, or likely production incident.
- **Medium:** Real bug or reliability problem with a narrower impact or workaround.
- **Low:** Maintainability, performance, or cleanup issue that is not immediately dangerous.

---

## Critical Findings

### CR-01 — Public quote RLS exposes all quotes and quote line items

**Evidence**

- `migrations/FIX_quote_public_access_rls.sql:5-10`
- The policies use `FOR SELECT USING (true)` on both `quotes` and `quote_line_items`.
- `src/pages/QuotePublicView.tsx:72` retrieves a quote by ordinary row ID, not by a private public token.

**Impact**

Any anonymous caller with the public Supabase URL/key can query all quote rows and all quote line items, not merely one intentionally shared quote. Depending on the selected columns, this can expose customer details, addresses, descriptions, pricing, and business pipeline data.

**Recommended fix**

Replace universal anonymous policies with a non-guessable public token model similar to invoices. Restrict anonymous quote and line-item access to a valid, unexpired token. Confirm the unsafe policy is removed from the live database rather than merely adding a second policy, because permissive RLS policies are ORed together.

### CR-02 — Stripe Connect callback trusts unsigned, attacker-controlled state

**Evidence**

- `api/stripe/connect-oauth.ts:46-55` puts `companyId`, `userId`, and a timestamp into plain JSON state.
- `api/stripe/connect-callback.ts:39-55` only parses that JSON and checks its timestamp.
- `api/stripe/connect-callback.ts:91-103` uses a service-role Supabase client to update the company ID supplied by state.
- The callback does not verify a signature, nonce stored server-side, authenticated session, or that `companyId` belongs to `userId`.

**Impact**

A crafted OAuth flow can potentially attach an attacker-controlled Stripe account to another StackDek company. Since the callback uses the Supabase service role, RLS does not protect this update. This can redirect future contractor payments or corrupt payment configuration.

**Recommended fix**

Generate a cryptographically random one-time state value, store its hash server-side with the authenticated user/company and short expiry, consume it once in the callback, and independently re-check company ownership before updating. Do not place authoritative IDs in unsigned state.

### CR-03 — Pro/team RLS migrations use nonexistent company columns

**Evidence**

- The base schema defines `companies.id` and `companies.owner_id`: `migrations/00_SCHEMA_base.sql:5-7`.
- Team-related policies repeatedly query `SELECT company_id FROM companies WHERE user_id = auth.uid()`:
  - `migrations/12_add_team_members.sql:51-96`
  - `migrations/13_add_job_assignments.sql:24-45`
  - `migrations/14_add_time_entries.sql:34-57`
  - `migrations/15_add_job_expenses.sql:44-76`

**Impact**

These migrations should fail when created against the documented schema, or their policies will not function if a divergent live schema allowed them. Owner team CRUD, assignments, time entries, and expenses are therefore blocked or unreliable.

**Recommended fix**

Build a single authoritative helper such as a `SECURITY DEFINER` membership/role function with a locked `search_path`, then write non-recursive policies using `companies.id` and `companies.owner_id`. Apply and test in staging with two owners and at least one employee.

### CR-04 — Recursive RLS policies can fail at query time

**Evidence**

- `migrations/12_add_team_members.sql:47-55` queries `team_members` from the `team_members` SELECT policy.
- `migrations/12_add_team_members.sql:92-96` queries `team_invitations` from the `team_invitations` UPDATE policy.
- Downstream assignment/time/expense policies also depend on reading `team_members`.

**Impact**

Postgres can raise infinite-recursion policy errors. A failure in the base membership policy cascades into the entire employee workflow.

**Recommended fix**

Move membership checks into carefully written `SECURITY DEFINER` functions owned by a privileged role, revoke unnecessary execute rights, lock `search_path`, and keep table policies non-recursive.

---

## High-Severity Findings

### HI-01 — Subscription database fields are internally inconsistent

**Evidence**

- `migrations/10_add_subscription_fields.sql:7-14` defines:
  - `subscription_tier`
  - `stripe_customer_id`
  - `stripe_subscription_id`
- `api/create-subscription-checkout.ts:60-64` reads `subscription_stripe_customer_id`.
- `api/webhooks/stripe-subscriptions.ts:76-81` writes:
  - `subscription_plan`
  - `subscription_stripe_subscription_id`
- `src/hooks/useSubscription.ts:67-74` reads `subscription_tier` and `stripe_subscription_id`.
- `src/pages/BillingSettings.tsx:8-12` reads `subscription_plan`.

**Impact**

Checkout can succeed in Stripe while the database update fails or a different part of the UI continues showing Starter/Standard. Cancellation, renewal, and feature gating may each read different fields.

**Recommended fix**

Choose one canonical schema and migrate live data into it. Recommended names: `subscription_tier`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_current_period_end`, and `subscription_cancel_at_period_end`. Update every active endpoint, webhook, hook, and UI to those fields.

### HI-02 — Multiple active subscription implementations can drift or receive the wrong webhook

**Evidence**

Active-looking endpoints include:

- `api/create-subscription-checkout.ts`
- `api/billing/create-subscription.ts`
- `api/stripe-subscription-webhook.ts`
- `api/webhooks/stripe-subscriptions.ts`
- `api/webhooks/stripe-billing.ts`

They use different environment variables, column names, tier names, and prices.

**Impact**

Stripe may be configured to call a handler that does not match the checkout endpoint. Fixes applied to one implementation do not protect the others. Events can update the wrong fields or fail repeatedly.

**Recommended fix**

Identify the single live checkout route and single platform-subscription webhook. Archive or delete obsolete routes after confirming Vercel and Stripe configuration. Document the exact endpoint and environment variables.

### HI-03 — Employee authorization is incomplete and fails open

**Evidence**

- `src/components/EmployeeGuard.tsx:19-31` treats a failed role lookup as `null`.
- `src/components/EmployeeGuard.tsx:46-47` allows users with no readable team record through as owners.
- In `src/App.tsx`, only `/home`, `/clients`, `/jobs`, `/quotes`, and `/invoices` use `EmployeeGuard`.
- Employee-sensitive unguarded routes include creation/detail/edit routes, requests, tasks, account, settings, billing, `/team`, contract demo, and job-costing demo (`src/App.tsx:163-447`).

**Impact**

Once employee RLS access is expanded, employees may reach owner-only screens directly by URL. During RLS errors, the frontend role check explicitly fails open. UI guards are not a substitute for RLS, but they should still be consistent and fail closed.

**Recommended fix**

Create one role-aware route boundary with explicit allowed roles. Unknown/error states must deny access. Protect route groups rather than individual list pages. Back every mutation with correct RLS or an authenticated server authorization check.

### HI-04 — Team “invite” does not send or support an invitation

**Evidence**

- `src/pages/TeamManagement.tsx:124-158` only inserts an inactive `team_members` row.
- It does not create a `team_invitations` record, send email, expose an acceptance route, verify the invite token, or link `auth.users.id`.
- The UI reports “Invitation recorded,” which can look like a successful invitation.

**Impact**

An employee cannot accept the invite and become an active linked user. Team additions are not end-to-end functional.

**Recommended fix**

Use a server-side invite endpoint. Generate/record a one-time token, send the invite, validate email ownership during acceptance, atomically bind `user_id`, mark accepted, activate the member, and invalidate the token.

### HI-05 — Employee time entries are client-calculated and overly editable

**Evidence**

- `src/pages/EmployeeJobView.tsx:228-246` calculates hours in the browser.
- `migrations/14_add_time_entries.sql:50-59` lets employees update their own time-entry row without limiting which columns can change.
- There is no database constraint preventing multiple open entries for one team member.
- `labor_cost` is documented but is not set during clock-out in `EmployeeJobView`.

**Impact**

Employees can potentially alter clock times/hours beyond a controlled clock-out action, create overlapping sessions, and produce incorrect job-cost data. Browser clocks are also user-controlled.

**Recommended fix**

Move clock-in/out into database RPCs or authenticated server endpoints using database/server time. Restrict mutable fields, prevent multiple open sessions with a partial unique index, validate assignment and active status, and snapshot the hourly rate when computing labor cost.

### HI-06 — Dependency audit reports high-severity vulnerabilities

**Evidence**

`npm audit --omit=dev` reported:

- High: `react-router-dom` / `react-router`
- High: `ws`
- Moderate: `qs`
- Total: 4 vulnerable dependency paths, with fixes available.

**Impact**

Not every React Router advisory applies to this client-only Vite usage, but the installed versions are within affected ranges and should not be left unresolved without a documented applicability decision.

**Recommended fix**

Update dependencies in a dedicated branch, run regression tests on auth/routing/public links, and re-run `npm audit`. Do not use `npm audit fix --force` blindly.

### HI-07 — Public quote and invoice flows rely heavily on permissive client-side querying

**Evidence**

- Public pages instantiate/use the browser Supabase client and query several tables.
- `src/pages/InvoicePublic.tsx:89-146` queries invoice, client, company, and related data.
- `src/pages/QuotePublicView.tsx` directly queries quote rows by ID.
- Public-access migrations create multiple permissive policies.

**Impact**

Small RLS mistakes expose whole tables because the browser has direct query capability. CR-01 is an example of this failure mode.

**Recommended fix**

Prefer narrow server endpoints or security-definer RPCs that accept a non-guessable token and return only the fields required to render one public document.

---

## Medium-Severity Findings

### ME-01 — TypeScript does not pass type checking

**Evidence**

`npx tsc --noEmit` produced errors in:

- Supabase environment typing
- CSV import/export relationship handling
- Team member role comparison
- Broken imports in `useSubscription`
- Home task shape
- Invoice public company shape
- Pricing plan keys
- Quote line-item shape

**Impact**

Vite transpiles without type-checking, so the production build passes while known type errors remain. Several errors point to probable runtime bugs.

**Recommended fix**

Add `typecheck: "tsc --noEmit"` and require it in CI before deployment. Fix current errors before using it as a gate.

### ME-02 — No lint or test scripts exist

**Evidence**

- `package.json` has only `dev`, `build`, and `preview`.
- `npm run lint` fails with “Missing script: lint.”
- No automated unit, integration, RLS, or end-to-end suite is configured.

**Impact**

Authorization, billing, and quote/invoice regressions can deploy after only a bundler check.

**Recommended fix**

Add ESLint, type-checking, and a small Playwright end-to-end suite. Add SQL/RLS tests with two companies and employee roles. Make build, type-check, and critical tests required deployment checks.

### ME-03 — Browser code uses `process.env` under Vite

**Evidence**

- `src/pages/BillingSettings.tsx:31,45` reads `process.env.VITE_STRIPE_PRICE_*`.
- Vite browser environment variables should use `import.meta.env`.
- `vite.config.js` does not define a browser `process.env` shim.

**Impact**

The billing module can throw `ReferenceError: process is not defined` in a normal Vite browser build, depending on bundling/runtime behavior.

**Recommended fix**

Use `import.meta.env.VITE_*` and add `vite/client` types. Better still, keep Stripe Price IDs server-side and send a trusted plan slug from the client.

### ME-04 — Client supplies arbitrary Stripe Price ID

**Evidence**

- `src/pages/BillingSettings.tsx:102-112` sends `priceId`.
- `api/create-subscription-checkout.ts:36-39,103-108` accepts that ID and sends it directly to Stripe.

**Impact**

An authenticated owner can submit any Price ID belonging to the platform Stripe account. This may allow checkout against an unintended legacy or low-priced product.

**Recommended fix**

Accept only a plan slug and map it to an allowed Price ID on the server.

### ME-05 — Billing portal uses a different customer column and a nonexistent return route

**Evidence**

- `api/create-billing-portal.ts:43-47` reads `stripe_customer_id`.
- Active checkout currently stores `subscription_stripe_customer_id`.
- `api/create-billing-portal.ts:54` returns to `/dashboard`, but the router defines `/home`, not `/dashboard`.

**Impact**

Customer portal creation may report no subscription even for paying customers. Returning from Stripe goes to the catch-all and then `/login`.

**Recommended fix**

Use the canonical subscription customer field and return to `/settings/billing`.

### ME-06 — CORS configuration is contradictory

**Evidence**

Several API routes set both:

- `Access-Control-Allow-Credentials: true`
- `Access-Control-Allow-Origin: *`

Examples include `api/create-subscription-checkout.ts:20-26`, `api/create-checkout.ts:15-21`, and `api/public/checkout.ts:15-21`.

**Impact**

Browsers reject wildcard origins with credentialed CORS. The routes currently rely on bearer tokens rather than cookies, so this is mainly configuration drift, but it can cause confusing cross-origin failures.

**Recommended fix**

Allow only known StackDek origins and emit the matching origin. Remove credentialed CORS if cookies are not used.

### ME-07 — Employee company lookup uses unscoped `.single()`

**Evidence**

- `src/pages/EmployeeJobView.tsx:252` uses `from('companies').select('id').single()`.
- Similar code appears in employee clock-in and expense paths.

**Impact**

With owner-only company RLS it returns no row; with broad membership RLS it assumes exactly one row. Errors are largely swallowed, causing clock/expense operations to fail without useful feedback.

**Recommended fix**

Use the authenticated team member’s validated `company_id`, returned by a membership query/RPC, rather than querying the entire companies table and assuming one visible row.

### ME-08 — Team member limit is enforced only in the UI

**Evidence**

- `src/pages/TeamManagement.tsx` defines `MAX_MEMBERS = 10`.
- Direct inserts are not protected by a database constraint or server-side plan check.

**Impact**

Users can bypass the limit with direct Supabase calls. It also cannot safely enforce plan entitlements.

**Recommended fix**

Enforce plan and seat limits in a transactional server endpoint or database function.

### ME-09 — Team updates permit risky self-modification

**Evidence**

- `migrations/12_add_team_members.sql:65-70` allows a user to update their own row.
- No column-level restriction prevents changing role, company, active state, or hourly rate.

**Impact**

If the policy is repaired only by changing the bad company columns, employees may be able to promote themselves or modify sensitive employment fields.

**Recommended fix**

Do not give employees direct UPDATE permission on membership rows. Expose a narrow profile-update function for safe fields such as display name.

### ME-10 — Quote pricing configuration contains placeholder and nonexistent plans

**Evidence**

- `src/utils/featureGates.ts:80` uses placeholder `price_pro_monthly`.
- `src/pages/Pricing.tsx:97-124` references `free` and `premium`, but `PRICING_PLANS` defines only `starter` and `pro`.
- TypeScript flags these references.

**Impact**

If the Pricing page is routed/reused, checkout or rendering can fail. It also advertises held features.

**Recommended fix**

Delete or consolidate the obsolete pricing implementation. Use one plan definition shared by display and server-authorized checkout.

### ME-11 — Held Pro features remain advertised as available

**Evidence**

- `src/utils/featureGates.ts:28-34` grants Pro contracts and marketing automation.
- `src/utils/featureGates.ts:82-90` advertises contracts and the full marketing suite.
- `src/App.tsx:415-453` exposes contract and job-costing demo routes to authenticated users.

**Impact**

The app can promise features that are explicitly outside the current Pro MVP, creating customer expectation and billing risk.

**Recommended fix**

Update customer-facing plan copy and hide demo routes from normal navigation/production until ready.

### ME-12 — Storage policy examples are company-agnostic

**Evidence**

- `migrations/SETUP_storage_buckets.md:23-53` allows any authenticated user to upload/read/delete in quote media buckets.
- The policies check only `auth.role() = 'authenticated'`, not ownership/path company.

**Impact**

If these documented policies were applied, any signed-in user may access or delete another company’s quote media when paths are known.

**Recommended fix**

Scope object paths to company/user membership and validate the first path segment in storage RLS. Verify the actual live bucket policies.

---

## Low-Severity / Maintainability Findings

### LO-01 — Production JavaScript bundle is large

**Evidence**

The build produced one approximately 1.25 MB minified JavaScript chunk (about 319 KB gzip), triggering Vite’s chunk-size warning.

**Impact**

Slower first load on weak mobile connections, which matters for field users.

**Recommended fix**

Lazy-load page routes and heavy PDF/chart/admin modules.

### LO-02 — Debug logging exposes identifiers and public tokens in browser consoles

**Evidence**

- `src/pages/InvoicePublic.tsx:89` logs the invoice token.
- Client, quote, and company IDs/data are logged in multiple list/form pages.

**Impact**

Sensitive links and customer data may remain in shared-device browser logs or remote logging tools.

**Recommended fix**

Remove production debug logs or route sanitized diagnostics through an environment-aware logger.

### LO-03 — Build tooling metadata is stale

**Evidence**

The build warns that `caniuse-lite` browser data is six months old.

**Impact**

Minor risk of outdated browser targeting.

**Recommended fix**

Update browserslist data as part of routine dependency maintenance.

### LO-04 — Large amount of obsolete implementation documentation and duplicate code

**Evidence**

The repository contains numerous “complete,” “final,” archived, and overlapping Stripe/MVP documents alongside several competing implementations.

**Impact**

It is difficult to identify the authoritative flow, increasing the chance of fixing or deploying the wrong endpoint.

**Recommended fix**

After production behavior is mapped, create a concise architecture document and move obsolete code/docs to a clearly named archive or remove them through normal Git history.

---

## Verification Results

### Passed

- `npm run build`
- 903 modules transformed successfully.
- No obvious tracked `.env`, private key, Stripe secret key, or GitHub PAT was found by the repository secret-pattern scan.

### Failed or Missing

- `npm run lint` — script does not exist.
- `npx tsc --noEmit` — multiple TypeScript errors.
- Automated tests — no test script/suite exists.
- `npm audit --omit=dev` — 4 vulnerable dependency paths (3 high, 1 moderate).

### Not Verified

The review did not mutate or interrogate the live Supabase schema, Stripe Dashboard, or Vercel environment. Migration findings describe the repository and must be compared with live policies/columns before applying changes. The unsafe public quote policy and Stripe Connect state design should be treated as urgent until proven absent from production.

---

## Recommended Fix Order

1. **Immediately inspect live RLS** for the universal public quote policies. Remove them if present.
2. **Disable or repair Stripe Connect onboarding** before additional contractors connect accounts.
3. **Snapshot the live Supabase schema/policies** and choose canonical subscription fields.
4. **Consolidate platform billing** to one checkout route and one webhook; test checkout, renewal, failure, cancellation, and portal.
5. **Rewrite team RLS architecture** using non-recursive membership helpers and test cross-company isolation.
6. **Build real invite/acceptance** and link users securely.
7. **Protect all employee/owner routes** and make authorization fail closed.
8. **Move clocking and labor calculations server-side** with database constraints.
9. **Add type-checking, linting, RLS tests, and critical Playwright flows** before further production changes.
10. **Update dependencies and remove obsolete plan copy/routes.**

## Minimum Security Test Matrix Before Pro Launch

- Owner A cannot read or mutate Company B data by changing any URL/UUID.
- Anonymous callers cannot list quotes, line items, invoices, clients, or companies.
- A public token returns exactly one intended document and the minimum display fields.
- Employee can see only assigned jobs.
- Employee cannot reach or mutate billing, company settings, client/quote/invoice management, roles, rates, or other employees’ time/expenses.
- Manager permissions match the documented role exactly.
- Deactivated employee loses access immediately.
- Invite is single-use, expires, is email-bound, and cannot be replayed.
- Employee cannot self-promote, change company, change rate, or forge hours/labor cost.
- Only one open time entry can exist per employee.
- Stripe checkout activates the same canonical Pro field read by feature gates.
- Renewal, failed payment, cancellation, and billing portal update/return correctly.
- Stripe Connect callback cannot update a company not bound to the initiating session.

