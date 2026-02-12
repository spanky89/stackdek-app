# Distributed Stripe Integration - Deployment Checklist

## ✅ Code Deployment Status

**Git Status:** ✅ Committed and pushed to `origin/main`

**Commit:** `e1b1e43 - Refactor: Distributed Stripe integration - each company has own Stripe account`

**Files Changed:**
- ✅ `MIGRATION_distributed_stripe.sql` - Database schema
- ✅ `api/create-checkout.ts` - Company-specific checkout
- ✅ `api/webhooks/stripe.ts` - Company-specific webhook handling
- ✅ `src/pages/Settings.tsx` - Payment Settings UI
- ✅ `src/pages/QuoteDetail.tsx` - Connection status display
- ✅ `STRIPE_SETUP_GUIDE.md` - Contractor documentation
- ✅ `DISTRIBUTED_STRIPE_IMPLEMENTATION.md` - Technical docs

---

## 🚀 Deployment Steps

### 1. Vercel Deployment

**If GitHub is connected to Vercel** (auto-deploy enabled):
- ✅ Code is already pushed to GitHub
- ⏳ Vercel should automatically detect the push and deploy
- Check: https://vercel.com/your-project/deployments

**If manual deployment needed:**
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
cd stackdek-app
vercel --prod
```

### 2. Database Migration

**Run in Supabase SQL Editor:**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Copy contents of `MIGRATION_distributed_stripe.sql`
3. Paste and click **RUN**
4. Verify columns added:
   ```sql
   SELECT 
     stripe_publishable_key,
     stripe_secret_key,
     stripe_webhook_secret
   FROM companies
   LIMIT 1;
   ```

### 3. Environment Variables (Vercel)

**Check these are set in Vercel:**
- `VITE_SUPABASE_URL` - Your Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `VITE_APP_URL` - Your StackDek domain (e.g., https://stackdek.vercel.app)

**Optional (can remove if using old centralized Stripe):**
- `STRIPE_SECRET_KEY` - No longer needed
- `STRIPE_WEBHOOK_SECRET` - No longer needed

### 4. Test Deployment

**Smoke Test:**
1. ✅ Visit your StackDek URL
2. ✅ Log in with a test account
3. ✅ Go to Settings → Payment Settings
4. ✅ Verify the new "Payment Settings" option appears
5. ✅ Check that input fields for Stripe keys are visible
6. ✅ Copy webhook URL and verify it includes `?companyId=...`

---

## 📋 Post-Deployment Tasks

### For Each Contractor Company

**Send this guide:** `STRIPE_SETUP_GUIDE.md`

**Onboarding Steps:**
1. Create/login to Stripe account
2. Get API keys (test mode first)
3. Add keys to StackDek Settings → Payment Settings
4. Set up webhook in Stripe Dashboard
5. Add webhook secret to StackDek
6. Test with test card
7. Switch to live mode when ready

### Testing Checklist (Per Company)

- [ ] Company adds test Stripe keys
- [ ] Connection status shows "✓ Connected"
- [ ] Create quote with deposit amount
- [ ] Click "Pay Deposit with Stripe"
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Verify quote marked "Deposit Paid"
- [ ] Verify job auto-created
- [ ] Check Stripe Dashboard for payment
- [ ] Verify webhook fired successfully

---

## 🔍 Verification Steps

### 1. API Endpoints Working

**Test Checkout API:**
```bash
curl -X POST https://your-domain.com/api/create-checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "quoteId": "test-quote-id",
    "depositAmount": 100,
    "clientEmail": "test@example.com",
    "clientName": "Test Client",
    "companyName": "Test Company"
  }'
```

Expected: Returns `sessionId`, `url`, and `publishableKey`

**Test Webhook:**
- Create a test payment in Stripe
- Check Vercel logs for webhook POST request
- Verify quote updated in Supabase

### 2. Database Schema

```sql
-- Verify new columns exist
\d companies

-- Check if any companies have Stripe configured
SELECT 
  id, 
  name,
  CASE 
    WHEN stripe_publishable_key IS NOT NULL THEN 'Configured'
    ELSE 'Not Configured'
  END as stripe_status
