# StackDek Launch Checklist

**Target Launch Date:** Feb 23, 2026  
**Last Updated:** Feb 12, 2026, 2:02 PM EST  
**Status:** In Progress (Core Login Built ✅)

---

## 🔐 Authentication Pages

- [x] **Landing Page** (`/`) — Marketing site with features, social proof, CTAs
- [x] **Login Page** (`/login`) — Sign In / Sign Up tabs with email/password + Google/Apple OAuth
- [x] **OAuth Setup** — Google & Apple credentials configured in Supabase
- [ ] **Email Confirmation Flow** — Test signup confirmation email delivery

---

## 📊 Dashboard & Navigation

- [ ] **Home Dashboard** (`/home`) — Revenue goal, requests, upcoming jobs/quotes
- [ ] **Bottom Menu Bar** — Home/Jobs/Quotes/Clients/Invoices navigation (all pages)
- [ ] **Settings** (`/settings`) — Company details, logo upload, invoice settings
- [ ] **Account & Billing** (`/account`) — Subscription, payment method, invoices

---

## 👥 Client Management

- [ ] **Client List** (`/clients`) — Search, filter, CSV export
- [ ] **Client Detail** (`/client/:id`) — Full profile, edit, delete
- [ ] **Client Profile** (`/client/:id/profile`) — Avatar, VIP badge, tabs (Overview/History/Notes)
- [ ] **Create Client** (modal) — Name, email, phone, address, notes
- [ ] **Edit Client** (`/client/:id/edit`) — Update client info
- [ ] **Delete Client** — Confirmation + cascade delete

---

## 📋 Job Management

- [ ] **Job Stack** (`/jobs`) — Filter tabs (All/Scheduled/In Progress/Completed), status badges, client avatars
- [ ] **Job Detail** (`/job/:id`) — Full job info, "Mark Complete" button, invoice generation modal
- [ ] **Directions Button** — Opens Google Maps with job address ⭐ (NEXT)
- [ ] **Create Job** (modal) — Client, title, description, date, amount
- [ ] **Edit Job** (`/job/:id/edit`) — Update job info
- [ ] **Delete Job** — Confirmation

---

## 📝 Quote Management

- [ ] **Quote List** (`/quotes`) — Filter, search, CSV export
- [ ] **Quote Detail** (`/quote/:id`) — Full quote with line items, deposit amount, status badges
- [ ] **Create Quote** (modal) — Client, services (add/remove line items), tax calc, timeline, message
- [ ] **Edit Quote** (`/quote/:id/edit`) — Update line items, amounts, dates
- [ ] **Quote Public View** (`/quotes/view/:id`) — Client-facing shareable link with deposit payment button
- [ ] **Delete Quote** — Confirmation

---

## 💰 Invoice Management

- [ ] **Invoice List** (`/invoices`) — Filter (All/Awaiting/Paid), status badges, CSV export
- [ ] **Invoice Detail** (`/invoice/:id`) — Full invoice display, "Mark as Paid" button, line items, notes
- [ ] **Create Invoice** (modal) — Line items, tax rate, notes, due date (pre-fills from quote)
- [ ] **Mark as Paid** — Updates status & timestamp
- [ ] **Delete Invoice** — Confirmation

---

## 🎯 Request Management (NEW)

- [ ] **Request List** (`/requests`) — Filter (New/Pending/Contacted/Converted), stats bar
- [ ] **Request Detail** (`/request/:id`) — Full request info, action buttons
- [ ] **Create Request** (modal) — Client name, email, phone, service type, description, date
- [ ] **Database Migration** — Run `MIGRATION_requests_table_CLEAN.sql` in Supabase

---

## 💳 Stripe Connect Integration (NEW!)

**Migration:** `migrations/08_add_stripe_connect.sql`

### Database Changes
- [x] Add `stripe_connected_account_id` to companies table
- [x] Add `stripe_connect_status` field (disconnected/connected/pending)
- [x] Add `stripe_connected_at` timestamp field

