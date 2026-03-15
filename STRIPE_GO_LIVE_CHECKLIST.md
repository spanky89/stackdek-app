# Stripe Go-Live Checklist

**Goal:** Switch from test mode to live mode for real payments

**Time estimate:** 30 minutes

---

## ✅ Step 1: Get Live Stripe Keys (5 min)

**Go to Stripe Dashboard:** https://dashboard.stripe.com

1. **Toggle to LIVE mode** (top right corner - flip the switch from "Test" to "Live")
2. Go to **Developers** → **API keys**
3. Copy these keys:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`) - Click "Reveal" to see it

⚠️ **Keep these secret!** Don't share or commit them to Git.

---

## ✅ Step 2: Update Vercel Environment Variables (10 min)

**Current Setup:** StackDek uses distributed Stripe (each user connects their own account)

**But platform needs these for Stripe Connect:**

1. **Go to Vercel Dashboard:** https://vercel.com/spanky89/stackdek-app
2. Click **Settings** → **Environment Variables**
3. Find and update these variables:

| Variable | Current (Test) | New (Live) |
|----------|---------------|------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |

4. **Apply to:** Production (main branch)
5. Click **Save**
6. **Redeploy:** Vercel → Deployments → click "..." on latest → "Redeploy"

---

## ✅ Step 3: Update Stripe Webhook for Live Mode (10 min)

**Webhooks tell StackDek when payments complete**

### 3.1 Get Production Webhook URL

Your webhook endpoint:
```
https://stackdek-app.vercel.app/api/webhooks/stripe
```

### 3.2 Create Live Mode Webhook in Stripe

1. In Stripe Dashboard, **stay in LIVE mode**
2. Go to **Developers** → **Webhooks**
3. Click **Add endpoint**
4. Paste webhook URL: `https://stackdek-app.vercel.app/api/webhooks/stripe`
5. Under **Select events to listen to**, choose:
   - `checkout.session.completed`
   - `account.updated` (for Stripe Connect)
   - `customer.subscription.created` (for billing)
   - `customer.subscription.updated` (for billing)
   - `customer.subscription.deleted` (for billing)
6. Click **Add endpoint**

### 3.3 Get Webhook Signing Secret

1. Click on the webhook you just created
2. Under **Signing secret**, click **Reveal**
3. Copy the secret (starts with `whsec_...`)

### 3.4 Add Webhook Secret to Vercel

1. Back to Vercel → Settings → Environment Variables
2. Find or create: `STRIPE_WEBHOOK_SECRET`
3. Update value to the new live webhook secret
4. Apply to Production
5. Save and redeploy

---

## ✅ Step 4: Test Live Payments (5 min)

**Use a real card for testing (won't charge much)**

1. Log into StackDek app
2. Go to Settings → Payment Settings
3. If using distributed model, your customers will connect their own Stripe accounts
4. Create a test quote with $1 deposit
5. Click **Pay Deposit with Stripe**
6. Use a real card (test cards won't work in live mode!)
7. Complete payment
8. Verify:
   - Payment appears in Stripe Dashboard (Live mode)
   - Webhook fires successfully
   - Quote status updates in StackDek

---

## ✅ Step 5: Verify Stripe Connect (if using distributed model)

**Check OAuth flow for customer Stripe connections:**

1. Log in as a test user (not admin)
2. Go to Settings → Payment Settings
3. Click "Connect Stripe Account"
4. Should redirect to Stripe OAuth (live mode)
5. Complete connection
6. Verify connected account shows in Settings

---

## 🚨 Rollback Plan (if something breaks)

**If live mode has issues:**

1. Go back to Stripe Dashboard → Toggle to **Test mode**
2. Vercel → Environment Variables → Switch keys back to `pk_test_...` and `sk_test_...`
3. Update webhook to point to test mode endpoint
4. Redeploy

---

## ✅ Final Checks

- [ ] Stripe Dashboard shows "Live mode" (top right)
- [ ] Vercel env vars use `pk_live_...` and `sk_live_...`
- [ ] Live webhook created and signing secret added
- [ ] Test payment completed successfully with real card
- [ ] Payment shows in Stripe Dashboard (Live mode)
- [ ] Webhook fires and updates StackDek correctly
- [ ] Stripe Connect works (if using distributed model)

---

## 💡 Notes

**Distributed Stripe Model:**
- Platform keys are for Stripe Connect OAuth
- Each customer connects their own Stripe account
- Payments go directly to customer's Stripe → their bank
- StackDek never touches the money

**Important:**
- Test thoroughly with small amounts ($1-5)
- Monitor Stripe Dashboard → Developers → Events for webhook activity
- Check Vercel logs for any errors
- Keep test mode keys handy for rollback

---

## 📞 Support

**Stripe Support:** https://support.stripe.com
**Vercel Support:** https://vercel.com/support

**Common Issues:**
- "Invalid API key" → Check env vars in Vercel, redeploy
- "Webhook signature failed" → Update `STRIPE_WEBHOOK_SECRET` in Vercel
- "Card declined" → Use different card or contact bank
- "OAuth error" → Check platform keys are live mode

---

**Current Status:** Test mode ✅  
**Target:** Live mode 🎯  
**Time to complete:** ~30 minutes

**Ready to launch!** 🚀
