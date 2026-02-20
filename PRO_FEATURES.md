# Pro Version Feature Gating Architecture

**Version:** 1.0  
**Date:** February 19, 2026  
**Status:** Ready for Implementation

---

## Overview

This document outlines the complete architecture for implementing subscription-based feature gating in StackDek, with a **Starter tier** (core CRM features) and **Pro tier** (advanced features: contracts, multi-user, job costing, marketing). Both tiers include unlimited clients and jobs.

---

## 🎯 Subscription Tiers

### Starter Tier ($29/month)
- **Price:** $29/month or $279/year (save 20%)
- **Limits:** ✅ **Unlimited clients and jobs**
- **Features:**
  - ✅ Unlimited clients
  - ✅ Unlimited jobs
  - ✅ Quote management
  - ✅ Invoicing
  - ✅ Job scheduling
  - ✅ Client management
  - ✅ Basic reporting

### Pro Tier ($69/month)
- **Price:** $69/month or $659/year (save 20%)
- **Limits:** ✅ **Unlimited clients and jobs**
- **Features:**
  - Everything in Starter, plus:
  - ✅ **Contract sending & e-signature**
  - ✅ **Multi-user access** (team members with role-based permissions)
  - ✅ **Job costing** (materials, labor tracking, profit margins)
  - ✅ **Full marketing suite** (email campaigns, drip sequences, SMS)
  - ✅ Priority support

---

## 🗄️ Database Schema

### Migration: `10_add_subscription_fields.sql`

Added columns to `companies` table:
- `subscription_tier` (TEXT): 'starter' | 'pro' (default: 'starter')
- `subscription_status` (TEXT): 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid'
- `stripe_customer_id` (TEXT): Stripe customer ID
- `stripe_subscription_id` (TEXT): Stripe subscription ID
- `subscription_plan_id` (TEXT): Stripe price ID (e.g., `price_xxx`)
- `trial_ends_at` (TIMESTAMP): End of trial period (14 days)
- `subscription_current_period_end` (TIMESTAMP): Next billing date
- `subscription_cancel_at_period_end` (BOOLEAN): True if canceling at period end

**Note:** No client or job limits enforced - both tiers have unlimited. Feature gating is purely functional (contracts, multi-user, job costing, marketing).

---

## 🛠️ Implementation Files

### 1. **`useSubscription.ts` Hook**
Location: `src/hooks/useSubscription.ts`

Provides subscription data and feature access:
```tsx
const { 
  subscription,    // SubscriptionData object
  limits,          // Usage limits and counts
  isPro,           // Boolean: is Pro/Premium?
  isFree,          // Boolean: is Free tier?
  canAccessFeature,// Function to check feature access
  refreshSubscription // Refresh from DB
} = useSubscription();
```

**Usage Example:**
```tsx
const { canAccessFeature, limits } = useSubscription();

if (!canAccessFeature('csv_export')) {
  return <UpgradePrompt feature="CSV Export" />;
}

// Show limit indicator
<LimitIndicator 
  used={limits.clientsUsed} 
  max={limits.maxClients} 
  label="Clients" 
/>
```

---

### 2. **`featureGates.ts` Constants**
Location: `src/utils/featureGates.ts`

Defines feature availability per tier:
```tsx
type FeatureName = 
  | 'unlimited_clients'
  | 'unlimited_jobs'
  | 'custom_branding'
  | 'email_automation'
  | 'csv_export'
  | 'advanced_analytics'
  | 'api_access'
  | 'priority_support';

const FEATURE_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: { maxClients: 10, maxMonthlyJobs: 25, features: [] },
  pro: { maxClients: null, maxMonthlyJobs: null, features: [...] },
};
```

---

### 3. **`SubscriptionGuard.tsx` Component**
Location: `src/components/SubscriptionGuard.tsx`

Wrapper component to gate features:
```tsx
<SubscriptionGuard feature="csv_export">
  <CSVExportButton />
</SubscriptionGuard>
```

**Components Provided:**
- `<SubscriptionGuard>` - Wrapper for feature gating
- `<ProBadge>` - Displays "PRO" badge
- `<UpgradePrompt>` - Beautiful upgrade modal
- `<LimitIndicator>` - Progress bar for limits (e.g., "8/10 clients")
- `<LockedFeatureButton>` - Shows locked button with tooltip

---

### 4. **Stripe Webhook Handler**
Location: `api/stripe-subscription-webhook.ts`

Handles subscription lifecycle events:
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Upgrade/downgrade
- `customer.subscription.deleted` - Cancellation
- `invoice.payment_succeeded` - Renewal (reset monthly limits)
- `invoice.payment_failed` - Payment failure → `past_due` status

**Deploy URL:** `https://your-app.vercel.app/api/stripe-subscription-webhook`