### Payment Settings Page
- [x] Replace manual API key inputs with Stripe Connect UI
- [x] "Connect with Stripe" button (Stripe brand colors #635BFF)
- [x] Status indicator (connected/disconnected with visual feedback)
- [x] Disconnect button (with confirmation)
- [x] Display connected account ID
- [x] OAuth success/error message handling

### API Endpoints
- [x] `/api/stripe/connect-oauth.ts` — Initiates OAuth flow, redirects to Stripe
- [x] `/api/stripe/connect-callback.ts` — Handles OAuth callback, stores account ID
- [x] `/api/stripe/disconnect.ts` — Revokes access and clears account ID

### Quote Detail Page
- [x] Check Stripe connection status on load
- [x] Show deposit payment button ONLY if Stripe connected
- [x] Display "Connect Stripe Account" warning if not connected
- [x] Update payment button styling (Stripe branding)

### Environment Variables Needed
```bash
# Add to Vercel Environment Variables:
STRIPE_CONNECT_CLIENT_ID=ca_xxx        # From Stripe Dashboard > Connect > Settings
STRIPE_CONNECT_CLIENT_SECRET=sk_xxx    # From Stripe Dashboard > API Keys
VITE_APP_URL=https://app.stackdek.com  # Your production URL
```

### Stripe Dashboard Setup (Before Launch)
- [ ] **Enable Stripe Connect** — Dashboard > Connect > Get Started
- [ ] **Register Platform** — Set redirect URI: `https://app.stackdek.com/api/stripe/connect-callback`
- [ ] **Copy Client ID** — Will appear after approval (usually 1-2 business days)
- [ ] **Add Client ID to Vercel** — Environment variable `STRIPE_CONNECT_CLIENT_ID`
- [ ] **Test OAuth Flow** — Use placeholder client_id until real one appears
- [ ] **Webhook Setup** — Add webhook endpoint for payment confirmations (if needed)

### Testing Checklist
- [ ] Run migration: `08_add_stripe_connect.sql` on Supabase
- [ ] Click "Connect with Stripe" → redirects to Stripe OAuth
- [ ] Authorize app → redirects back with success message
- [ ] Verify account ID stored in database
- [ ] Check deposit payment button appears on quotes
- [ ] Test disconnect flow → button disappears
- [ ] Verify warning message when not connected

### Notes
- **OAuth Flow:** Users connect their own Stripe accounts (distributed model)
- **Payments:** Go directly to contractor's Stripe account (we never touch money)
- **Placeholder client_id:** Used until real one arrives from Stripe dashboard
- **Fallback:** Old API key method still works but won't be used once Connect is active

---

## 🧪 Testing Checklist

- [ ] Sign up flow end-to-end (email/password + OAuth)
- [ ] Sign in with existing account
- [ ] Create client → view profile → edit → delete
- [ ] Create job → view detail → mark complete
- [ ] Create quote → view detail → send to client
- [ ] Quote public link (client can view + pay deposit)
- [ ] Create invoice from completed job
- [ ] Mark invoice as paid
- [ ] Create request (if ready)
- [ ] CSV export on all list pages
- [ ] Mobile responsiveness (test on phone)
- [ ] Dark mode (if applicable)

---

## 📱 API Routes (Vercel Functions)

- [x] `/api/signup` — Form submission handler (landing page → signups table)
- [ ] `/api/create-checkout` — Stripe checkout session
- [ ] `/api/webhooks/stripe` — Webhook for payment confirmation
- [ ] `/api/auth/callback` — OAuth redirect handler (if needed)

---

## 🚀 Pre-Launch Tasks

- [ ] Google & Apple OAuth credentials in Supabase
- [ ] Supabase database migration (requests table)
- [ ] Stripe webhook URL configured in Supabase settings
- [ ] Email notifications setup (Resend or Supabase emails)
- [ ] SMS blasts to contractor leads ready (Google Voice)
- [ ] Landing page updated with sign-up data flow
- [ ] Favicon + branding assets in place
- [ ] 404 error page custom (optional)
- [ ] Loading states on all async operations

---

## 📊 Launch Day (Feb 23)

- [ ] SMS blast to contractor leads
- [ ] Email blast to sign-up list
- [ ] Schedule 10-20 demo calls
- [ ] Monitor app for errors (Vercel logs)
- [ ] Track sign-ups in real-time (Supabase dashboard)
- [ ] Get first 5-10 users onboarded

---

## Notes

- **Backup Strategy:** After each page is verified, commit + push to GitHub with tag `ready-launch-[page]`
- **Vercel Deployments:** Auto-deploy on every push to main branch
- **Supabase Backups:** Check Supabase dashboard for point-in-time recovery
- **Local Backups:** All work is in GitHub (C:\Users\x\.openclaw\workspace\stackdek-app)
