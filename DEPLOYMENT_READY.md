# 🚀 Stripe Payment Integration - Deployment Ready

## ✅ Pre-Deployment Checklist

### 1. Database Migration
```sql
-- Run this in Supabase SQL Editor
-- File: MIGRATION_stripe_payment_flow.sql
```

- [ ] Open Supabase Dashboard
- [ ] Navigate to SQL Editor
- [ ] Copy contents of `MIGRATION_stripe_payment_flow.sql`
- [ ] Execute migration
- [ ] Verify no errors

### 2. Stripe Configuration

#### Get API Keys
- [ ] Sign up/login to https://dashboard.stripe.com
- [ ] Navigate to Developers → API keys (test mode)
- [ ] Copy **Publishable key** (pk_test_...)
- [ ] Copy **Secret key** (sk_test_...)

#### Configure Webhook (Do this AFTER deploying to Vercel)
- [ ] Navigate to Developers → Webhooks
- [ ] Click "Add endpoint"
- [ ] Endpoint URL: `https://YOUR-APP.vercel.app/api/webhooks/stripe`
- [ ] Events: Select `checkout.session.completed`
- [ ] Click "Add endpoint"
- [ ] Copy **Signing secret** (whsec_...)

### 3. Supabase Service Role Key

- [ ] Open Supabase Dashboard
- [ ] Navigate to Settings → API
- [ ] Scroll to "Project API keys"
- [ ] Copy **service_role** key (starts with `eyJ...`)
- [ ] ⚠️ **NEVER expose this in client code!**

### 4. Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required for all environments (Production, Preview, Development)

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (anon/public key)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role key - SECRET!)

