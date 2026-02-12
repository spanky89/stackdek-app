# StackDek Subscription Billing - Implementation Guide

## Overview

StackDek uses a **centralized subscription model** where contractors pay YOU (StackDek) for access to the platform. This is separate from the distributed contractor payment flow.

---

## Two Separate Stripe Flows

### 1. StackDek Subscriptions (This Feature)
- **Who pays:** Contractors → StackDek
- **Stripe account:** YOUR Stripe account (StackDek's)
- **Webhook:** `/api/webhooks/stripe-subscriptions`
- **Purpose:** Platform access fees

### 2. Contractor Payments (Already Implemented)
- **Who pays:** Clients → Contractors
- **Stripe account:** Each contractor's own Stripe account
- **Webhook:** `/api/webhooks/stripe?companyId=[id]`
- **Purpose:** Deposit/invoice payments

---

## Database Schema

**File:** `MIGRATION_stackdek_subscriptions.sql`

Added to `companies` table:
- `subscription_status` - trial, active, past_due, canceled, none
- `subscription_plan` - basic, pro, enterprise
- `subscription_stripe_customer_id` - Stripe customer ID (YOUR account)
- `subscription_stripe_subscription_id` - Stripe subscription ID
- `subscription_current_period_end` - Billing period end date
- `trial_ends_at` - Trial expiration (14 days default)

---

## Pricing Plans

### Basic - $29/month
- Up to 50 quotes/month
- Up to 25 jobs/month
- Basic client management
- Email support
- Accept payments (contractor's Stripe)

### Pro - $79/month (Recommended)
- Unlimited quotes & jobs
- Advanced client management
- Priority support
- Custom branding
- Reporting & analytics

### Enterprise - $199/month
- Everything in Pro
- Multi-user accounts
- API access
- White-label options
- Dedicated account manager
- SLA guarantee

---

## User Flow

### 1. Signup (New Contractor)
- Creates account → Company auto-created
- Default status: `trial` (14 days)
- Can use full features during trial

### 2. Trial Period
- Access to all features
- Trial warning shown 3 days before expiration
- After trial ends, prompted to subscribe

### 3. Subscription Selection
- Goes to Settings → Billing
- Sees plan comparison
- Clicks "Start Plan" or "Upgrade"
- Redirected to Stripe Checkout (YOUR account)

### 4. Payment & Activation
- Enters credit card in Stripe
- Payment processed
- Webhook fires → Subscription marked `active`
- Can continue using StackDek

### 5. Recurring Billing
- Stripe auto-charges monthly
- Webhook updates `subscription_current_period_end`
- If payment fails → Status changes to `past_due`

### 6. Cancellation
- Contractor cancels in Stripe Dashboard
- Webhook fires → Status changes to `canceled`
- Access disabled (or limited)

---

## API Endpoints

### Create Subscription Checkout
**Endpoint:** `POST /api/create-subscription-checkout`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "priceId": "price_...",
  "planId": "basic|pro|enterprise"
}
```

**Response:**
```json
{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Flow:**
1. Gets user from JWT token
2. Gets company from database
3. Creates/retrieves Stripe customer
4. Creates checkout session for subscription
5. Returns checkout URL

---

## Webhook Events

### Endpoint
`/api/webhooks/stripe-subscriptions`

**Events Handled:**

#### `checkout.session.completed`
- New subscription activated
- Updates: `subscription_status` = 'active', `subscription_plan`, `subscription_stripe_subscription_id`

#### `invoice.paid`
- Recurring payment successful
- Updates: `subscription_status` = 'active', `subscription_current_period_end`

#### `invoice.payment_failed`
- Payment failed (card declined, etc.)
- Updates: `subscription_status` = 'past_due'

#### `customer.subscription.deleted`
- Subscription canceled
- Updates: `subscription_status` = 'canceled'

#### `customer.subscription.updated`
- Plan change, status change, etc.
- Updates: `subscription_status`, `subscription_plan`, `subscription_current_period_end`

---

## Stripe Setup (StackDek Side)

### 1. Create Stripe Products & Prices

In YOUR Stripe Dashboard:

1. Go to **Products** → **Add Product**
2. Create three products:
   - **StackDek Basic** - $29/month recurring
   - **StackDek Pro** - $79/month recurring
   - **StackDek Enterprise** - $199/month recurring
3. Copy each **Price ID** (starts with `price_...`)

### 2. Set Environment Variables

In Vercel:

```env
# StackDek subscription billing (YOUR Stripe account)
STRIPE_SECRET_KEY_STACKDEK=sk_live_...
STRIPE_WEBHOOK_SECRET_STACKDEK=whsec_...

# Frontend: Price IDs for plans
VITE_STRIPE_PRICE_BASIC=price_...
VITE_STRIPE_PRICE_PRO=price_...
VITE_STRIPE_PRICE_ENTERPRISE=price_...

# App URL for redirects
VITE_APP_URL=https://stackdek.vercel.app
```

**Note:** If you don't have separate keys, `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` work as fallbacks.

### 3. Create Webhook in Stripe

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-domain.com/api/webhooks/stripe-subscriptions`
4. Select events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Click **Add endpoint**
6. Copy **Signing secret** → Add to `STRIPE_WEBHOOK_SECRET_STACKDEK`

---

## Testing

### Test Mode Setup

1. Toggle Stripe to **Test Mode**
2. Create test products/prices
3. Use test environment variables
4. Set up test webhook endpoint

### Test Flow

1. Log in to StackDek
2. Go to Settings → Billing
3. Click "Start Plan" on any plan
4. Use test card: `4242 4242 4242 4242`
   - Any future expiration
   - Any CVC
   - Any ZIP
5. Complete checkout
6. Verify:
   - Redirected back to StackDek
   - Status badge shows "✓ Active"
   - Plan name updated
   - Database shows `subscription_status = 'active'`

### Test Webhooks

In Stripe Dashboard → Webhooks → Click endpoint → Send test webhook:
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.deleted`

Verify database updates correctly.

---

## Feature Gating (Future)

Currently, all contractors have access to all features. To gate features by plan:

### Example: Limit Quotes for Basic Plan

```typescript
// In CreateQuote.tsx
const { data: company } = await supabase
  .from('companies')
  .select('subscription_plan')
  .eq('owner_id', user.id)
  .single()

if (company.subscription_plan === 'basic') {
  const { count } = await supabase
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', startOfMonth)
  
  if (count >= 50) {
    alert('You've reached the 50 quote limit for Basic plan. Upgrade to Pro for unlimited quotes.')
    return
  }
}
```

### Example: Hide Features for Basic Plan

```typescript
{company.subscription_plan !== 'basic' && (
  <button>Custom Branding</button>
)}
```

### Example: Trial Expiration Check

```typescript
const trialEnded = new Date(company.trial_ends_at) < new Date()
const hasActiveSubscription = company.subscription_status === 'active'

if (trialEnded && !hasActiveSubscription) {
  // Redirect to billing page or show paywall
  nav('/settings/billing')
}
```

---

## Monitoring & Metrics

### Key Metrics
- **MRR (Monthly Recurring Revenue):** Sum of all active subscriptions
- **Churn Rate:** % of subscriptions canceled each month
- **Conversion Rate:** % of trials that convert to paid
- **ARPU (Average Revenue Per User):** MRR / Active Subscribers

### Stripe Dashboard
- View subscribers by plan
- Monitor failed payments
- Track revenue trends
- Identify churn reasons

### Database Queries

**Active Subscriptions:**
```sql
SELECT subscription_plan, COUNT(*) 
FROM companies 
WHERE subscription_status = 'active' 
GROUP BY subscription_plan;
```

**Trial Conversions:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE subscription_status = 'trial') as trials,
  COUNT(*) FILTER (WHERE subscription_status = 'active') as active
FROM companies;
```

**Past Due Subscriptions (needs attention):**
```sql
SELECT id, name, subscription_current_period_end
FROM companies
WHERE subscription_status = 'past_due'
ORDER BY subscription_current_period_end;
```

---

## Email Notifications (Future Enhancement)

### Trial Ending Soon
Send 3 days before trial ends:
```
Subject: Your StackDek trial ends in 3 days

Hi [Name],

Your 14-day trial of StackDek is ending soon. To continue using StackDek:

1. Go to Settings → Billing
2. Choose a plan that fits your needs
3. Complete checkout

Questions? Reply to this email.
```

### Payment Failed
Send when `invoice.payment_failed` webhook fires:
```
Subject: Payment failed for your StackDek subscription

Hi [Name],

We couldn't process your recent payment. Please update your payment method:

[Update Payment Method Button]

Your subscription will be canceled if payment isn't received within 7 days.
```

### Subscription Canceled
Send when `customer.subscription.deleted` fires:
```
Subject: Your StackDek subscription was canceled

Hi [Name],

Your subscription has been canceled. You can reactivate anytime by:

1. Log in to StackDek
2. Go to Settings → Billing
3. Select a plan

We'd love to have you back!
```

---

## Security Notes

- **Webhook secrets:** Never commit to Git, store in Vercel env vars
- **Metadata validation:** Always verify `companyId` matches expected company
- **Auth required:** All subscription APIs require valid JWT token
- **Database security:** Use row-level security to prevent cross-company access

---

## Troubleshooting

### Subscription not activating after payment

**Check:**
1. Webhook fired successfully? (Stripe Dashboard → Webhooks → Recent events)
2. Webhook secret correct?
3. Database updated? Check `subscription_status` in `companies` table
4. Vercel logs show any errors?

### Payment fails but user not notified

**Solution:** Implement email notifications for `invoice.payment_failed` event

### Customer wants to cancel

**Options:**
1. Cancel in Stripe Dashboard (admin)
2. Build self-service cancellation in StackDek UI (future)
3. Email support to request cancellation

### Customer wants to change plan

**Options:**
1. In Stripe Dashboard: Subscriptions → Select customer → Update subscription
2. Build plan change UI in StackDek (future)

---

## Future Enhancements

### Phase 2
- [ ] Self-service plan changes (upgrade/downgrade)
- [ ] Self-service cancellation
- [ ] View invoices/receipts in StackDek
- [ ] Email notifications (trial ending, payment failed, etc.)

### Phase 3
- [ ] Annual billing (discount)
- [ ] Usage-based billing (per quote/job)
- [ ] Add-ons (extra users, integrations)
- [ ] Referral program (discount for referrals)

### Phase 4
- [ ] Custom plans for enterprise
- [ ] Volume discounts
- [ ] Partner/reseller program
- [ ] White-label subscriptions

---

## Support

**For StackDek Admin:**
- Stripe Dashboard: https://dashboard.stripe.com
- Subscription Management: Customers → Subscriptions
- Revenue Reports: Reports → Revenue

**For Contractors:**
- Billing page: Settings → Billing
- Support email: support@stackdek.com

---

**Status:** ✅ Ready for deployment

**Last Updated:** 2026-02-11
