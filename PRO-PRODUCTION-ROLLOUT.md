# StackDek Pro Production Rollout

**Prepared:** July 28, 2026  
**Deployed:** July 28, 2026
**App branch:** `pro-mvp-secure-foundation`  
**App checkpoint:** `aeff019`  
**Landing branch:** `pro-mvp-claims-alignment`  
**Landing checkpoint:** `d25cfa6`

## Deployment Result

**GO completed successfully.**

- Fresh backup: `StackDek-Supabase-Backups/20260728-221648`
- App production deployment: `dpl_9dueZir7e92ybrfox3rchTgo1YwM`
- Landing production deployment: `dpl_92q6RrZoHU7TqVAKFDLKh8RkKumZ`
- Prior app rollback deployment: `dpl_8wfayCuCdsEWNP9GkiiQhyhHhoLP`
- Prior landing rollback deployment: `dpl_DBatrEV57b119MZeJMx9JujTt5vG`
- All four migrations applied and remote database lint is clean.
- Both custom domains are aliased to the new Ready deployments.

## Evidence Already Complete

- Four SQL security suites pass.
- Database lint reports no schema errors.
- Production Vite build passes.
- Six Playwright tests pass across desktop Chrome and Pixel 7 dimensions.
- The tested browser workflow covers:
  - Starter blocked from Pro operations.
  - Pro owner invitation creation.
  - Employee invitation acceptance.
  - Job assignment.
  - Employee-only assigned job access.
  - Clock in and clock out.
  - Employee expense submission.
  - Owner expense approval.
  - Correct projected profit.
  - Canceled Pro data preservation with access disabled.
- App preview is Ready with no Vercel runtime errors.
- Landing preview is Ready and no longer claims contracts, e-signatures, or
  marketing automation as live Pro features.

## Preflight Gates

### Gate 1 — Fresh Production Backup

Take a new timestamped production database backup immediately before applying
any migration. Verify the dump is non-empty and contains at least:

- `companies`
- `team_members`
- `jobs`
- `tasks`
- `job_assignments`
- `time_entries`
- `job_expenses`
- storage metadata for `job-receipts`

**Stop if:** the backup command fails, the archive cannot be inspected, or the
live schema differs materially from the July 26 audited backup.

### Gate 2 — Production Billing Configuration

Add the existing Pro Stripe price to Vercel **Production**:

- `VITE_STRIPE_PRICE_PRO=price_1T2uSBFqUBajwnjnBMZ4tpVQ`

The originally proposed price did not exist in the live StackDek Stripe
account. Deployment stopped at the gate, then resumed after explicit approval
to use the verified active live $69/month price above.

Verify these production names exist without printing their secret values:

- `STRIPE_SECRET_KEY_STACKDEK`
- `STRIPE_WEBHOOK_SECRET_STACKDEK`
- `VITE_STRIPE_PRICE_BASIC`
- `VITE_STRIPE_PRICE_PRO`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Stop if:** the Pro price is from the wrong Stripe account/mode or the
subscription webhook is not configured for the StackDek platform account.

### Gate 3 — Final Dry Run

The linked dry run must show exactly these migrations, in this order:

1. `20260728014500_secure_pro_foundation.sql`
2. `20260728020000_secure_employee_job_access.sql`
3. `20260728021500_secure_expenses_and_job_costing.sql`
4. `20260728111500_authoritative_pro_gating.sql`

No seeds or role changes should be included.

**Stop if:** any additional migration appears or any migration is already
partially recorded remotely.

## Authorized Production Sequence

Do not begin this section until Spanky explicitly says **“deploy it.”**

1. Record current production app and landing deployment IDs/URLs.
2. Take and verify the fresh production backup.
3. Add and verify `VITE_STRIPE_PRICE_PRO` in Production.
4. Run the linked Supabase migration push once.
5. Immediately run remote database lint and inspect migration history.
6. Deploy the tested app checkpoint to Production.
7. Smoke-test existing Starter login and core navigation before touching the
   landing page.
8. Run the exact Pro smoke matrix below.
9. Deploy the tested landing claims checkpoint to Production.
10. Verify homepage copy, pricing, metadata, app login, and Vercel/Supabase
    logs.

## Production Smoke Matrix

Use dedicated test identities and record their exact IDs before cleanup.

1. Existing Starter owner can still log in.
2. Starter quote → job → invoice core flow remains usable.
3. Starter owner cannot open Team Management or Job Costing.
4. Pro owner can open Team Management and Job Costing.
5. Pro owner creates an invitation for a clean employee email.
6. Employee accepts once; replay is rejected.
7. Owner assigns employee to one test job.
8. Employee sees the assigned job and cannot see an unassigned job.
9. Employee clocks in and out.
10. Employee submits a small expense without a receipt.
11. Owner approves it and verifies labor, expense, total cost, profit, and
    margin.
12. Cross-company reads and writes remain blocked.
13. Browser console, Vercel logs, Supabase logs, and Stripe webhook deliveries
    contain no hidden failures.

The upgrade/webhook path requires one controlled real Stripe subscription test
or an equivalent signed live webhook replay. A real charge must be separately
confirmed before it is initiated.

## Rollback Triggers

Rollback immediately for any of these:

- Existing Starter login or core quote/job/invoice flow breaks.
- Cross-company access succeeds.
- Starter can perform Pro writes.
- Active Pro employee is blocked after invitation acceptance.
- Subscription webhook changes the wrong company or tier.
- Repeated 5xx errors appear in Vercel or Supabase logs.
- Job costing produces an incorrect total.

## Rollback Procedure

1. Stop the smoke test and do not create more data.
2. Roll the app back to the recorded prior production deployment.
3. Roll the landing page back if its deployment introduced any issue.
4. Leave the new database tables and customer data intact. Do not drop tables
   or delete Pro data during an incident.
5. If necessary, disable new Pro entry points in the application while a
   forward-only database fix is prepared.
6. Compare affected rows with the fresh backup.
7. Restore data only if a verified migration caused corruption. Schema rollback
   is not the first response because the migrations are additive and the prior
   app can run with the new tables dormant.
8. Document the exact failure, deployment ID, user/company IDs, and recovery
   action before retrying.

## Cleanup

- Remove only the dedicated smoke-test company, jobs, team records, time
  entries, expenses, receipts, and auth identities.
- Confirm no real customer row shares an ID or email with a cleanup target.
- Preserve logs and test evidence.
- Update `memory/projects/stackdek.md` and `memory/TODO.md`.
