# StackDek Stripe Integration - Complete Implementation

## Overview
This implementation includes **two separate Stripe integrations**:

### Part 1: Distributed Contractor Payments ✅
Each contractor uses their own Stripe account to receive job deposit payments directly.

### Part 2: Subscription Billing ✅
StackDek uses its own Stripe account to charge monthly subscription fees to contractors.

---

## Architecture

### Distributed Contractor Payments
```
Client pays deposit
    ↓
Stripe Checkout (Contractor's Stripe keys)
    ↓
Webhook: /api/webhooks/stripe?companyId=[id]
    ↓
Updates quote → Creates job
```

### Subscription Billing
```
Contractor upgrades plan
    ↓
Stripe Checkout (StackDek's Stripe keys)
    ↓
Webhook: /api/webhooks/stripe-billing
    ↓
Updates company subscription status
```

---

## Database Schema

### Companies Table Extensions
```sql
-- Contractor Payment Keys (distributed)
stripe_publishable_key TEXT
stripe_secret_key TEXT
stripe_webhook_secret TEXT

-- Subscription Billing (platform)
subscription_plan TEXT DEFAULT 'basic'
subscription_status TEXT DEFAULT 'inactive'
subscription_stripe_customer_id TEXT
subscription_stripe_subscription_id TEXT
subscription_expires_at TIMESTAMP
subscription_started_at TIMESTAMP
trial_ends_at TIMESTAMP
```

---

## API Endpoints

### Contractor Payments
- **POST /api/create-checkout**
  - Creates Stripe checkout session using contractor's keys
  - Returns session URL and publishable key
  - Requires: quoteId, depositAmount, clientEmail

- **POST /api/webhooks/stripe?companyId=[id]**
  - Handles checkout.session.completed events
  - Verifies webhook using contractor's webhook secret
  - Updates quote and creates job

### Subscription Billing
- **POST /api/billing/create-subscription**
  - Creates subscription checkout using StackDek's keys
  - Returns session URL for Pro/Premium plans
  - Handles free Basic plan downgrades

- **POST /api/webhooks/stripe-billing**
  - Handles subscription lifecycle events
  - Updates company subscription status
  - Events: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed

---

## Frontend Components

### Settings Pages
- **Settings → Payment Settings**
  - Contractor enters their Stripe keys
  - Displays webhook URL with company ID
  - Copy-to-clipboard functionality

- **Settings → Billing & Subscription** (NEW)
  - View current plan and status
  - Three-tier pricing: Basic (free), Pro ($29/mo), Premium ($99/mo)
  - Upgrade/downgrade buttons
  - Trial status and expiration tracking

### UI Components
- **SubscriptionBanner** (NEW)
  - Displays at top of app when trial ending/expired
  - Shows upgrade prompts for expired subscriptions
  - Dismissible warnings for canceled subscriptions

- **Quote Detail Page**
  - Checks Stripe connection status
  - Disables "Pay Deposit" if keys not configured
  - Handles payment success/cancel redirects

---

## Environment Variables

### Required for Production
```bash
# Platform Billing (StackDek's Stripe)
STACKDEK_STRIPE_PUBLISHABLE_KEY=pk_live_...
STACKDEK_STRIPE_SECRET_KEY=sk_live_...
STACKDEK_STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_PREMIUM=price_...

# Supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# App URL
VITE_APP_URL=https://your-app.vercel.app
```

---

## Pricing Tiers

### Basic (Free)
- Up to 50 clients
- Up to 100 jobs per month
- Basic quote management
- Email support
- StackDek branding on quotes

### Pro ($29/month)
- Unlimited clients
- Unlimited jobs
- Advanced quote management
- Priority support
- Remove branding
- Custom invoice templates
- Analytics dashboard

### Premium ($99/month)
- Everything in Pro
- White-label solution
- Dedicated account manager
- Phone support
- Custom integrations
- Advanced reporting
- Multi-user support (coming soon)

---

## Security Features

1. **Webhook Signature Verification**
   - All webhooks verify Stripe signatures
   - Prevents unauthorized webhook calls

2. **Company ID Validation**
   - Contractor webhooks include companyId in URL
   - Webhook verifies payment matches company

