# StackDek Invoice Flow - Deployment Steps

## Step 1: Apply Database Migration

**IMPORTANT:** Run this migration in Supabase SQL Editor BEFORE deploying to Vercel.

### Instructions:
1. Go to https://duhmbhxlmvczrztccmus.supabase.co
2. Navigate to SQL Editor (left sidebar)
3. Click "New Query"
4. Copy and paste the following SQL:

```sql
-- Add tax_rate and notes to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN invoices.tax_rate IS 'Tax percentage applied to the invoice (e.g., 8.5 for 8.5%)';
COMMENT ON COLUMN invoices.notes IS 'Optional notes or memo text for the invoice';
```

5. Click "Run" or press Ctrl+Enter
6. Verify success message appears
7. Check columns were added:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'invoices' 
   AND column_name IN ('tax_rate', 'notes');
   ```

## Step 2: Build and Deploy to Vercel

### Build Locally First (Optional - for verification)
```bash
cd C:\Users\x\.openclaw\workspace\stackdek-app
npm run build
```

### Deploy to Vercel
```bash
# If vercel CLI not installed:
npm install -g vercel

# Login (if needed)
vercel login

# Deploy to production
vercel --prod
```

### Alternative: Deploy via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "Import Project"
3. Select the `stackdek-app` repository
4. Click "Deploy"
5. Wait for build to complete

## Step 3: Verify Deployment

### Test Checklist (on Production):
1. ✅ Can create a quote with line items
2. ✅ Can pay deposit via Stripe checkout
3. ✅ Job auto-creates after deposit payment
4. ✅ Can mark job complete with invoice generation
5. ✅ Invoice modal pre-fills from quote
6. ✅ Can edit line items, add tax, notes, due date
7. ✅ Invoice saves with status "awaiting_payment"
8. ✅ Invoice appears in list with correct filters
9. ✅ Can view invoice detail page
10. ✅ Can mark invoice as paid
11. ✅ Status updates to "paid" with paid date

## Step 4: Post-Deployment Verification

### Database Check:
```sql
-- Verify invoices have new columns
SELECT id, invoice_number, status, total_amount, tax_rate, notes 
FROM invoices 
ORDER BY created_at DESC 
LIMIT 5;
```

### Frontend Check:
- Visit deployed URL (e.g., https://stackdek-app.vercel.app)
- Test complete end-to-end flow
- Check browser console for any errors
- Verify all navigation links work

## Rollback Plan (if needed)

### If issues occur:
1. Roll back Vercel deployment to previous version
2. Database migration is safe (only adds columns with defaults)
3. Check error logs in Vercel dashboard
4. Review browser console errors

### Remove migration (if absolutely necessary):
```sql
ALTER TABLE invoices DROP COLUMN IF EXISTS tax_rate;
ALTER TABLE invoices DROP COLUMN IF EXISTS notes;
```

## Environment Variables

Verify these are set in Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY` (if using Stripe)

## Success Indicators

✅ Build completes without errors
✅ No TypeScript errors
✅ All pages load correctly
✅ Invoice generation flow works end-to-end
✅ Database queries execute without errors
✅ Navigation works correctly

## Support

If deployment issues occur:
1. Check Vercel build logs
2. Check Supabase database logs
3. Review browser console for client-side errors
4. Verify environment variables are set correctly