FROM companies;
```

### 3. Frontend UI

- [ ] Settings page loads without errors
- [ ] Payment Settings menu item visible
- [ ] Input fields for all 3 Stripe keys
- [ ] Webhook URL displays correctly
- [ ] Copy webhook URL button works
- [ ] Save button works
- [ ] Quote detail page shows connection status
- [ ] Pay Deposit button disabled when Stripe not configured

---

## 🐛 Troubleshooting

### Issue: "Stripe not configured" error

**Check:**
1. Keys saved in database?
   ```sql
   SELECT stripe_publishable_key, stripe_secret_key 
   FROM companies 
   WHERE id = 'YOUR_COMPANY_ID';
   ```
2. Keys start with correct prefix? (`pk_`, `sk_`)
3. Using correct mode? (Test vs Live)

### Issue: Webhook not firing

**Check:**
1. Webhook URL correct in Stripe Dashboard?
2. `companyId` parameter included in URL?
3. Webhook secret matches in StackDek Settings?
4. Event `checkout.session.completed` selected in Stripe?
5. Check Stripe webhook logs for errors

### Issue: Payment completes but job not created

**Check:**
1. Webhook verified successfully? (Check Vercel logs)
2. `companyId` in session metadata?
3. Quote exists in database?
4. Company has permission to create jobs?

### Issue: CORS errors

**Check:**
1. `VITE_APP_URL` set correctly in Vercel?
2. API endpoints return proper CORS headers?
3. Auth token passed correctly?

---

## 📊 Monitoring

### What to Monitor

1. **Vercel Functions:**
   - `/api/create-checkout` response times
   - `/api/webhooks/stripe` success rate
   - Error rates

2. **Stripe Dashboard:**
   - Payment success rate
   - Webhook delivery success
   - Failed payments

3. **Supabase:**
   - Database query performance
   - Row-level security violations
   - Auth errors

### Key Metrics

- Payment success rate: Target >95%
- Webhook delivery: Target >99%
- API response time: Target <500ms
- Job auto-creation rate: Should match payment completion rate

---

## 📝 Communication Plan

### Announce to Contractors

**Email Template:**

Subject: 🚀 New Payment Feature: Accept Deposits with Stripe!

Hi [Contractor Name],

Great news! StackDek now supports accepting deposits directly through your own Stripe account.

**What's New:**
- Accept credit card payments from clients
- Deposits paid = jobs auto-created
- Money goes directly to your Stripe account
- No transaction fees from StackDek

**Setup (5 minutes):**
1. Create a free Stripe account (if you don't have one)
2. Get your API keys from Stripe
3. Add them to StackDek Settings → Payment Settings
4. Set up a webhook (we'll show you how)

**Get Started:**
See our step-by-step guide: [Link to STRIPE_SETUP_GUIDE.md]

Questions? Reply to this email or check our docs.

Happy selling!
The StackDek Team

---

### Support Resources

- **Setup Guide:** `/docs/stripe-setup` (host `STRIPE_SETUP_GUIDE.md` here)
- **Technical Docs:** `DISTRIBUTED_STRIPE_IMPLEMENTATION.md`
- **Support Email:** support@stackdek.com

---

## ✅ Final Checklist

**Before marking complete:**

- [ ] Code deployed to Vercel
- [ ] Database migration run successfully
- [ ] Environment variables configured
- [ ] Smoke test passed (UI loads, no errors)
- [ ] At least 1 test company configured and tested
- [ ] Webhook working end-to-end
- [ ] Documentation accessible to contractors
- [ ] Support team briefed on new feature
- [ ] Monitoring/logging in place
- [ ] Rollback plan ready (if needed)

---

## 🔄 Rollback Plan (If Needed)

**If critical issues arise:**

1. **Quick fix:** Disable payment button in UI (feature flag)
2. **Database:** Revert migration (drop columns)
3. **Code:** Revert to previous commit and redeploy
4. **Stripe:** Webhooks can be paused in Stripe Dashboard

**Rollback Command:**
```bash
git revert e1b1e43
git push origin main
# Vercel auto-deploys reverted code
```

---

## 📅 Timeline

- **Code Deployed:** 2026-02-11
- **Database Migrated:** [Pending]
- **First Test:** [Pending]
- **Production Ready:** [Pending]
- **Contractor Rollout:** [Pending]

---

**Status:** 🟡 Code deployed, awaiting database migration and testing

**Next Steps:**
1. Run database migration in Supabase
2. Test with at least 1 contractor
3. Monitor for 24-48 hours
4. Begin contractor rollout

---

**Deployed by:** Subagent  
**Date:** 2026-02-11  
**Commit:** e1b1e43
