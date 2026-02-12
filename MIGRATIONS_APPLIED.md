# StackDek Database Migrations

## Applied to Supabase (CONFIRMED)

### Core Schema
- `SCHEMA.sql` — Initial tables: companies, clients, jobs, quotes, invoices + RLS

### Services & Products
- `MIGRATION_add_services_products_deposits.sql` — services, products, invoice_line_items, quote_line_items tables + RLS for line items

### Company Branding
- `migrations_add_company_branding.sql` — logo_url, tax_id, invoice_notes columns

### Quotes & Line Items
- `migrations/add_quote_status.sql` — added quote status field
- `MIGRATION_quote_line_items_rls.sql` — RLS policies for quote_line_items (SELECT, INSERT, UPDATE, DELETE)

### Invoices
- `MIGRATION_add_invoice_fields.sql` — tax_rate, notes columns

---

## Experimental / Not Applied

These were either abandoned or superseded:
- `MIGRATION_add_reminders_table.sql` — reminders feature (not in MVP)
- `MIGRATION_revenue_goal.sql` — revenue tracking (dashboard exists, not core DB)
- `MIGRATION_stackdek_subscriptions.sql` — subscription billing (future: SaaS tier)
- `MIGRATION_stripe_payment_flow.sql` — old payment attempt (replaced by distributed_stripe)
- `MIGRATION_subscription_billing.sql` — old subscription attempt (not MVP)

---

## Current Status

**Last Applied:** Feb 11, 2026  
**Blocker:** quote_line_items RLS still causing "Cannot coerce" error in public view

---

## Cleanup Plan

Move all `.sql` files into `migrations/` folder:
- Keep applied ones with APPLIED_ prefix
- Archive experimental ones in `migrations/archived/`
- Delete duplicates
