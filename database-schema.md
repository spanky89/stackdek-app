# StackDek Database Schema Documentation

**Database:** Supabase PostgreSQL  
**Connection:** duhmbhxlmvczrztccmus.supabase.co  
**Last Updated:** February 15, 2026, 3:30 AM EST  
**Version:** v1.0 (Pre-Launch)

---

## Table of Contents
1. [Core Tables](#core-tables)
2. [Line Item Tables](#line-item-tables)
3. [Product/Service Catalog](#productservice-catalog)
4. [Supporting Tables](#supporting-tables)
5. [Foreign Key Relationships](#foreign-key-relationships)
6. [Indexes](#indexes)
7. [RLS Policies](#rls-policies)
8. [Triggers & Functions](#triggers--functions)
9. [Known Gaps & Issues](#known-gaps--issues)

---

## Core Tables

### `companies`
Primary business entity; one per user account. All data is scoped to companies.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `owner_id` | UUID | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | | Supabase Auth user |
| `name` | TEXT | NOT NULL | | Business name |
| `phone` | TEXT | | | |
| `email` | TEXT | | | |
| `logo_url` | TEXT | | | S3/Supabase storage URL |
| `tax_id` | TEXT | | | EIN or tax ID number |
| `invoice_notes` | TEXT | | | Default notes for invoices |
| `stripe_publishable_key` | TEXT | | | Distributed Stripe (per-contractor) — LEGACY |
| `stripe_secret_key` | TEXT | | | Stored securely; used for payments — LEGACY |
| `stripe_webhook_secret` | TEXT | | | For validating Stripe webhooks — LEGACY |
| `stripe_connected_account_id` | TEXT | | | **NEW:** Stripe Connect account ID (acc_xxx) |
| `stripe_connect_status` | TEXT | CHECK IN ('disconnected', 'connected', 'pending') | | **NEW:** Connection status |
| `stripe_connected_at` | TIMESTAMP | | | **NEW:** When account was connected |
| `created_at` | TIMESTAMP | | NOW() | |

**Indexes:**
- `idx_companies_stripe_keys ON (id) WHERE stripe_publishable_key IS NOT NULL`

---

### `clients`
Customers for jobs, quotes, and invoices. Scoped to company.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | UUID | NOT NULL, FK → `companies(id)` ON DELETE CASCADE | | |
| `name` | TEXT | NOT NULL | | Client name |
| `email` | TEXT | | | |
| `phone` | TEXT | | | |
| `address` | TEXT | | | Service address |
| `vip` | BOOLEAN | | FALSE | VIP badge in UI |
| `created_at` | TIMESTAMP | | NOW() | |

**No indexes besides PK** (company_id lookups use FK scan; consider adding index if performance issues arise)

---

### `jobs`
Scheduled work. Can be standalone or auto-created from quote deposit payment.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | UUID | NOT NULL, FK → `companies(id)` ON DELETE CASCADE | | |
| `client_id` | UUID | FK → `clients(id)` ON DELETE SET NULL | | Nullable to preserve job if client deleted |
| `quote_id` | UUID | FK → `quotes(id)` ON DELETE SET NULL | | Link to originating quote (if from deposit) |
| `title` | TEXT | NOT NULL | | Job name/description |
| `description` | TEXT | | | Detailed notes |
| `status` | TEXT | CHECK IN ('scheduled', 'in_progress', 'completed', 'cancelled') | 'scheduled' | |
| `lane` | TEXT | CHECK IN ('upcoming', 'in_progress', 'completed') | 'upcoming' | **Kanban column** |
| `order_index` | INTEGER | | 0 | **Position within lane** (for drag-drop) |
| `date_scheduled` | DATE | NOT NULL | | |
| `time_scheduled` | TIME | | | Optional time |
| `estimate_amount` | NUMERIC(10,2) | | | **Can be NULL** (fixed Feb 15, 2 AM) |
| `location` | TEXT | | | Service address |
| `completed_at` | TIMESTAMP | | | Set when status → 'completed' |
| `created_at` | TIMESTAMP | | NOW() | |
| `updated_at` | TIMESTAMP | | NOW() | |

**Indexes:**
- `idx_jobs_lane_order ON (company_id, lane, order_index)` — critical for kanban performance
- `idx_jobs_quote_id ON (quote_id)`

**Critical Note:** `estimate_amount` and `amount` columns had null-safety bug (crashing UI); fixed with `?.toLocaleString() ?? '0'` pattern in Home.tsx, JobStack.tsx, QuoteList.tsx (Feb 15, 2 AM).

---

### `quotes`
Estimates before work begins. Can require deposit → auto-creates job when paid.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | UUID | NOT NULL, FK → `companies(id)` ON DELETE CASCADE | | |
| `client_id` | UUID | NOT NULL, FK → `clients(id)` ON DELETE CASCADE | | |
| `title` | TEXT | NOT NULL | | |
| `amount` | NUMERIC(10,2) | NOT NULL | | Total quote amount |
| `deposit_amount` | NUMERIC(10,2) | | 0 | Required deposit before starting job |
| `deposit_paid` | BOOLEAN | | FALSE | Webhook sets to TRUE on Stripe success |
| `stripe_checkout_session_id` | TEXT | | | Stripe session ID for tracking |
| `deposit_paid_at` | TIMESTAMP | | | Timestamp of payment |
| `tax_rate` | NUMERIC(5,2) | | 0 | Tax % (e.g., 8.5 for 8.5%) |
| `scheduled_date` | DATE | | | Date scheduled to visit client (pre-quote) |
| `scheduled_time` | TIME | | | Time scheduled to visit |
| `expiration_date` | DATE | | | Quote valid until |
| `status` | TEXT | CHECK IN ('pending', 'accepted', 'declined', 'expired', 'draft') | 'draft' | |
| `created_at` | TIMESTAMP | | NOW() | |
| `updated_at` | TIMESTAMP | | NOW() | |

**Indexes:**
- `idx_quotes_stripe_session ON (stripe_checkout_session_id)`
- `idx_quotes_status ON (status)`
- `idx_quotes_company_status ON (company_id, status)`
- `idx_quotes_scheduled_date ON (scheduled_date)`

**Workflow:** Quote with deposit → Stripe checkout → Webhook fires → `deposit_paid=TRUE` → Auto-create job with `quote_id` link.

---

### `invoices`
Final billing after job completion. Can link to job and/or quote.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | UUID | NOT NULL, FK → `companies(id)` ON DELETE CASCADE | | |
| `job_id` | UUID | FK → `jobs(id)` ON DELETE SET NULL | | Link to completed job |
| `quote_id` | UUID | FK → `quotes(id)` ON DELETE SET NULL | | Link to original quote |
| `client_id` | UUID | NOT NULL, FK → `clients(id)` ON DELETE CASCADE | | |
| `invoice_number` | TEXT | UNIQUE | | Auto-generated or manual |
| `amount` | NUMERIC(10,2) | NOT NULL | | **Total invoice amount** |
| `total_amount` | NUMERIC(10,2) | | | Duplicate field (cleanup needed?) |
| `deposit_percentage` | NUMERIC(5,2) | | 25.00 | Deposit % (legacy field?) |
| `tax_rate` | NUMERIC(5,2) | | 0 | Tax % |
| `notes` | TEXT | | | Invoice notes/memo |
| `status` | TEXT | CHECK IN ('draft', 'sent', 'paid', 'overdue', 'cancelled', 'pending', 'awaiting_payment', 'archived') | 'draft' | Status overlap needs cleanup |
| `due_date` | DATE | | | |
| `paid_date` | DATE | | | Set when status → 'paid' |
| `created_at` | TIMESTAMP | | NOW() | |
| `updated_at` | TIMESTAMP | | NOW() | |

**Indexes:**
- `idx_invoices_job_id ON (job_id)`
- `idx_invoices_quote_id ON (quote_id)`

**⚠️ Issue:** Duplicate `amount`/`total_amount` columns; status values overlap (needs consolidation).

---

### `requests`
Inbound lead capture. Can convert to quote or job.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | UUID | NOT NULL, FK → `companies(id)` ON DELETE CASCADE | | |
| `client_name` | TEXT | NOT NULL | | Lead name |
| `client_email` | TEXT | | | |
| `client_phone` | TEXT | | | |
| `service_type` | TEXT | | | Type of work requested |
| `description` | TEXT | | | Details |
| `requested_date` | DATE | | | When they want service |
| `status` | TEXT | | 'pending' | (pending/contacted/converted) |
| `created_at` | TIMESTAMP | | NOW() | |
| `updated_at` | TIMESTAMP | | NOW() | |

**Indexes:**
- `idx_requests_company_id ON (company_id)`
- `idx_requests_status ON (status)`

---

## Line Item Tables

### `quote_line_items`
Itemized breakdown for quotes.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `quote_id` | UUID | NOT NULL, FK → `quotes(id)` ON DELETE CASCADE | | |
| `description` | TEXT | NOT NULL | | Service or product name |
| `quantity` | NUMERIC(10,2) | | 1 | |
| `unit_price` | NUMERIC(10,2) | NOT NULL | 0 | |
| `sort_order` | INTEGER | | 0 | Display order |
| `created_at` | TIMESTAMP | | NOW() | |

**No indexes besides FK** (quote detail queries are small; add if needed).

---

### `invoice_line_items`
Itemized breakdown for invoices.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `invoice_id` | UUID | NOT NULL, FK → `invoices(id)` ON DELETE CASCADE | | |
| `description` | TEXT | NOT NULL | | |
| `quantity` | NUMERIC(10,2) | | 1 | |
| `unit_price` | NUMERIC(10,2) | NOT NULL | 0 | |
| `sort_order` | INTEGER | | 0 | |
| `created_at` | TIMESTAMP | | NOW() | |

**No indexes besides FK.**

---

## Product/Service Catalog

### `services`
Reusable service catalog (used in quick-add for quotes/invoices).

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | UUID | NOT NULL, FK → `companies(id)` ON DELETE CASCADE | | |
| `name` | TEXT | NOT NULL | | Service name |
| `description` | TEXT | | | |
| `price` | NUMERIC(10,2) | NOT NULL | 0 | Default price |
| `created_at` | TIMESTAMP | | NOW() | |
| `updated_at` | TIMESTAMP | | NOW() | |

**No indexes besides FK.**

---

### `products`
Reusable product catalog (materials, items).

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `company_id` | UUID | NOT NULL, FK → `companies(id)` ON DELETE CASCADE | | |
| `name` | TEXT | NOT NULL | | Product name |
| `description` | TEXT | | | |
| `price` | NUMERIC(10,2) | NOT NULL | 0 | |
| `created_at` | TIMESTAMP | | NOW() | |
| `updated_at` | TIMESTAMP | | NOW() | |

**No indexes besides FK.**

---

## Supporting Tables

### `signups`
Landing page email signups (pre-auth). Links to auth.users after confirmation.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | UUID | PRIMARY KEY | `gen_random_uuid()` | |
| `email` | TEXT | NOT NULL | | |
| `company_name` | TEXT | | | Optional during signup |
| `user_id` | UUID | FK → `auth.users(id)` | | Set after account confirmation |
| `confirmed` | BOOLEAN | | FALSE | Auto-updated by trigger |
| `confirmed_at` | TIMESTAMPTZ | | | |
| `created_at` | TIMESTAMPTZ | | NOW() | |

**No indexes besides PK.**

---

## Foreign Key Relationships

```
auth.users (Supabase managed)
  └─> companies.owner_id (ON DELETE CASCADE)

companies
  ├─> clients.company_id (ON DELETE CASCADE)
  ├─> jobs.company_id (ON DELETE CASCADE)
  ├─> quotes.company_id (ON DELETE CASCADE)
  ├─> invoices.company_id (ON DELETE CASCADE)
  ├─> requests.company_id (ON DELETE CASCADE)
  ├─> services.company_id (ON DELETE CASCADE)
  └─> products.company_id (ON DELETE CASCADE)

clients
  ├─> jobs.client_id (ON DELETE SET NULL)
  ├─> quotes.client_id (ON DELETE CASCADE)
  └─> invoices.client_id (ON DELETE CASCADE)

quotes
  ├─> quote_line_items.quote_id (ON DELETE CASCADE)
  ├─> jobs.quote_id (ON DELETE SET NULL)
  └─> invoices.quote_id (ON DELETE SET NULL)

jobs
  └─> invoices.job_id (ON DELETE SET NULL)

invoices
  └─> invoice_line_items.invoice_id (ON DELETE CASCADE)
```

**Design Notes:**
- `CASCADE` used where child data is meaningless without parent (line items, company data)
- `SET NULL` used where historical records should persist (job keeps existing if client deleted)

---

## Indexes

| Table | Index Name | Columns | Notes |
|-------|-----------|---------|-------|
| companies | `idx_companies_stripe_keys` | `(id)` WHERE `stripe_publishable_key IS NOT NULL` | Partial index |
| jobs | `idx_jobs_lane_order` | `(company_id, lane, order_index)` | **Critical for kanban** |
| jobs | `idx_jobs_quote_id` | `(quote_id)` | |
| quotes | `idx_quotes_stripe_session` | `(stripe_checkout_session_id)` | Webhook lookups |
| quotes | `idx_quotes_status` | `(status)` | |
| quotes | `idx_quotes_company_status` | `(company_id, status)` | Compound filter |
| quotes | `idx_quotes_scheduled_date` | `(scheduled_date)` | |
| invoices | `idx_invoices_job_id` | `(job_id)` | |
| invoices | `idx_invoices_quote_id` | `(quote_id)` | |
| requests | `idx_requests_company_id` | `(company_id)` | |
| requests | `idx_requests_status` | `(status)` | |

**Missing Indexes (consider adding if queries slow down):**
- `clients(company_id)` — no explicit index; relies on FK scan
- `quote_line_items(quote_id)` — small result sets, may not be needed
- `invoice_line_items(invoice_id)` — small result sets

---

## RLS Policies

**All tables use Row Level Security (RLS).**  
**Pattern:** Users can only access data where `company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())`

### `companies`
- `SELECT`: `auth.uid() = owner_id`
- `INSERT`: `auth.uid() = owner_id`
- `UPDATE`: `auth.uid() = owner_id`

### `clients`, `jobs`, `quotes`, `invoices`, `requests`, `services`, `products`
- `SELECT`: `company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())`
- `INSERT`: `company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())`
- `UPDATE`: `company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())`
- `DELETE`: `company_id IN (SELECT id FROM companies WHERE owner_id = auth.uid())`

### `quote_line_items`, `invoice_line_items`
- `SELECT`: `quote_id/invoice_id IN (SELECT id FROM quotes/invoices WHERE company_id IN ...)`
- `INSERT`: Same nested check
- `UPDATE`: Same nested check
- `DELETE`: Same nested check

### `signups`
- `INSERT`: `WITH CHECK (true)` — allows anon signups
- `SELECT`: `auth.uid() = user_id` — users can only see their own signup record

**⚠️ Performance Note:** Nested RLS checks can be slow on large datasets. Consider creating an `auth.uid()` function-based index or denormalizing `owner_id` to child tables if queries slow down.

---

## Triggers & Functions

### `update_signup_confirmed()`
**Trigger:** `on_user_confirmed` on `auth.users` (AFTER UPDATE)  
**Purpose:** Auto-update `signups.confirmed = true` when user confirms email  
**Security:** `SECURITY DEFINER` (runs with creator privileges)

```sql
CREATE OR REPLACE FUNCTION update_signup_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE signups
    SET confirmed = true, confirmed_at = NEW.email_confirmed_at
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**No other triggers currently deployed.**

---

## Known Gaps & Issues

### 🔴 Critical Issues
1. **Invoice status overlap** — Multiple CHECK constraint values overlap (`'paid'` vs `'awaiting_payment'`); needs consolidation
2. **Duplicate amount columns** — `invoices.amount` vs `invoices.total_amount` (which is canonical?)
3. **Null-safety bug fixed (Feb 15, 2 AM)** — `estimate_amount` and `amount` fields were crashing UI when NULL; fixed with optional chaining

### 🟡 Schema Cleanup Needed
4. **Deposit percentage field** — `invoices.deposit_percentage` appears unused (quotes have `deposit_amount` instead)
5. **Tasks table migration exists but unused** — `06_add_tasks_table.sql` and `07_add_recurring_tasks.sql` in migrations folder but not live
6. **No DELETE policies documented** — Verify that all tables have DELETE policies (likely exist but not captured in base schema docs)

### 🟢 Performance Optimizations (Future)
7. **Add `owner_id` to child tables** — Denormalize `owner_id` to `jobs`, `quotes`, `invoices` to avoid nested RLS lookups
8. **Add `clients(company_id)` index** — Currently relies on FK scan; explicit index may help
9. **Consider materialized view for dashboard** — Revenue goals, job counts, etc. could benefit from caching

### 🔵 Feature Gaps (Post-Launch)
10. **No payment history table** — Stripe webhooks update `deposit_paid` flag but don't log transaction details
11. **No audit log** — No `updated_by` or change history tracking
12. **No soft deletes** — All deletes are hard deletes (consider `deleted_at` column pattern)
13. **No file attachments table** — Photos, documents, contracts (future feature)
14. **No recurring billing** — `subscriptions` table exists in archived migrations but not live

---

## Migration Checklist (For Future Changes)

When creating migrations:
1. ✅ Use `IF NOT EXISTS` for all `CREATE TABLE` and `ADD COLUMN` statements
2. ✅ Drop and recreate constraints/policies if modifying (avoid conflicts)
3. ✅ Add indexes for any new foreign keys
4. ✅ Add RLS policies immediately (don't forget DELETE policies)
5. ✅ Use `SECURITY DEFINER` carefully (audit access)
6. ✅ Test with `auth.uid()` set to a real user UUID
7. ✅ Document new columns in this file

---

## Schema Inspection Script

Run `scripts/inspect-schema.sql` in Supabase SQL Editor to generate live schema dump.

**Output includes:**
- All tables, columns, types, defaults, constraints
- Foreign keys with cascade rules
- Indexes (including partial indexes)
- RLS policies (commands, quals, with_check clauses)
- Check constraints
- Triggers and functions
- Enums (if any)
- Table sizes and row counts

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | Feb 15, 2026 | Initial comprehensive documentation (pre-launch) |

---

**Maintained by:** Milo (OpenClaw Agent)  
**For Questions:** Check `MEMORY.md` or `stackdek-app/migrations/` folder  
**Deployment:** Vercel (app) + Supabase (database)
