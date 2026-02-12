# ⚡ Stripe Integration - Quick Start

## What Was Built

✅ **Complete Stripe payment system** for StackDek with:
- Quote deposit payments via Stripe Checkout
- Automatic job creation when deposit paid
- Invoice generation with editable line items
- Offline payment option for cash/check
- Full webhook integration for automation

---

## 🚀 3-Minute Setup

### 1. Run Database Migration (30 seconds)
```sql
-- Supabase SQL Editor → Copy/paste from:
MIGRATION_stripe_payment_flow.sql
```

### 2. Get Stripe Keys (1 minute)
```bash
# Visit: https://dashboard.stripe.com/test/apikeys
Secret Key: sk_test_...  
Webhook Secret: whsec_... (after creating webhook)
```

### 3. Set Vercel Env Vars (1 minute)
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
VITE_APP_URL=https://your-app.vercel.app
```

### 4. Deploy (30 seconds)
```bash
vercel --prod
```

---

## 📁 Files Changed/Created

### Created
```
api/create-checkout.ts                 # Stripe checkout endpoint
api/webhooks/stripe.ts                 # Webhook handler
MIGRATION_stripe_payment_flow.sql      # Database changes
STRIPE_INTEGRATION_GUIDE.md            # Full setup guide
STRIPE_PAYMENT_IMPLEMENTATION.md       # Implementation details
DEPLOYMENT_READY.md                    # Deployment checklist
QUICK_START.md                         # This file
```

### Modified
```
package.json                           # Added Stripe dependencies
src/pages/QuoteDetail.tsx              # Added deposit payment UI
src/pages/JobDetail.tsx                # Added invoice generation
.env.example                           # Added Stripe env vars
vercel.json                            # Added API route handling
```

---

## 🎯 How to Use

### For Contractors (Quote → Job Flow)

1. **Create Quote** with client
2. **Set Deposit Amount** on quote detail page
3. **Send payment link** to client OR collect offline
4. **Client pays** → Stripe processes → Webhook fires
5. **Job auto-created** with quote details
6. **Complete job** → Generate invoice
7. **Send invoice** to client

### For Developers

**Create Checkout:**
```typescript
POST /api/create-checkout
{
  "quoteId": "uuid",
  "depositAmount": 100.00,
  "clientEmail": "client@example.com"
}
```

**Webhook Event:**
```typescript
POST /api/webhooks/stripe
Event: checkout.session.completed
→ Updates quote.deposit_paid = true
→ Creates new job with quote.quote_id
```

---

## 🧪 Test It

```bash
# 1. Set deposit on quote
Amount: $50

# 2. Click "Pay Deposit with Stripe"

# 3. Use test card
Card: 4242 4242 4242 4242
Exp: 12/34
CVC: 123

# 4. Verify
- Quote shows "✓ Deposit Paid"
- New job appears in Jobs list
- Job references quote
```

---

## 📚 Need More Info?

- **Full guide:** `STRIPE_INTEGRATION_GUIDE.md`
- **Implementation:** `STRIPE_PAYMENT_IMPLEMENTATION.md`
- **Deploy checklist:** `DEPLOYMENT_READY.md`

---

**Built:** February 11, 2026  
**Status:** ✅ Ready to deploy  
**Build:** ✅ Passing  
**Tests:** Ready for manual testing
