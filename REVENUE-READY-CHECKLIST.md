# StackDek Revenue-Ready Checklist
**Status:** Testing Complete → Push to 18k Leads  
**Updated:** March 2, 2026  
**Goal:** Get signups and revenue flowing

---

## 🔥 CRITICAL (Block Lead Push)

### 1. Stripe Test → Live Mode ⚠️ PRIORITY 1
**Why:** Can't take real payments on test keys

**Steps:**
1. **Stripe Dashboard → Switch to Live Mode** (top right toggle)
2. **Create Live Products:**
   - Products → Create Product
   - "StackDek Pro" - $69/month recurring
   - Copy **Live Price ID** (starts with `price_...`)
3. **Get Live API Keys:**
   - Developers → API Keys
   - Copy **Live Publishable Key** (`pk_live_...`)
   - Copy **Live Secret Key** (`sk_live_...`)
4. **Setup Live Webhook:**
   - Developers → Webhooks → Add Endpoint
   - URL: `https://stackdek-app.vercel.app/api/webhooks/stripe-billing`
   - Events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
   - Copy **Live Webhook Secret** (`whsec_...`)
5. **Update Vercel Environment Variables:**
   - Go to: https://vercel.com/[your-account]/stackdek-app/settings/environment-variables
   - Update ALL to live keys:
     ```
     STACKDEK_STRIPE_PUBLISHABLE_KEY=pk_live_...
     STACKDEK_STRIPE_SECRET_KEY=sk_live_...
     STACKDEK_STRIPE_WEBHOOK_SECRET=whsec_...
     STRIPE_PRICE_PRO=price_... (LIVE price ID)
     ```
6. **Redeploy App** (Vercel auto-deploys on env change)
7. **Test with Real Card** (small amount, refund after)

**Time:** 30 minutes  
**Status:** ⚠️ NOT DONE

---

### 2. Email Confirmation System ⚠️ PRIORITY 2
**Why:** Signup emails build trust, welcome sequence nurtures trials

**Quick Path (Resend - Recommended):**

**Steps:**
1. **Create Resend Account:** https://resend.com/signup
2. **Verify Domain:**
   - Dashboard → Domains → Add Domain
   - Add DNS TXT record to domain provider
   - Wait 5-10 min for verification
3. **Get API Key:**
   - Dashboard → API Keys → Create
   - Copy key (starts with `re_...`)
4. **Add to Vercel:**
   ```
   RESEND_API_KEY=re_...
   RESEND_DOMAIN=stackdek.com
   ```
5. **Deploy Welcome Email Code:**
   ```powershell
   cd stackdek-app
   git pull origin main
   # Code already exists in /api/emails/welcome.ts
   ```
6. **Enable Supabase Trigger:**
   - SQL Editor → Run `migrations/welcome-email-trigger.sql`
7. **Test:** Create dummy account, check email arrives

**Alternative (If Domain Not Ready):**
- Use Resend sandbox mode (sends to verified addresses only)
- Or use Supabase Auth emails (basic, free, works immediately)

**Time:** 20-30 minutes  
**Status:** ⚠️ NOT DONE  
**Blocker:** Need Resend API key

---

## 🎨 POLISH ITEMS

### 3. Products/Services Import/Export ✅ COMPLETE
**Status:** DONE (11:38 AM - 12:15 PM)

**What was built:**
- New "Import/Export Data" section in Settings
- Import services from CSV (name, price, description)
- Import products from CSV (name, price, description)
- Export services to CSV
- Export products to CSV
- Sample CSV templates for both
- Validation and error handling
- Integrated with existing customer data CSV tools

**Location:** Settings → Services & Products → Import/Export Data

**File Created:** `src/components/ProductsServicesImportExport.tsx`

### 4. Additional Polish Tasks
**What needs fixing:**

- [ ] **Photo and video upload** - ❌ **CONFIRMED BROKEN**
  - Tested: Upload fails with error message
  - Fix: Create `quote-videos` and `quote-photos` buckets in Supabase
  - Must be exact spelling (lowercase)
  - Must be public buckets
  - Time: 5 minutes
  - See: `FIX-PHOTO-VIDEO-UPLOAD.md` for step-by-step