3. **Separate Stripe Accounts**
   - Platform billing uses StackDek's Stripe
   - Contractor payments use their own Stripe
   - No mixing of funds

4. **Database Security**
   - Row Level Security (RLS) enabled
   - Users can only access their own company data
   - Service role key used for secure operations

---

## User Flows

### Contractor Setup Flow
1. Sign up for StackDek account
2. Create Stripe account (or use existing)
3. Get Stripe API keys from dashboard
4. Go to Settings → Payment Settings
5. Enter publishable key, secret key, webhook secret
6. Copy webhook URL
7. Add webhook in Stripe dashboard
8. Ready to accept payments!

### Client Payment Flow
1. Contractor creates quote
2. Sets deposit amount
3. Shares quote link with client
4. Client clicks "Pay Deposit with Stripe"
5. Redirects to Stripe Checkout (contractor's account)
6. Client pays with card
7. Webhook updates quote → auto-creates job
8. Contractor receives payment in their Stripe account

### Subscription Upgrade Flow
1. Contractor views current plan in Billing settings
2. Clicks "Upgrade to Pro" or "Upgrade to Premium"
3. Redirects to Stripe Checkout (StackDek's account)
4. Enters payment details
5. Webhook activates subscription
6. Status updates to "Active"
7. Recurring billing begins

---

## Testing

### Test Contractor Payments
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

### Test Subscription Billing
```
Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
```

### Test Webhook Events
Use Stripe CLI to trigger test events:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe-billing
stripe trigger checkout.session.completed
```

---

## Monitoring

### Check Subscription Status
```sql
SELECT 
  name, 
  subscription_plan, 
  subscription_status, 
  subscription_expires_at,
  trial_ends_at
FROM companies;
```

### Check Payment Keys Configured
```sql
SELECT 
  name,
  stripe_publishable_key IS NOT NULL as has_pub_key,
  stripe_secret_key IS NOT NULL as has_secret_key,
  stripe_webhook_secret IS NOT NULL as has_webhook_secret
FROM companies;
```

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Set up Stripe products (Pro, Premium)
- [ ] Get Stripe API keys
- [ ] Create webhook endpoints in Stripe
- [ ] Add environment variables to Vercel
- [ ] Deploy to Vercel
- [ ] Test subscription flow
- [ ] Test contractor payment flow
- [ ] Verify webhooks are working

---

## Files Changed/Created

### Database Migrations
- ✅ `MIGRATION_distributed_stripe.sql`
- ✅ `MIGRATION_subscription_billing.sql`

### API Endpoints
- ✅ `api/create-checkout.ts` (updated)
- ✅ `api/webhooks/stripe.ts` (updated)
- ✅ `api/billing/create-subscription.ts` (new)
- ✅ `api/webhooks/stripe-billing.ts` (new)

### Frontend Pages
- ✅ `src/pages/Settings.tsx` (updated - added billing link)
- ✅ `src/pages/BillingSettings.tsx` (new)
- ✅ `src/pages/QuoteDetail.tsx` (already has Stripe integration)

### Components
- ✅ `src/components/SubscriptionBanner.tsx` (new)
- ✅ `src/components/AppLayout.tsx` (updated - includes banner)

### Configuration
- ✅ `src/App.tsx` (updated - added billing route)
- ✅ `.env.example` (new)
- ✅ `vercel.json` (already configured)

### Documentation
- ✅ `DEPLOYMENT_GUIDE.md` (new)
- ✅ `STRIPE_INTEGRATION_README.md` (this file)

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Stripe not configured" error on quote payment
- **Fix:** Contractor needs to add their Stripe keys in Settings → Payment Settings

**Issue:** Webhook not firing
- **Fix:** Check webhook URL matches deployed URL, verify webhook secret is correct

**Issue:** Subscription not activating
- **Fix:** Check Vercel logs, verify STACKDEK_STRIPE_* env vars are set

**Issue:** Payment goes to wrong account
- **Fix:** Verify companyId in webhook URL matches quote owner

---

## Next Steps

1. **Multi-user Support** - Allow contractors to add team members
2. **Usage Analytics** - Track API usage per plan tier
3. **Plan Limits Enforcement** - Restrict features based on subscription tier
4. **Referral Program** - Give credits for referring other contractors
5. **Annual Billing** - Offer discounted annual plans
