# StackDek Deployment Guide

## Prerequisites
1. Supabase account with project created
2. Stripe account (for platform billing)
3. Vercel account
4. Each contractor needs their own Stripe account

## Part 1: Database Setup

### Run Migration SQL Files (in order)
Run these in your Supabase SQL Editor:

1. `SCHEMA.sql` - Base schema (if not already done)
2. `MIGRATION_distributed_stripe.sql` - Contractor payment keys
3. `MIGRATION_subscription_billing.sql` - Platform subscription billing

### Verify Tables
Check that `companies` table has these columns:
- **Contractor Payments:** `stripe_publishable_key`, `stripe_secret_key`, `stripe_webhook_secret`
- **Subscription Billing:** `subscription_plan`, `subscription_status`, `subscription_stripe_customer_id`, `subscription_stripe_subscription_id`, `subscription_expires_at`, `subscription_started_at`, `trial_ends_at`

## Part 2: Stripe Setup (Platform Billing)

### Create Stripe Products
1. Go to Stripe Dashboard → Products
2. Create two products:
   - **Pro Plan** - $29/month recurring
   - **Premium Plan** - $99/month recurring
3. Copy the Price IDs (they start with `price_...`)

### Get Stripe Keys
1. Go to Stripe Dashboard → Developers → API Keys
2. Copy:
   - Publishable key (`pk_live_...` or `pk_test_...`)
   - Secret key (`sk_live_...` or `sk_test_...`)

### Create Webhook Endpoint
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe-billing`
3. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the webhook signing secret (`whsec_...`)

## Part 3: Vercel Deployment

### Environment Variables
Add these in Vercel Project Settings → Environment Variables:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
VITE_APP_URL=https://your-app.vercel.app

# StackDek Platform Billing (YOUR Stripe keys)
STACKDEK_STRIPE_PUBLISHABLE_KEY=pk_live_...
STACKDEK_STRIPE_SECRET_KEY=sk_live_...
STACKDEK_STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs
STRIPE_PRICE_PRO=price_... # $29/month
STRIPE_PRICE_PREMIUM=price_... # $99/month
```

### Deploy
```bash
cd stackdek-app
npm install
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

## Part 4: Contractor Onboarding

### Each Contractor Must:
1. Create a Stripe account (if they don't have one)
2. Get their Stripe API keys:
   - Publishable key (`pk_live_...`)
   - Secret key (`sk_live_...`)
3. Create a webhook endpoint in their Stripe dashboard:
   - URL: `https://your-app.vercel.app/api/webhooks/stripe?companyId=[their-company-id]`
   - Events: `checkout.session.completed`
   - Copy webhook secret (`whsec_...`)
4. Enter all three keys in StackDek:
   - Settings → Payment Settings
   - Fill in all three keys
   - Copy the webhook URL and add it to their Stripe dashboard

### Finding Company ID
Contractors can find their company ID in the webhook URL shown in Payment Settings.

## Testing

### Test Platform Billing
1. Create a test account
2. Go to Settings → Billing
3. Click "Upgrade to Pro"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Verify subscription status updates

### Test Contractor Payments
1. Configure contractor Stripe keys in Payment Settings
2. Create a quote with a deposit amount
3. Click "Pay Deposit with Stripe"
4. Use test card to complete payment
5. Verify quote updates to "deposit_paid: true"
6. Verify job is auto-created

## Webhook URLs

### Platform Billing (StackDek)
- **URL:** `https://your-app.vercel.app/api/webhooks/stripe-billing`
- **Uses:** Your StackDek Stripe keys
- **Purpose:** Handle subscription payments

### Contractor Payments
- **URL Pattern:** `https://your-app.vercel.app/api/webhooks/stripe?companyId=[id]`
- **Uses:** Each contractor's own Stripe keys
- **Purpose:** Handle job deposit payments

## Security Notes
- Never commit `.env` files to git
- Store Stripe keys securely in Vercel environment variables
- Each contractor's keys are stored encrypted in Supabase
- Webhook secrets verify that events come from Stripe
- Company ID in webhook URL ensures payments route to correct company

## Support
If issues arise:
1. Check Vercel deployment logs
2. Check Stripe webhook logs
3. Check Supabase logs
4. Verify all environment variables are set correctly
