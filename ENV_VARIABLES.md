# 🔐 Environment Variables Reference

Complete list of environment variables for StackDek app.

---

## 📍 Where to Store Variables

| Variable Type | Storage Location | Access Level |
|--------------|------------------|--------------|
| Public (frontend) | `.env.local` | Client-side (VITE_*) |
| Private (backend) | `.env.local` | Server-side only |
| Secrets (Edge Functions) | Supabase Secrets | Edge Function runtime |
| Database secrets | Supabase Dashboard | Database functions |

---

## 🔑 Supabase Configuration

### Frontend (Public)

```bash
VITE_SUPABASE_URL=https://duhmbhxlmvczrztccmus.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_2jG1RI7gzAOcrJ6DcckLkw_A4XGb2gX
```

**Where to find:**
- Supabase Dashboard → Settings → API
- These are safe to expose client-side

### Backend (Private)

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Where to find:**
- Supabase Dashboard → Settings → API → service_role key
- ⚠️ **Never expose this** - gives admin access

---

## 📧 Resend Email API

```bash
RESEND_API_KEY=re_your_key_here
RESEND_DOMAIN=stackdek.com
```

**How to set:**
```bash
# For Edge Functions (preferred)
supabase secrets set RESEND_API_KEY=re_...

# For local development
# Add to .env.local (documentation only)
RESEND_API_KEY=re_...
```

**Where to get:**
- https://resend.com/api-keys
- Free tier: 100/day, 3,000/month

---

## 💳 Stripe Configuration

### Platform Billing (StackDek Subscription Revenue)

```bash
STACKDEK_STRIPE_PUBLISHABLE_KEY=pk_live_...
STACKDEK_STRIPE_SECRET_KEY=sk_live_...
STACKDEK_STRIPE_WEBHOOK_SECRET=whsec_...
```

**What these are for:**
- Billing contractors for StackDek Pro/Premium plans
- Your Stripe account (platform revenue)

**Where to get:**
- https://dashboard.stripe.com/apikeys

### Price IDs (Products)

```bash
STRIPE_PRICE_PRO=price_...        # $29/month
STRIPE_PRICE_PREMIUM=price_...    # $99/month
```

**Where to create:**
- Stripe Dashboard → Products → Create Product
- Get price ID from the product page

---

## 🗺️ Google Maps API

```bash
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
```

**What it's for:**
- Address autocomplete in client forms
- Map views (if implemented)

**Where to get:**
- https://console.cloud.google.com/apis/credentials
- Enable: Maps JavaScript API, Places API

---

## 🌐 App Configuration

```bash
VITE_APP_URL=https://app.stackdek.com
```

**Used for:**
- OAuth redirects
- Email links
- Webhook callbacks

**Environments:**
- Development: `http://localhost:5173`
- Staging: `https://stackdek-staging.vercel.app`
- Production: `https://app.stackdek.com`

---

## 📦 Complete `.env.local` Template

Copy this to `stackdek-app/.env.local`:

```bash
# ============================================
# StackDek App - Environment Variables
# ============================================

# ---------------------------------------------
# Supabase Configuration
# ---------------------------------------------
VITE_SUPABASE_URL=https://duhmbhxlmvczrztccmus.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_2jG1RI7gzAOcrJ6DcckLkw_A4XGb2gX
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# ---------------------------------------------
# App Configuration
# ---------------------------------------------
VITE_APP_URL=https://app.stackdek.com

# ---------------------------------------------
# Resend Email API
# ---------------------------------------------
# Note: Set via Supabase secrets for Edge Functions
# This is for documentation/reference only
RESEND_API_KEY=re_...
RESEND_DOMAIN=stackdek.com

# ---------------------------------------------
# StackDek Platform Billing (Stripe)
# ---------------------------------------------
STACKDEK_STRIPE_PUBLISHABLE_KEY=pk_live_...
STACKDEK_STRIPE_SECRET_KEY=sk_live_...
STACKDEK_STRIPE_WEBHOOK_SECRET=whsec_...

# Product Price IDs
STRIPE_PRICE_PRO=price_...        # $29/month
STRIPE_PRICE_PREMIUM=price_...    # $99/month

# ---------------------------------------------
# Google Maps API
# ---------------------------------------------
VITE_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE

# ---------------------------------------------
# Notes
# ---------------------------------------------
# - Variables starting with VITE_ are exposed to frontend
# - Other variables are backend-only
# - Never commit this file to git (.gitignore'd)
# - For Vercel deployment, add these in Project Settings
# - For Edge Functions, use: supabase secrets set KEY=value
```

---

## 🚀 Deployment Environments

### Vercel (Frontend + API Routes)

**How to set:**
1. Go to: https://vercel.com/your-project/settings/environment-variables
2. Add each variable
3. Select environment (Production, Preview, Development)
4. Save

**Required variables:**
- All `VITE_*` variables
- All Stripe variables
- `VITE_APP_URL`

### Supabase Edge Functions

**How to set:**
```bash
# Set secrets for Edge Functions
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set STRIPE_SECRET_KEY=sk_...

# List current secrets (values hidden)
supabase secrets list

# Delete a secret
supabase secrets unset SECRET_NAME
```

**Required secrets:**
- `RESEND_API_KEY` (for email functions)

---

## 🔍 Checking Variables

### Local Development

```bash
# Check .env.local exists
ls .env.local

# View variables (be careful - don't paste in public)
cat .env.local
```

### Vercel

```bash
# Using Vercel CLI
vercel env ls

# Pull production env to local
vercel env pull .env.local
```

### Supabase

```bash
# List Edge Function secrets
supabase secrets list

# Test Edge Function with local env
supabase functions serve send-welcome-email --env-file .env.local
```

---

## ⚠️ Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit secrets to git
- [ ] Rotate keys if accidentally exposed
- [ ] Use different keys for dev/staging/prod
- [ ] Service role key only on server-side
- [ ] API keys have minimal required permissions

---

## 🆘 Troubleshooting

### "Supabase client error" in browser console

**Problem:** Missing or invalid `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY`

**Fix:**
1. Check `.env.local` has correct values
2. Restart dev server: `npm run dev`
3. Hard refresh browser (Ctrl+Shift+R)

### "Resend API error" in Edge Function logs

**Problem:** Missing or invalid `RESEND_API_KEY`

**Fix:**
```bash
# Re-set the secret
supabase secrets set RESEND_API_KEY=re_your_actual_key
# Redeploy function
supabase functions deploy send-welcome-email
```

### "Stripe error" in payment flow

**Problem:** Wrong Stripe keys or not set

**Fix:**
1. Check `.env.local` for `STACKDEK_STRIPE_*` keys
2. Verify keys match your Stripe account
3. Check test vs live mode (test keys start with `pk_test_` / `sk_test_`)

---

## 📚 Resources

- **Supabase Docs:** https://supabase.com/docs/guides/cli/managing-environments
- **Vercel Env Vars:** https://vercel.com/docs/projects/environment-variables
- **Stripe API Keys:** https://stripe.com/docs/keys
- **Resend API:** https://resend.com/docs/api-reference/authentication

---

*Last updated: February 19, 2026*