# Stripe
STRIPE_SECRET_KEY=sk_test_... (from Stripe dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (from webhook setup)

# App URL
VITE_APP_URL=https://your-app.vercel.app
```

**Important Notes:**
- `VITE_` prefixed vars are exposed to client (browser)
- Non-prefixed vars are server-side only (API routes)
- Use Production keys in Production environment
- Use Test keys in Preview/Development environments

### 5. Deploy to Vercel

```bash
# If not already initialized
vercel

# Or for production deployment
vercel --prod
```

- [ ] Commit all changes to git
- [ ] Push to GitHub/GitLab/Bitbucket
- [ ] Vercel will auto-deploy (if connected)
- [ ] Or run `vercel --prod` manually
- [ ] Wait for deployment to complete
- [ ] Note your production URL

### 6. Update Stripe Webhook URL

- [ ] Return to Stripe Dashboard → Webhooks
- [ ] Edit your webhook endpoint
- [ ] Update URL to production: `https://YOUR-ACTUAL-DOMAIN.vercel.app/api/webhooks/stripe`
- [ ] Save changes

---

## 🧪 Testing in Production

### Test 1: Deposit Payment Flow

1. **Create a Quote**
   - Navigate to Quotes → Create Quote
   - Add client and amount
   - Save quote

2. **Set Deposit Amount**
   - Open quote detail page
   - Enter deposit amount (e.g., $50)
   - Click "Save Amount"
   - Verify amount saved

3. **Pay with Stripe**
   - Click "💳 Pay Deposit with Stripe"
   - Should redirect to Stripe Checkout
   - Use test card: `4242 4242 4242 4242`
   - Expiry: any future date (e.g., 12/34)
   - CVC: any 3 digits (e.g., 123)
   - ZIP: any 5 digits (e.g., 12345)
   - Click "Pay"

4. **Verify Success**
   - Should redirect back to quote page
   - Deposit status should show "✓ Deposit Paid"
   - Navigate to Jobs list
   - New job should be auto-created
   - Job should reference the quote

5. **Check Webhook**
   - Open Stripe Dashboard → Webhooks
   - Click on your endpoint
   - Check recent events
   - Should see successful `checkout.session.completed` event

### Test 2: Offline Payment

1. Navigate to a quote with deposit amount set
2. Check "Offline payment received" checkbox
3. Verify deposit marked as paid
4. No Stripe charge should occur

### Test 3: Invoice Generation

1. **Navigate to a Job**
   - Go to Jobs list
   - Click on a job (preferably one created from quote)

2. **Generate Invoice**
   - Click "Mark Complete & Generate Invoice"
   - Modal should open
   - Line items should be pre-filled (if from quote)

3. **Edit Line Items**
   - Modify descriptions
   - Change quantities/prices
   - Add new line items
   - Remove line items
   - Verify total updates in real-time

4. **Save Invoice**
   - Click "Save Invoice"
   - Should redirect to Invoices list
   - New invoice should appear
   - Invoice status: "awaiting_payment"
   - Job status: "completed"

5. **Verify Links**
   - Invoice should link to job
   - Invoice should link to quote (if job from quote)

---

## 🔒 Security Verification

- [ ] Webhook signature verification working (check Stripe logs)
- [ ] Service role key NOT exposed in client bundle
- [ ] API endpoints return 401/403 for unauthorized access
- [ ] RLS policies enforced (users can't see other users' data)
- [ ] No Stripe secret keys in client-side code

**Quick Test:**
```bash
# Open browser DevTools → Network tab
# Trigger a Stripe payment
# Check API request to /api/create-checkout
# Verify NO Stripe secret keys in request/response
```

---

## 📊 Monitoring

### Stripe Dashboard
- Monitor test payments: https://dashboard.stripe.com/test/payments
- Check webhook delivery: https://dashboard.stripe.com/test/webhooks
- View logs for debugging

### Vercel Logs
- Check API function logs: Vercel Dashboard → Functions
- Monitor errors and performance
- Review webhook execution logs

### Supabase
- Check database records (quotes, jobs, invoices)
- Monitor RLS policy enforcement
- Review API usage

---

## 🐛 Troubleshooting

### Webhook Not Receiving Events
1. Check webhook URL is correct (https, not http)
2. Verify endpoint is deployed (visit in browser, should return error)
3. Check Stripe webhook signing secret is correct in env vars
4. Review Stripe webhook event logs for errors

### Payment Redirects to Wrong URL
1. Check `VITE_APP_URL` environment variable
2. Ensure it matches your production domain
3. Redeploy if changed

### Job Not Auto-Created
1. Check Stripe webhook logs for errors
2. Verify webhook signature verification passing
3. Check Supabase service role key is correct
4. Review Vercel function logs for errors

### Invoice Modal Not Pre-filling
1. Ensure job has `quote_id` set
2. Verify quote has line items in `quote_line_items` table
3. Check console for errors loading quote items

### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## 📝 Quick Reference

### Stripe Test Cards
```
Success:        4242 4242 4242 4242
Decline:        4000 0000 0000 0002
3D Secure:      4000 0025 0000 3155
Insufficient:   4000 0000 0000 9995
```

### API Endpoints
```
POST /api/create-checkout      - Create Stripe session
POST /api/webhooks/stripe      - Handle Stripe webhooks
```

### Environment Variables
```
VITE_SUPABASE_URL              - Supabase project URL (client)
VITE_SUPABASE_ANON_KEY         - Supabase anon key (client)
VITE_APP_URL                   - Application URL (client)
STRIPE_SECRET_KEY              - Stripe secret (server-only)
STRIPE_WEBHOOK_SECRET          - Webhook signing secret (server-only)
SUPABASE_SERVICE_ROLE_KEY      - Supabase service role (server-only)
```

---

## ✅ Final Checklist Before Launch

- [ ] Database migration executed
- [ ] Stripe test account configured
- [ ] Webhook endpoint created and tested
- [ ] All environment variables set in Vercel
- [ ] Application deployed to Vercel
- [ ] Test deposit payment successful
- [ ] Webhook receives events correctly
- [ ] Job auto-creation working
- [ ] Invoice generation working
- [ ] Offline payment option working
- [ ] No errors in Vercel logs
- [ ] No errors in Stripe webhook logs
- [ ] Security verified (no keys exposed)

---

## 🎉 You're Ready!

Once all checkboxes are complete, your Stripe payment integration is live!

**Need Help?**
- Stripe Support: https://support.stripe.com
- Vercel Support: https://vercel.com/support
- Supabase Docs: https://supabase.com/docs

**Documentation:**
- Full implementation details: `STRIPE_PAYMENT_IMPLEMENTATION.md`
- Setup guide: `STRIPE_INTEGRATION_GUIDE.md`
- Database migration: `MIGRATION_stripe_payment_flow.sql`

---

**Last Updated:** February 11, 2026
**Status:** ✅ Ready for Deployment
**Build:** ✅ Passing (493.11 kB, gzip: 128.34 kB)
