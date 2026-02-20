# Spanky's Manual Setup To-Do List

**Last Updated:** Feb 19, 2026 @ 11:37 AM  
**Launch:** Feb 23, 2026 (4 days)

---

## 🔥 CRITICAL (Do First - Today)

### 1. **Stripe Integration** (60 min)
**What:** Set up Stripe for contractor payment processing

**Steps:**
1. Create Stripe account at https://stripe.com (or log into existing)
2. Complete business verification (StackDek, LLC info)
3. Get API keys:
   - Dashboard → Developers → API keys
   - Copy **Publishable key** (starts with `pk_`)
   - Copy **Secret key** (starts with `sk_`)
4. Set up webhook:
   - Dashboard → Developers → Webhooks → Add endpoint
   - URL: `https://stackdek-app.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`
   - Copy **Webhook signing secret** (starts with `whsec_`)
5. Add to Vercel env vars:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_...
   STRIPE_SECRET_KEY=sk_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
6. Redeploy app

**Why:** Quote deposits, invoice payments, contractor onboarding

---

### 2. **Resend Email Setup** (20 min)
**What:** Welcome emails + drip sequence

**Steps:**
1. Go to https://resend.com/signup
2. Create account (use spanky@stackdek.com or personal email)
3. Verify `stackdek.com` domain:
   - Dashboard → Domains → Add Domain
   - Add DNS TXT record to your domain provider (GoDaddy/Namecheap/etc.)
   - Wait for verification (~5 min)
4. Generate API key:
   - Dashboard → API Keys → Create
   - Copy key (starts with `re_`)
5. Run deployment:
   ```powershell
   cd C:\Users\x\.openclaw\workspace\stackdek-app
   .\deploy-welcome-email.ps1
   ```
   - When prompted, paste the Resend API key
6. Enable database trigger in Supabase:
   - Go to SQL Editor
   - Run `migrations/welcome-email-trigger.sql`
7. Test with dummy signup

**Docs:** See `stackdek-app/RESEND_SETUP_GUIDE.md` for detailed steps

---

### 3. **Supabase Storage Buckets** (15 min)
**What:** File uploads (company logos, invoice attachments, profile pics)

**Steps:**
1. Go to https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus/storage/buckets
2. Click **New Bucket** for each:
   
   **Bucket 1: `company-logos`**
   - Name: `company-logos`
   - Public: ✅ Yes
   - File size limit: 2 MB
   - Allowed MIME types: `image/png, image/jpeg, image/webp`
   
   **Bucket 2: `attachments`**
   - Name: `attachments`
   - Public: ❌ No (private)
   - File size limit: 10 MB
   - Allowed MIME types: `image/*, application/pdf`
   
   **Bucket 3: `profile-images`**
   - Name: `profile-images`
   - Public: ✅ Yes
   - File size limit: 2 MB
   - Allowed MIME types: `image/png, image/jpeg, image/webp`

3. Set RLS policies:
   - company-logos: Users can upload/update their own company's logo
   - attachments: Users can only access their own company's files
   - profile-images: Users can upload/update their own avatar

**Why:** Company branding, invoice attachments, user avatars

---

### 4. **Domain Linking** (30 min)
**What:** Point custom domains to Vercel deployments

**Steps:**

#### **A. App Domain** (`app.stackdek.com` → stackdek-app)
1. Go to Vercel project: https://vercel.com/[your-account]/stackdek-app
2. Settings → Domains → Add Domain
3. Enter: `app.stackdek.com`
4. Vercel will show DNS instructions
5. Go to your domain provider (GoDaddy/Namecheap/Cloudflare)
6. Add DNS records:
   - Type: `CNAME`
   - Name: `app`
   - Value: `cname.vercel-dns.com`
7. Wait for DNS propagation (~5-30 min)

#### **B. Landing Domain** (`stackdek.com` or `www.stackdek.com` → stackdek-landing)
1. Go to Vercel project: https://vercel.com/[your-account]/stackdek-landing
2. Settings → Domains → Add Domain
3. Enter: `stackdek.com` and `www.stackdek.com`
4. Add DNS records:
   - Type: `A` (for root domain)
   - Name: `@`
   - Value: `76.76.21.21` (Vercel IP)
   
   - Type: `CNAME` (for www)
   - Name: `www`
   - Value: `cname.vercel-dns.com`
5. Wait for DNS propagation

