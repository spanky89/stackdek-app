# Distributed Stripe Integration - Implementation Summary

## Overview

StackDek now uses a **distributed Stripe integration** where each contractor company has their own Stripe account. Payments flow directly to the contractor's Stripe account, not through a central StackDek account.

---

## What Changed

### 1. Database Schema

**File:** `MIGRATION_distributed_stripe.sql`

Added to `companies` table:
- `stripe_publishable_key` (TEXT) - Company's Stripe publishable key (pk_...)
- `stripe_secret_key` (TEXT) - Company's Stripe secret key (sk_...) - stored securely
- `stripe_webhook_secret` (TEXT) - Company's webhook secret (whsec_...)

**Migration:** Run this SQL in your Supabase SQL editor.

---

### 2. Settings Page

**File:** `src/pages/Settings.tsx`

Added new **Payment Settings** section:
- Input fields for all three Stripe keys
- Webhook URL display with copy button
- Visual status indicators
- Security warnings
- Link to setup guide

**Access:** Settings → Payment Settings

---

### 3. Checkout API (Create Session)

**File:** `api/create-checkout.ts`

**Changes:**
- Extracts `company_id` from authenticated user
- Fetches company's Stripe keys from database
- Initializes Stripe with **company-specific secret key**
- Creates checkout session using company's keys
- Returns company's **publishable key** to frontend
- Includes `companyId` in session metadata for webhook routing

**Authentication:** Requires `Authorization: Bearer <token>` header

---

### 4. Webhook Handler

**File:** `api/webhooks/stripe.ts`

**Changes:**
- Extracts `companyId` from URL query parameter: `/api/webhooks/stripe?companyId=[id]`
- Fetches company's Stripe keys from database
- Verifies webhook signature using **company-specific webhook secret**
- Uses **company-specific secret key** for Stripe operations
- Security: Validates `companyId` in metadata matches URL parameter

**Webhook URL Format:**
```
https://your-domain.com/api/webhooks/stripe?companyId=abc123...
```

Each company has their **own unique webhook URL**.

---

### 5. Quote Detail Page

**File:** `src/pages/QuoteDetail.tsx`

**Changes:**
- Checks company's Stripe connection status on load
- Displays connection status badge: "✓ Connected" or "⚠ Setup Required"
- Shows warning banner if Stripe not configured
- Disables "Pay Deposit" button if keys not configured
- Passes `Authorization` header to checkout API
- Better error messages for missing Stripe config

---

## Security Features

### 1. Authentication & Authorization
- All API endpoints require authentication via Supabase JWT
- User can only access their own company's data
- Row-level security ensures data isolation

### 2. Key Storage
- Secret keys stored in Supabase (encrypted at rest)
- Never exposed to frontend (except publishable key)
- Webhook secret used for signature verification

### 3. Webhook Verification
- Each webhook verified with company-specific secret
- Metadata validation: `companyId` must match URL parameter
- Invalid signatures rejected immediately

### 4. Database Security
- Company-specific queries use `company_id` filters
- Prevents cross-company data access
- Quotes validated against company ownership

---

## Payment Flow

### User Perspective (Contractor)

1. **Setup** (one-time):
   - Create Stripe account
   - Get API keys from Stripe Dashboard
   - Add keys to StackDek Settings → Payment Settings
   - Set up webhook in Stripe (copy URL from StackDek)

2. **Create Quote**:
   - Add deposit amount
   - Send quote to client

3. **Client Pays**:
   - Client clicks "Pay Deposit"
   - Redirected to Stripe Checkout (contractor's Stripe account)
   - Pays with credit card

4. **Auto-Job Creation**:
   - Webhook fires to StackDek
   - Quote marked "Deposit Paid"
   - Job auto-created
   - Contractor notified

---

## Testing Checklist

### Test Mode (Before Going Live)

- [ ] Add test keys to Settings → Payment Settings
- [ ] Create webhook endpoint in Stripe (Test mode)
- [ ] Add webhook secret to StackDek
- [ ] Create test quote with deposit amount
- [ ] Click "Pay Deposit with Stripe"
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Verify quote marked "Deposit Paid"
- [ ] Verify job auto-created
- [ ] Check Stripe Dashboard for payment

### Live Mode (Production)

- [ ] Complete Stripe onboarding
- [ ] Get live API keys
- [ ] Update keys in StackDek Settings
- [ ] Create live webhook endpoint
- [ ] Update webhook secret
- [ ] Test with real card (small amount)
- [ ] Verify payment appears in Stripe balance

---

## Webhook Events Handled

Currently:
- `checkout.session.completed` - Payment successful

Future (can be added):
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund issued
- `customer.subscription.created` - Subscription created (if using subscriptions)

---

## Environment Variables Required

### Vercel Environment Variables

```env
# Supabase (already set)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhb...

# App URL (for redirects)
VITE_APP_URL=https://your-stackdek-domain.com
```

**Note:** `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are NO LONGER needed as global env vars. Each company stores their own keys in the database.

---

## Migration Guide (For Existing Deployments)

If you already had centralized Stripe:

1. **Run database migration:**
   ```sql
   -- See MIGRATION_distributed_stripe.sql
   ```

2. **Each company must:**
   - Log in to StackDek
   - Go to Settings → Payment Settings
   - Enter their Stripe keys
   - Set up webhook in their Stripe account

3. **Remove old env vars** (optional):
   - Can remove `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from Vercel
   - Old global keys no longer used

4. **Existing quotes/jobs:**
   - Unaffected (no data migration needed)
   - Future payments use new distributed flow

---

## Documentation for Contractors

**File:** `STRIPE_SETUP_GUIDE.md`

Step-by-step guide for contractors:
- Creating Stripe account
- Getting API keys
- Adding keys to StackDek
- Setting up webhooks
- Testing payments
- Going live
- Troubleshooting

**Share this with every contractor** who signs up for StackDek.

---

## Deployment

### Vercel Deployment

1. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Distributed Stripe integration"
   git push
   ```

2. **Vercel auto-deploys** (if connected to Git)

3. **Manual deploy:**
   ```bash
   cd stackdek-app
   vercel --prod
   ```

4. **After deploy:**
   - Run database migration in Supabase
   - Test with test keys
   - Notify contractors to set up their Stripe

---

## Monitoring & Logs

### Stripe Dashboard
- View payments, refunds, disputes
- Check webhook delivery logs
- Monitor for failed webhooks

### Vercel Logs
- View API function logs
- Check for errors in checkout/webhook
- Monitor response times

### Supabase Logs
- Database query performance
- Row-level security violations
- Auth errors

---

## Future Enhancements

### Phase 2 (Optional)
- [ ] Subscription billing support
- [ ] Automated refunds from StackDek UI
- [ ] Multiple payment methods (ACH, Apple Pay)
- [ ] Invoice payment (not just deposits)
- [ ] Payment history/reports in StackDek

### Phase 3 (Optional)
- [ ] Stripe Connect integration (onboard contractors via Stripe)
- [ ] Automated payout tracking
- [ ] Tax calculation (Stripe Tax)
- [ ] International payments (multi-currency)

---

## Support

### For Contractors
- Email: support@stackdek.com
- Documentation: `/docs/stripe-setup`
- Stripe Support: https://support.stripe.com

### For Developers
- Stripe API Docs: https://stripe.com/docs/api
- Stripe Testing: https://stripe.com/docs/testing
- Webhook Events: https://stripe.com/docs/api/events/types

---

**Status:** ✅ Ready for deployment

**Last Updated:** 2026-02-11
