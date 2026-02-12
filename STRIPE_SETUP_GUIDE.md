# Stripe Setup Guide for StackDek (Distributed Integration)

## Overview

StackDek uses a **distributed Stripe integration**, meaning each contractor uses their own Stripe account. Payments go directly to your Stripe account—StackDek never touches your money.

---

## Prerequisites

- A StackDek account
- A Stripe account (free to create at [stripe.com](https://stripe.com))

---

## Step 1: Create or Log In to Your Stripe Account

1. Go to [stripe.com](https://stripe.com)
2. Sign up for a new account or log in if you already have one
3. Complete Stripe's onboarding (business info, bank account, etc.)
4. Once activated, you can accept payments

---

## Step 2: Get Your Stripe API Keys

### Test Mode (for testing before going live)

1. In your Stripe Dashboard, toggle to **Test mode** (top right)
2. Go to **Developers** → **API keys**
3. You'll see:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`) - Click "Reveal" to see it

### Live Mode (for real payments)

1. Toggle to **Live mode**
2. Go to **Developers** → **API keys**
3. You'll see:
   - **Publishable key** (starts with `pk_live_...`)
   - **Secret key** (starts with `sk_live_...`) - Click "Reveal" to see it

> ⚠️ **Important:** Never share your Secret Key publicly or commit it to Git. It gives full access to your Stripe account.

---

## Step 3: Add Stripe Keys to StackDek

1. Log in to StackDek
2. Go to **Settings** → **Payment Settings**
3. Paste your keys:
   - **Stripe Publishable Key:** `pk_test_...` or `pk_live_...`
   - **Stripe Secret Key:** `sk_test_...` or `sk_live_...`
4. Leave **Webhook Secret** blank for now (we'll add it in Step 4)
5. Click **Save**

---

## Step 4: Set Up Stripe Webhook (Required)

Webhooks allow Stripe to notify StackDek when a payment is completed, so jobs can be auto-created.

### 4.1 Get Your Webhook URL

1. In StackDek, go to **Settings** → **Payment Settings**
2. You'll see a **Webhook Endpoint** section with a URL like:
   ```
   https://your-stackdek-domain.com/api/webhooks/stripe?companyId=YOUR_COMPANY_ID
   ```
3. Click **Copy Webhook URL**

### 4.2 Add Webhook to Stripe

1. In your Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Paste the webhook URL you copied from StackDek
4. Under **Select events to listen to**, choose:
   - `checkout.session.completed`
5. Click **Add endpoint**

### 4.3 Get Your Webhook Secret

1. After creating the endpoint, click on it
2. Under **Signing secret**, click **Reveal**
3. Copy the secret (starts with `whsec_...`)

### 4.4 Add Webhook Secret to StackDek

1. Return to StackDek **Settings** → **Payment Settings**
2. Paste the webhook secret into **Stripe Webhook Secret**
3. Click **Save**

---

## Step 5: Test Your Integration (Test Mode)

1. Create a test quote in StackDek
2. Add a deposit amount
3. Click **Pay Deposit with Stripe**
4. Use Stripe's test card: `4242 4242 4242 4242`
   - Any future expiration date
   - Any 3-digit CVC
   - Any ZIP code
5. Complete the payment
6. Check that:
   - Quote is marked "Deposit Paid"
   - A job was auto-created

---

## Step 6: Go Live

When you're ready to accept real payments:

1. In Stripe, complete all onboarding requirements
2. Toggle to **Live mode** in Stripe
3. Get your **Live** API keys (step 2 above)
4. Update your keys in StackDek **Settings** → **Payment Settings**
5. Create a **new webhook endpoint** for Live mode (same URL, but in Live mode)
6. Update the **Webhook Secret** in StackDek

---

## Troubleshooting

### "Stripe not configured" error

- Check that you've entered both Publishable and Secret keys in Settings
- Make sure you're using keys from the correct mode (Test or Live)
- Click "Save" after entering keys

### Payments complete but jobs aren't created

- Check your webhook is set up correctly (Step 4)
- Verify the webhook secret is correct in StackDek Settings
- In Stripe, go to **Developers** → **Webhooks** → Click your endpoint → Check **Recent events** for errors

### "Webhook signature verification failed"

- Your webhook secret is incorrect or missing
- Go back to Stripe, reveal the webhook secret, and update it in StackDek

### Still having issues?

- Check the Stripe Dashboard **Logs** for detailed error messages
- Make sure your StackDek account is active and you're logged in
- Contact support: [your-support-email@example.com]

---

## Security Notes

- **Never share your Secret Key or Webhook Secret**
- Store them only in StackDek Settings (they're encrypted)
- If compromised, regenerate keys in Stripe immediately
- Use Test mode for development; Live mode only for production

---

## Additional Resources

- [Stripe Dashboard](https://dashboard.stripe.com)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe Test Cards](https://stripe.com/docs/testing#cards)

---

**Questions?** Email support or check the StackDek documentation.
