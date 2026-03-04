# StackDek TODO List

## 🚀 LAUNCH READY - 5 Minutes to Go Live

**✅ STRIPE LIVE MODE COMPLETE** (Mar 4, 1:33 AM)
- All Vercel environment variables updated with live keys
- Two webhooks created (subscriptions + connect)
- Webhook signing secrets configured
- App redeployed with live mode

**Final Test (5 min):**
1. Create test quote with $1 deposit
2. Pay with real card
3. Verify webhook fires
4. Confirm quote → job creation

**Then:** READY FOR BETA CUSTOMERS & LEAD CAMPAIGN 🎉

---

## Critical - Revenue Blockers

### Stripe Customer Portal (Cancellation & Billing Management)
**Status:** ✅ COMPLETE (Mar 4, 2:30 AM)  
**Implementation:**
- ✅ Stripe Customer Portal enabled and configured
- ✅ API endpoint created: `/api/create-portal-session`
- ✅ "Manage Subscription" button added to BillingSettings page
- ✅ Users can now: Cancel subscription, update payment method, view invoices
**Deploy Status:** Deployed and ready to test

---

## Scheduled: Lead Blaster Build (4:30 AM - March 4, 2026)

### **NEW: Lead Blaster - Sales Outreach Tool**
**Status:** ⏰ Scheduled for 4:30 AM EST  
**Duration:** 2-3 hours (complete by 7:00 AM)  
**Priority:** HIGH - Revenue generation tool

**What It Does:**
- Simple app for calling/texting 18k contractor leads
- Click Call → Opens phone dialer (TCPA compliant)
- Click Text → Modal with templates → Opens SMS app
- Tracks: Call count, text count, status, notes, last contact
- Filters: Not contacted, interested, callbacks, DNC
- Export progress as CSV
- Mobile-first design

**Build Phases:**
1. **Phase 1 (45 min):** CSV upload, lead display, mobile layout
2. **Phase 2 (45 min):** Call/text buttons, templates, counters
3. **Phase 3 (45 min):** Status tracking, notes, filters
4. **Phase 4 (30 min):** Stats dashboard, export, deploy to Vercel

**Tech Stack:**
- React 19 + TypeScript + Vite
- TailwindCSS (matching StackDek)
- LocalStorage (no backend)
- Papa Parse (CSV)
- Deploy: Vercel

**Expected Results:**
- 100 calls/day capability
- 5-10% interested = 900-1,800 warm leads
- 10-20% conversion = 90-360 customers
- $2,610-10,440/month recurring revenue

**Documentation:** See `LEAD-BLASTER-PLAN.md` (7,152 bytes)

---

## Polish Items

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

### 4. Build Public Request Form
**Status:** Feature planned but not built  
**Issue:** Settings shows request form URL (`/request/{company_id}`) but the page doesn't exist  
**What exists:**
- Settings page with embed code generator
- Internal requests list/detail pages (protected)
- Database table probably exists
**What's missing:**
- Public request form page (`src/pages/RequestFormPublic.tsx`)
- Route in App.tsx for `/request/:companyId`
- Ability for anonymous users to submit requests
**Priority:** Medium (nice-to-have for lead generation)

### 5. Public Invoice Company Logo/Name Display
**Status:** Migration created, needs testing  
**Issue:** Public invoices show "Business Name" instead of real company name, logo not showing  
**Solution:** Added company_logo_url and company_name columns to invoices table  
**Migration:** `13_add_company_logo_to_invoices.sql` (needs to be run in Supabase)  
**Test URL:** https://stackdek-app.vercel.app/invoice/public/3ac3eabe-d78f-489d-aaef-79d818c775d4  
**After migration:** Should show "Barber Landscaping" and logo

### 4. Invoice Detail Button Styling
**Status:** ✅ DONE (Mar 3, 2026)
- Removed "Request via Stripe" button
- Changed all buttons to black background
- Kept delete button red

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
