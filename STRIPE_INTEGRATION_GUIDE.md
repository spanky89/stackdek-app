# Stripe Payment Integration - Setup Guide

## Overview
This guide covers the complete setup for Stripe payment integration with automatic job creation from deposits.

## 1. Database Schema Updates

Run the migration file in your Supabase SQL Editor:

```bash
MIGRATION_stripe_payment_flow.sql
```

This adds:
- `deposit_amount`, `deposit_paid`, `stripe_checkout_session_id` to quotes
- `quote_id`, `completed_at` to jobs  
- `quote_id`, updated `status` constraint to invoices

## 2. Stripe Account Setup

### Get Stripe API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)

### Set up Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-app.vercel.app/api/webhooks/stripe`
4. Events to listen: Select `checkout.session.completed`
5. Copy the **Signing secret** (starts with `whsec_`)

## 3. Vercel Environment Variables

Add these to your Vercel project settings (Settings → Environment Variables):

```bash
# Production & Preview environments
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=https://your-app.vercel.app

# Server-side only (NOT in .env.local)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important:** 
- Get `SUPABASE_SERVICE_ROLE_KEY` from Supabase Dashboard → Settings → API → `service_role` key
- This key bypasses RLS and should NEVER be exposed to the client

## 4. Install Dependencies

```bash
npm install
```

New packages added:
- `stripe` - Stripe Node.js library
- `@stripe/stripe-js` - Stripe.js for client-side
- `@vercel/node` - Vercel serverless functions types

## 5. Testing the Flow

### Test Deposit Payment

1. Navigate to a quote detail page
2. Set a deposit amount (e.g., $100)
3. Click "Save Amount"
4. Click "Pay Deposit with Stripe"
5. Use Stripe test card: `4242 4242 4242 4242`
6. Complete the checkout
7. Webhook should auto-mark deposit as paid
8. A new job should be created automatically

### Test Invoice Generation

1. Navigate to a job detail page
2. Click "Mark Complete & Generate Invoice"
3. Edit line items in the modal
4. Click "Save Invoice"
5. Invoice created with status "awaiting_payment"
6. Job marked as completed

### Stripe Test Cards

- **Success:** 4242 4242 4242 4242
- **Decline:** 4000 0000 0000 0002
- **3D Secure:** 4000 0025 0000 3155

Use any future expiry date and any 3-digit CVC.

## 6. Webhook Testing (Local Development)

To test webhooks locally:

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to http://localhost:5173/api/webhooks/stripe

# Copy the webhook signing secret and add to .env.local
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## 7. Feature Breakdown

### Quote Deposit Flow

1. **Set Deposit Amount:** Quote detail page allows setting deposit amount
2. **Pay Deposit:** Stripe checkout session created via `/api/create-checkout`
3. **Webhook Handler:** Listens for `checkout.session.completed` event
4. **Auto-create Job:** Webhook marks deposit paid and creates job with quote line items
5. **Offline Payment:** Manual checkbox to mark deposit paid without Stripe

### Invoice Generation Flow

1. **Simple Complete:** Mark job completed without invoice
2. **Complete with Invoice:** Opens modal with editable line items
3. **Pre-filled Data:** Line items auto-populated from quote if available
4. **Save Invoice:** Creates invoice + line items with status "awaiting_payment"
5. **Job Link:** Invoice references both job_id and quote_id for tracking

## 8. API Endpoints

### `/api/create-checkout` (POST)

Creates Stripe checkout session for deposit payment.

**Request:**
```json
{
  "quoteId": "uuid",
  "depositAmount": 100.00,
  "clientEmail": "client@example.com",
  "clientName": "John Doe",
  "companyName": "ABC Contracting"
}
```

**Response:**
```json
{
  "sessionId": "cs_test_xxx",
  "url": "https://checkout.stripe.com/xxx"
}
```

### `/api/webhooks/stripe` (POST)

Handles Stripe webhook events (signature verified).

**Events handled:**
- `checkout.session.completed` - Marks deposit paid, creates job

## 9. Deployment Checklist

- [ ] Run database migration in Supabase
- [ ] Add Stripe API keys to Vercel env vars
- [ ] Add Supabase service role key to Vercel env vars
- [ ] Set VITE_APP_URL to production domain
- [ ] Configure Stripe webhook endpoint
- [ ] Deploy to Vercel
- [ ] Test deposit payment flow
- [ ] Test invoice generation
- [ ] Verify webhook auto-creates job

## 10. Security Notes

- ✅ Webhook signatures are verified
- ✅ Service role key is server-side only
- ✅ RLS policies protect all data access
- ✅ Stripe checkout handles PCI compliance
- ✅ No credit card data stored in database

## 11. Future Enhancements

- Email notifications on deposit payment
- Invoice PDF generation
- Stripe payment links for invoices
- Recurring payment support
- Multi-currency support

## Support

For Stripe issues: https://support.stripe.com
For Supabase issues: https://supabase.com/docs
