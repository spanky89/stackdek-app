# StackDek TODO List

## Critical - Revenue Blockers

### 1. Welcome Email Setup
**Status:** Ready to deploy  
**Time:** 30 minutes  
**Steps:**
- Deploy Edge Function: `supabase/functions/send-welcome-email/index.ts`
- Add `RESEND_API_KEY` to Supabase Edge Function environment
- Run SQL migration: `migrations/welcome-email-trigger.sql`
- Test with new user signup

### 2. Stripe Live Mode
**Status:** Manual switch needed  
**Time:** 30 minutes  
**Steps:**
- Switch Stripe dashboard to live mode
- Update Vercel environment variable `STRIPE_PUBLISHABLE_KEY`
- Update webhook endpoint to production URL
- Test deposit payment flow

---

## High Priority - Testing & Polish

### 3. Test Invoice Creation from Jobs
**Status:** Migration applied, needs testing  
**What to test:**
- Go to completed job
- Click "Create Invoice"
- Verify line item titles show up
- Verify descriptions show up
- Verify quantities/prices/totals calculate
- Verify deposit paid amount shows (if from quote with deposit)
**Migration:** `12_add_title_to_quote_line_items.sql` ✅ Applied

### 4. Invoice Detail & Public Invoice Updates
**Status:** ✅ DONE (Mar 3, 2026)
- Invoice Detail: Removed "Request via Stripe" button, changed buttons to black (except delete stays red)
- Public Invoice: Removed "Pay Now" button, added company logo display next to company name
- Print button changed to black styling

---

## Medium Priority - Pro Features

### 5. Pro Features Database Integration
**Status:** UI complete, database pending  
**Branch:** `pro-features`  
**Time:** 4-6 hours  
**Tasks:**
- Create migrations for contracts, team_members, job_expenses, time_entries tables
- Set up Supabase Storage buckets (receipts, contracts)
- Wire up CRUD operations for all Pro features
- Add RLS policies
- Test with real data
- Merge to staging, then main

### 6. Job Costing Polish
**Status:** UI complete, pending accountant consultation  
**Tasks:**
- Talk to accountant about approach
- Validate liability and compliance
- Add real OCR (Tesseract.js)
- Build manager approval queue
- Export to CSV for accountant

### 7. Marketing Suite Build
**Status:** Planned, not started  
**Time:** 4 weeks  
**Reference:** `MARKETING-SUITE-PLAN.md`

---

## Low Priority - Future Enhancements

### 8. QuickBooks Integration Strategy
**Status:** Research phase  
**Tasks:**
- Consult with accountant
- Define scope (complement vs replace)
- Understand compliance requirements
- Plan integration approach

### 9. Help Documentation
**Status:** Placeholder exists  
**Tasks:**
- Write user guides for each feature
- Add video walkthroughs
- FAQ section
- Onboarding checklist

---

## Completed ✅

- ✅ OAuth login stable
- ✅ Password reset working
- ✅ Photo/video upload fixed
- ✅ Client CSV import with address fields
- ✅ Character encoding fix (arrow symbols)
- ✅ Invoice line items title/notes fix
- ✅ Contract signing UI
- ✅ Team management UI
- ✅ Employee dashboard UI
- ✅ Job costing UI
- ✅ Invoice detail button styling (Mar 3, 2026)

---

*Last updated: March 3, 2026 - 9:39 PM*