**Stripe Webhook Setup:**
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/stripe-subscription-webhook`
3. Select events: `customer.subscription.*`, `invoice.payment_*`
4. Copy webhook signing secret → set as `STRIPE_WEBHOOK_SECRET`

---

### 5. **Checkout Session API**
Location: `api/create-checkout-session.ts`

Creates Stripe Checkout session for upgrades:
```tsx
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({ priceId: 'price_pro_monthly' }),
});
const { sessionUrl } = await response.json();
window.location.href = sessionUrl; // Redirect to Stripe
```

**Features:**
- Creates Stripe customer if not exists
- 14-day trial period for new subscribers
- Redirects to Stripe Checkout

---

### 6. **Billing Portal API**
Location: `api/create-billing-portal.ts`

Allows users to manage subscriptions:
```tsx
const response = await fetch('/api/create-billing-portal', {
  method: 'POST',
});
const { url } = await response.json();
window.location.href = url; // Redirect to Stripe portal
```

**Features:**
- Update payment method
- Cancel subscription
- View invoices
- Download receipts

---

### 7. **Pricing Page**
Location: `src/pages/Pricing.tsx`

Beautiful pricing page with:
- Monthly/yearly toggle (20% discount for yearly)
- Feature comparison
- Current plan indicator
- FAQ section
- Direct checkout integration

---

## 🔐 Row Level Security (RLS)

Feature gating is handled at the application level (UI components and API routes check `subscription_tier`).

No database-level enforcement needed since both tiers have unlimited clients/jobs. Pro features (contracts, multi-user, job costing, marketing) are gated in the React components and backend APIs.

---

## 📋 Implementation Checklist

### Phase 1: Database & Backend
- [x] Run migration `10_add_subscription_fields.sql`
- [ ] Deploy Stripe webhook handler to Vercel
- [ ] Configure Stripe webhook in dashboard
- [ ] Deploy checkout session API
- [ ] Deploy billing portal API
- [ ] Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe-subscription-webhook`

### Phase 2: Frontend Components
- [x] Create `useSubscription` hook
- [x] Create `featureGates.ts` constants
- [x] Create `SubscriptionGuard` components
- [x] Create Pricing page
- [ ] Add route to Pricing page in `App.tsx`
- [ ] Add "Upgrade to Pro" button in nav/sidebar

### Phase 3: Feature Integration
- [ ] Wrap CSV export with `<SubscriptionGuard feature="csv_export">`
- [ ] Add limit indicators to client list (e.g., "8/10 clients")
- [ ] Add limit indicators to jobs dashboard
- [ ] Show upgrade prompt when creating client/job at limit
- [ ] Add Pro badge to locked features in UI
- [ ] Implement custom branding (logo on invoices) for Pro users
- [ ] Gate email automation behind Pro tier

### Phase 4: Testing
- [ ] Test Free → Pro upgrade flow
- [ ] Test Pro → Free downgrade (data preservation)
- [ ] Test trial expiration
- [ ] Test payment failure handling
- [ ] Test monthly job reset
- [ ] Test client/job limit enforcement

### Phase 5: Beta User Migration
- [ ] Decide: All beta users start as Free or Pro trial?
- [ ] Option 1: Grandfather early adopters (free Pro forever)
- [ ] Option 2: Give all beta users 3-month Pro trial
- [ ] Send email announcement with migration plan

---

## 🚀 Environment Variables

Add to `.env.local`:
```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx           # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxx         # Webhook signing secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx # Public key

# Supabase
SUPABASE_SERVICE_ROLE_KEY=xxx           # For admin operations
VITE_APP_URL=http://localhost:5173      # Your app URL
```

---

## 🎨 UI/UX Guidelines

### When to Show Upgrade Prompts
- **Locked feature clicked:** Show beautiful `<UpgradePrompt>` component with feature benefits
- **Contract signing attempted:** "Contract signing is a Pro feature. Upgrade to send contracts and collect e-signatures."
- **Multi-user access attempted:** "Team member access is available on Pro. Upgrade to add employees."
- **Job costing accessed:** "Job costing is a Pro feature. Track materials, labor, and profit margins."
- **Marketing tools accessed:** "Marketing automation is available on Pro. Upgrade for email campaigns and SMS."

### What Happens on Downgrade (Pro → Starter)
- ✅ All existing data preserved (clients, jobs, invoices, contracts)
- ❌ Pro features become locked (contracts, multi-user, job costing, marketing)
- ✅ Core CRM functionality remains unlimited (clients, quotes, jobs, invoices)
- 📧 Email sent: "Your Pro subscription has ended. You're now on the Starter plan."

### Trial Period Behavior
- All new signups get 14-day Pro trial
- No credit card required to start
- Email reminder 3 days before trial ends
- Auto-downgrade to Free if no payment added

---

## 📊 Analytics & Metrics to Track

- **Conversion rate:** Starter → Pro upgrades
- **Trial conversion:** Users who add payment after trial
- **Churn rate:** Pro users who cancel/downgrade
- **Feature adoption:** Which Pro features drive the most upgrades (contracts, multi-user, job costing, marketing)
- **Usage patterns:** How often Pro features are used once unlocked

---

## 🐛 Known Issues & Considerations

1. **Multi-user permissions:** Need to design role-based access control (owner, admin, employee).
   - **Solution:** Add `team_members` table with role column, gate features by role.

2. **Job costing complexity:** Materials tracking, labor rates, subcontractor costs.
   - **Solution:** Phase 1: Simple materials/labor input. Phase 2: Full cost breakdown.

3. **Marketing suite scope:** Email campaigns, drip sequences, SMS - big feature set.
   - **Solution:** Start with email drip (Resend integration), add SMS later (Twilio).

4. **Contract templates:** Need library of contractor contract templates.
   - **Solution:** Pre-built templates for landscaping, HVAC, plumbing, general contractor.

5. **Stripe test vs production:** Ensure proper price IDs in webhook handler.

---

## 📞 Support & Next Steps

- **Questions:** Contact Spanky (product owner)
- **Stripe Dashboard:** https://dashboard.stripe.com/test/subscriptions
- **Supabase Dashboard:** https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus

---

## 🎉 Summary

This architecture provides:
- ✅ Clean separation of Starter vs Pro features (contracts, multi-user, job costing, marketing)
- ✅ Unlimited clients/jobs for all tiers
- ✅ Beautiful UI components for upgrades
- ✅ Full Stripe integration (checkout, webhooks, billing portal)
- ✅ Trial period support
- ✅ Graceful downgrade handling (data preserved, features locked)
- ✅ Easy to extend with new Pro features

**Ready to implement!** 🚀
