# StackDek Deployment Checklist

## ✅ Code Changes Complete

All code has been committed and pushed to GitHub:
- Repository: https://github.com/spanky89/stackdek-app.git
- Commit: c148db6
- Branch: main

---

## 📝 Pre-Deployment Tasks

### 1. Database Setup (Supabase)
- [ ] Log into Supabase Dashboard
- [ ] Open SQL Editor
- [ ] Run `MIGRATION_distributed_stripe.sql`
- [ ] Run `MIGRATION_subscription_billing.sql`
- [ ] Verify companies table has new columns

### 2. Stripe Setup (Platform Billing)
- [ ] Log into Stripe Dashboard
- [ ] Go to Products → Create Product
  - [ ] Create "Pro Plan" - $29/month recurring
  - [ ] Copy Price ID (starts with `price_...`)
  - [ ] Create "Premium Plan" - $99/month recurring
  - [ ] Copy Price ID (starts with `price_...`)
- [ ] Go to Developers → API Keys
  - [ ] Copy Publishable Key (`pk_live_...` or `pk_test_...`)
  - [ ] Copy Secret Key (`sk_live_...` or `sk_test_...`)
- [ ] Go to Developers → Webhooks
  - [ ] Add endpoint: `https://[your-app].vercel.app/api/webhooks/stripe-billing`
  - [ ] Select events:
    - [ ] checkout.session.completed
    - [ ] customer.subscription.updated
    - [ ] customer.subscription.deleted
    - [ ] invoice.payment_failed
  - [ ] Copy Webhook Secret (`whsec_...`)

---

## 🚀 Vercel Deployment

### Option A: Deploy via Vercel Dashboard (Recommended)
1. [ ] Go to https://vercel.com
2. [ ] Click "Add New" → "Project"
3. [ ] Import from GitHub: `spanky89/stackdek-app`
4. [ ] Framework Preset: Vite
5. [ ] Root Directory: `./`
6. [ ] Build Command: `npm run build`
7. [ ] Output Directory: `dist`
8. [ ] Click "Deploy"

### Option B: Deploy via CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd stackdek-app
vercel --prod
```

---

## 🔐 Environment Variables

Add these in Vercel Project Settings → Environment Variables:

### Required for Production
```bash
# Supabase
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]

# App URL (after first deploy, update with your Vercel URL)
VITE_APP_URL=https://[your-app].vercel.app

# StackDek Platform Billing (YOUR Stripe keys)
STACKDEK_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
STACKDEK_STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
STACKDEK_STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Products created above)
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...
```

**Important:** After setting environment variables, redeploy the project!

---

## ✅ Post-Deployment Testing

### Test Subscription Billing
1. [ ] Go to `https://[your-app].vercel.app`
2. [ ] Create a test account (or login)
3. [ ] Go to Settings → Billing & Subscription
4. [ ] Verify current plan shows
5. [ ] Click "Upgrade to Pro"
6. [ ] Use test card: `4242 4242 4242 4242`
7. [ ] Verify redirect back to app
8. [ ] Check subscription status updated to "Active"

### Test Contractor Payment Setup
1. [ ] Go to Settings → Payment Settings
2. [ ] Enter test Stripe keys (contractor's keys)
3. [ ] Copy webhook URL
4. [ ] Go to Stripe Dashboard → Webhooks
5. [ ] Add webhook endpoint with URL from app
6. [ ] Add event: `checkout.session.completed`
7. [ ] Copy webhook secret
8. [ ] Paste back in app
9. [ ] Save settings

### Test Contractor Payment Flow
1. [ ] Create a test client
2. [ ] Create a quote for the client
3. [ ] Set deposit amount
4. [ ] Click "Pay Deposit with Stripe"
5. [ ] Use test card: `4242 4242 4242 4242`
6. [ ] Verify payment success
7. [ ] Check quote marked as "deposit_paid: true"
8. [ ] Verify job auto-created

---

## 🎯 Success Criteria

- ✅ App deploys successfully to Vercel
- ✅ All environment variables set
- ✅ Database migrations run
- ✅ Subscription billing works end-to-end
- ✅ Contractor payment setup works
- ✅ Webhooks fire correctly
- ✅ Both Stripe integrations operational

---

## 📞 Support

If you encounter issues:

1. **Check Logs:**
   - Vercel: Functions → View Logs
   - Stripe: Webhooks → View Events
   - Supabase: Logs section

2. **Common Issues:**
   - 500 errors → Check environment variables
   - Webhook not firing → Verify webhook URL and secret
   - Payment not working → Check Stripe keys are correct

3. **Resources:**
   - `DEPLOYMENT_GUIDE.md` - Detailed setup instructions
   - `STRIPE_INTEGRATION_README.md` - Architecture overview
   - `.env.example` - Reference for environment variables

---

## 🎉 You're Done!

Once all checkboxes are complete:
- StackDek is live at `https://[your-app].vercel.app`
- Contractors can sign up and configure their Stripe keys
- Subscription billing is active
- Platform is ready for production use!