**Other items:**
- [ ] Bugs discovered during testing?
- [ ] UI issues on mobile?
- [ ] Confusing workflows?
- [ ] Missing error messages?
- [ ] Slow page loads?

**I'll fix these once you provide details.**

---

## 🚀 LEAD CAMPAIGN PREP

### 4. Lead Push Strategy
**18k Leads Ready to Deploy**

**Campaign Channels:**
- [ ] **SMS Campaign** (Google Voice)
  - Message draft ready?
  - Link to landing page?
  - Timing (batch send or drip)?
- [ ] **Email Campaign** (if emails collected)
  - Subject line?
  - Body copy?
  - CTA to sign up?
- [ ] **Contact Forms** (if websites scraped)
  - Automated submission?
  - 2Captcha budget?
  - Message template?

**Conversion Funnel:**
```
Lead → Landing Page → Signup → Dashboard → First Quote → Paid Customer
```

**Questions:**
- [ ] What's the lead format? (CSV with phone/email/company?)
- [ ] SMS message drafted?
- [ ] Landing page optimized for conversions?
- [ ] Signup flow tested end-to-end?

---

## 📊 MONITORING SETUP

### 5. Track Signups & Conversions
**Where do we track:**
- [ ] Signups: Supabase dashboard (auth.users table)
- [ ] Active users: Dashboard → check daily logins
- [ ] Paid conversions: Stripe dashboard
- [ ] SMS responses: Google Voice inbox
- [ ] Email replies: Gmail inbox

**Daily Checklist (Post-Launch):**
- [ ] Check signups (goal: 10-20/day)
- [ ] Respond to SMS/email replies (30 min)
- [ ] Monitor error logs (Vercel functions)
- [ ] Check payment failures (Stripe webhooks)
- [ ] User support (if issues reported)

---

## ✅ ALREADY DONE

- [x] **App Built & Deployed** (stackdek-app.vercel.app)
- [x] **Landing Page Live** (stackdek-landing.vercel.app)
- [x] **Core Features Working:**
  - [x] Quote → Job → Invoice workflow
  - [x] Client management
  - [x] SMS/email quote sending
  - [x] Stripe payment integration (test mode)
  - [x] Admin dashboard
- [x] **Testing Complete** (internal use validated)
- [x] **18k Leads Scraped** (North GA contractors)
- [x] **Marketing Assets Ready**

---

## 🎯 LAUNCH SEQUENCE

**Day 1 (After Stripe + Email Done):**
1. ✅ Stripe live mode active
2. ✅ Email confirmations working
3. ✅ Polish items fixed
4. 🚀 SMS blast to 1,000 leads (test batch)
5. 📊 Monitor signups for 24 hours
6. 🐛 Fix any issues reported

**Day 2-3:**
7. 📈 Analyze Day 1 conversion rate
8. 🔧 Adjust messaging if needed
9. 🚀 SMS blast to remaining 17k leads (staggered)
10. 💬 Respond to inquiries/demos

**Day 4-7:**
11. 🎯 Close first 10 paid customers
12. 📞 Demo calls with interested leads
13. 💰 Track MRR (Monthly Recurring Revenue)

**Goal:** 20-50 signups, 5-10 paid customers in Week 1

---

## 🔴 BLOCKERS

**What's stopping the launch?**
1. ⚠️ **Stripe test → live** (you need to do this)
2. ⚠️ **Email setup** (Resend API key needed)
3. ❓ **Polish items** (what specifically?)

**Once resolved → Ready to push leads!**

---

## 📋 YOUR ACTION ITEMS

**Right now:**
1. **Switch Stripe to live mode** (30 min)
2. **Create Resend account + get API key** (20 min)
3. **Tell me what "polish" means** (list specific issues)
4. **Show me lead format** (CSV structure?)
5. **Draft SMS message** (or I can write it)

**Then I'll:**
- Deploy email system
- Fix polish items
- Prep lead campaign
- Set up monitoring
- Schedule SMS blast

**Ready to get #1 and #2 done now?**
