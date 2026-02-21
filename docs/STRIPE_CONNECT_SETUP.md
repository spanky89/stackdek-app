# Stripe Connect Integration Setup Guide

## Overview

StackDek uses **Stripe Connect** to enable contractors to accept deposit payments on quotes. This is a **distributed payment model** where each contractor connects their own Stripe account, and payments go directly to them (StackDek never touches the money).

---

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Client    │ ──────> │  StackDek   │ ──────> │   Stripe     │
│ (End User)  │  Views  │     App     │  OAuth  │   Connect    │
└─────────────┘  Quote  └─────────────┘  Flow   └──────────────┘
                              │
                              │  Stores
                              ▼
                    ┌──────────────────┐
                    │    Supabase      │
                    │ stripe_connected │
                    │   _account_id    │
                    └──────────────────┘
```

**Flow:**
1. Contractor clicks "Connect with Stripe" in Settings
2. Redirects to Stripe OAuth (user authorizes)
3. Stripe redirects back to `/api/stripe/connect-callback`
4. App stores `stripe_connected_account_id` in database
5. Quote deposit payment button now appears for this contractor

---

## Database Schema

### Migration: `migrations/08_add_stripe_connect.sql`

```sql
ALTER TABLE companies ADD COLUMN stripe_connected_account_id TEXT;
ALTER TABLE companies ADD COLUMN stripe_connect_status TEXT 
  CHECK (stripe_connect_status IN ('disconnected', 'connected', 'pending'));
ALTER TABLE companies ADD COLUMN stripe_connected_at TIMESTAMP;

CREATE INDEX idx_companies_stripe_connect 
  ON companies(stripe_connected_account_id) 
  WHERE stripe_connected_account_id IS NOT NULL;
```

---

## API Endpoints

### 1. **POST /api/stripe/connect-oauth**
Initiates the Stripe Connect OAuth flow.

**Request:**
```bash
POST /api/stripe/connect-oauth
Authorization: Bearer <supabase_jwt>
```

**Response:**
```json
{
  "url": "https://connect.stripe.com/oauth/authorize?response_type=code&client_id=ca_xxx&...",
  "message": "Redirect to this URL to connect Stripe account"
}
```

**Implementation:**
- Verifies user authentication
- Fetches company record
- Builds Stripe OAuth URL with state (company ID + user ID + timestamp)
- Returns URL for frontend to redirect to

---

### 2. **GET /api/stripe/connect-callback**
Handles the OAuth callback from Stripe after user authorizes.

**Query Params:**
- `code` - Authorization code from Stripe
- `state` - Encoded JSON with company/user IDs
- `error` - Error code (if user cancelled)

**Flow:**
1. Parse and validate `state` (prevent replay attacks)
2. Exchange `code` for access token via Stripe API
3. Store `stripe_user_id` in database as `stripe_connected_account_id`
4. Update `stripe_connect_status` to `'connected'`
5. Redirect to `/settings?stripe_connected=true`

---

### 3. **POST /api/stripe/disconnect**
Disconnects the Stripe account.

**Request:**
```bash
POST /api/stripe/disconnect
Authorization: Bearer <supabase_jwt>
```

**Response:**
```json
{
  "success": true,
  "message": "Stripe account disconnected successfully"
}
```

**Flow:**
1. Verify user authentication
2. Fetch company record with `stripe_connected_account_id`
3. Call `stripe.oauth.deauthorize()` (optional - best effort)
4. Clear `stripe_connected_account_id`, set status to `'disconnected'`

---

## Frontend Components

### Settings Page (`src/pages/Settings.tsx`)

**New State:**
```typescript
const [connectingStripe, setConnectingStripe] = useState(false)
const [disconnectingStripe, setDisconnectingStripe] = useState(false)
```

**Updated Company Interface:**
```typescript
interface Company {
  // ... existing fields
  stripe_connected_account_id?: string
  stripe_connect_status?: string
  stripe_connected_at?: string
}
```

**Connect Button:**
```tsx
<button onClick={handleStripeConnect} disabled={connectingStripe}
  className="px-5 py-2.5 bg-[#635BFF] text-white rounded-lg">
  Connect with Stripe
</button>
```

**Status Indicator:**
- Green dot + account ID if connected
- Gray dot + "Not Connected" if disconnected
- Shows connection timestamp

---

### Quote Detail Page (`src/pages/QuoteDetail.tsx`)

**New State:**
```typescript
const [stripeConnected, setStripeConnected] = useState(false)
const [checkingStripe, setCheckingStripe] = useState(true)
```

**Fetch Company with Stripe Status:**
```typescript
const { data: company } = await supabase
  .from('companies')
  .select('id, name, stripe_connected_account_id')
  .eq('owner_id', user.id)
  .single()

setStripeConnected(!!company.stripe_connected_account_id)
setCheckingStripe(false)
```

**Conditional Rendering:**
```tsx
{/* Show payment button ONLY if connected */}
{!quote.deposit_paid && depositAmount > 0 && stripeConnected && (
  <button onClick={handleStripePayment}>Pay with Stripe</button>
)}