#### **C. Update Environment Variables**
After domains are live, update in Vercel:
- `VITE_APP_URL=https://app.stackdek.com`
- `VITE_LANDING_URL=https://stackdek.com`

**Why:** Professional URLs, SEO, brand trust

---

## 🟡 HIGH PRIORITY (Do Today/Tomorrow)

### 5. **Supabase OAuth Credentials** (15 min)
**What:** Google Sign-in already works, but verify config

**Steps:**
1. Go to https://supabase.com/dashboard/project/duhmbhxlmvczrztccmus/auth/providers
2. Verify **Google** provider is enabled
3. Check redirect URLs include:
   - `https://stackdek-app.vercel.app/auth/callback`
   - `https://app.stackdek.com/auth/callback` (after domain setup)
4. If adding more providers (Apple, Microsoft), configure here

**Status:** ✅ Google already working (Feb 19)

---

### 6. **Test All Flows End-to-End** (60 min)
**What:** Manual QA before launch

**Checklist:**
- [ ] Sign up (email + Google OAuth)
- [ ] Create client
- [ ] Create quote with line items
- [ ] Send quote via SMS/email
- [ ] Client views quote (public link)
- [ ] Pay deposit (Stripe test card: `4242 4242 4242 4242`)
- [ ] Job auto-creates from paid quote
- [ ] Mark job complete
- [ ] Create invoice from job
- [ ] Mark invoice paid
- [ ] Check help docs (`/help`)
- [ ] Mobile test (real phone)

**Why:** Catch bugs before real users hit the app

---

### 7. **Update App URLs in Code** (10 min)
**What:** After domains are linked, update hardcoded URLs

**Files to check:**
- `stackdek-landing/src/Home.jsx` - Login button URL
- `stackdek-app/src/pages/QuotePublicView.tsx` - Public quote links
- Any email templates with app links

**Find/Replace:**
- `stackdek-app.vercel.app` → `app.stackdek.com`
- `stackdek-landing.vercel.app` → `stackdek.com`

---

## 🟢 NICE TO HAVE (Before Launch)

### 8. **Google Maps API Key** (Optional)
**What:** "Navigate to client" button in job details

**Steps:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create project: "StackDek"
3. Enable Maps JavaScript API
4. Create API key
5. Add to Vercel env: `VITE_GOOGLE_MAPS_API_KEY=AIza...`

**Status:** Currently using basic Google Maps links (works without API key)

---

### 9. **Favicon + App Icons** (10 min)
**What:** Browser tab icon, mobile home screen icon

**Steps:**
1. Create 512×512 PNG logo
2. Use https://realfavicongenerator.net to generate all sizes
3. Replace `stackdek-app/public/favicon.ico`
4. Add manifest.json for PWA support

**Status:** Currently using default Vite icon

---

### 10. **Error Monitoring** (15 min)
**What:** Track production errors (Sentry/LogRocket)

**Options:**
- **Free:** Sentry (50k events/month free)
- **Paid:** LogRocket ($99/mo, session replay)

**Steps:**
1. Create Sentry account
2. Create project: "StackDek App"
3. Get DSN key
4. Install: `npm install @sentry/react`
5. Add to `stackdek-app/src/main.tsx`

**Why:** Catch errors users don't report

---

## 📊 SUMMARY

### ⏰ Time Estimates
- **Critical (Do First):** ~2 hours 5 min
- **High Priority:** ~1 hour 25 min
- **Nice to Have:** ~35 min
- **Total:** ~4 hours

### ✅ Completion Status
- [x] Help docs deployed
- [x] Technical SEO deployed
- [x] Welcome email code built (needs Resend setup)
- [ ] Stripe integration
- [ ] Resend setup + deploy
- [ ] Storage buckets
- [ ] Domain linking
- [ ] End-to-end testing

---

## 🚀 Quick Launch Path (Minimum Viable)

If you're short on time, **do these 4 things only:**

1. **Stripe setup** (60 min) - payments are core functionality
2. **Resend setup** (20 min) - welcome emails set professional tone
3. **Storage buckets** (15 min) - logo uploads needed in Settings
4. **End-to-end test** (30 min) - make sure nothing breaks

**Total:** 2 hours 5 minutes → Ready to launch

Domains and nice-to-haves can happen post-launch.

---

**Start here:** Pick one task, set a timer, knock it out. I'll track your progress and update this list.