{/* Show warning if NOT connected */}
{!stripeConnected && !checkingStripe && (
  <div className="bg-yellow-50 border border-yellow-200">
    <p>Stripe Account Not Connected</p>
    <button onClick={() => nav('/settings?view=payment')}>
      Connect Stripe Account
    </button>
  </div>
)}
```

---

## Environment Variables

### Required Variables

Add these to **Vercel Environment Variables** and `.env.local`:

```bash
# Stripe Connect OAuth
STRIPE_CONNECT_CLIENT_ID=ca_xxx              # Get from Stripe Dashboard after approval
STRIPE_CONNECT_CLIENT_SECRET=sk_test_xxx     # Platform secret key (NOT the contractor's key)

# App URL (for OAuth redirect)
VITE_APP_URL=https://app.stackdek.com        # Production URL
# or
VITE_APP_URL=http://localhost:5173           # Local development

# Existing Stripe vars (platform account)
STRIPE_SECRET_KEY=sk_test_xxx                # Platform Stripe secret key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx      # Platform publishable key

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx            # Server-side only
```

---

## Stripe Dashboard Setup

### 1. Enable Stripe Connect

1. Log in to Stripe Dashboard: https://dashboard.stripe.com
2. Navigate to **Connect** > **Get Started**
3. Select **Platform or Marketplace**
4. Fill out company information

### 2. Register OAuth Redirect URI

1. Go to **Connect** > **Settings**
2. Under **OAuth Settings**, add redirect URI:
   - Production: `https://app.stackdek.com/api/stripe/connect-callback`
   - Development: `http://localhost:5173/api/stripe/connect-callback`

### 3. Get Client ID

- After Stripe approves your Connect application (usually 1-2 business days), the `client_id` will appear in **Connect > Settings**
- Format: `ca_xxxxxxxxxxxx`
- Copy this and add to Vercel environment variables as `STRIPE_CONNECT_CLIENT_ID`

### 4. Test with Placeholder (Before Approval)

Until the real `client_id` appears, use placeholder:
```typescript
const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || 'ca_PLACEHOLDER'
```

The OAuth flow will build correctly, but you won't be able to test the actual authorization until Stripe approval.

---

## Testing

### Local Development

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to Settings:**
   - Go to `/settings`
   - Click "Payment Settings"

3. **Click "Connect with Stripe":**
   - Should redirect to Stripe OAuth page (or show error if placeholder)
   - Authorize with test account
   - Should redirect back to `/settings?stripe_connected=true`

4. **Verify database:**
   ```sql
   SELECT stripe_connected_account_id, stripe_connect_status, stripe_connected_at 
   FROM companies WHERE id = 'your-company-id';
   ```

5. **Create quote with deposit:**
   - Add a deposit amount
   - Verify "Pay with Stripe" button appears
   - Test disconnect → button should disappear

### Production Testing

1. Deploy to Vercel
2. Test OAuth flow end-to-end
3. Use Stripe test mode account initially
4. Verify payment flow (use test card `4242 4242 4242 4242`)

---

## Security Considerations

### State Parameter Validation

The OAuth `state` parameter prevents **CSRF attacks**:

```typescript
const state = JSON.stringify({
  companyId: company.id,
  userId: user.id,
  timestamp: Date.now()
})

// On callback:
const stateData = JSON.parse(state)
const maxAge = 10 * 60 * 1000 // 10 minutes
if (Date.now() - stateData.timestamp > maxAge) {
  return res.status(400).json({ error: 'State expired' })
}
```

### Token Storage

- **Never store** Stripe secret keys in frontend code
- API endpoints use `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- User JWT tokens are validated before any Stripe API calls

### Database Security

- RLS (Row Level Security) ensures users can only modify their own company
- `stripe_connected_account_id` is read-only from frontend perspective

---

## Troubleshooting

### "State expired" error
- User took >10 minutes to authorize
- **Fix:** Try connecting again

### "Invalid client_id" error
- Stripe hasn't approved Connect application yet
- **Fix:** Wait for approval email, then add real `client_id` to env vars

### Payment button not appearing
1. Check `stripe_connected_account_id` in database
2. Verify `checkingStripe` state is `false`
3. Check browser console for errors
4. Ensure deposit amount is > 0

### Disconnect doesn't work
- Check server logs for `stripe.oauth.deauthorize()` errors
- Even if Stripe API fails, database should still update
- **Manual fix:** Run SQL to clear account ID

---

## Future Enhancements

- [ ] **Automatic balance payouts** — Use Stripe Connect to manage payouts
- [ ] **Platform fees** — Take a percentage of each transaction
- [ ] **Subscription billing via Connect** — Monthly fees for contractors
- [ ] **Express Dashboard** — Embedded Stripe dashboard in StackDek UI
- [ ] **Multi-account switching** — Support contractors with multiple businesses

---

## References

- [Stripe Connect Docs](https://stripe.com/docs/connect)
- [OAuth for Connect](https://stripe.com/docs/connect/oauth-reference)
- [Standard Connect](https://stripe.com/docs/connect/standard-accounts)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** February 20, 2026  
**Author:** Milo (OpenClaw Agent)
