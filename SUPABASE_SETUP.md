# Supabase Setup - Database Migration

To complete the MVP fixes, you need to run a database migration in Supabase to create the services, products, and invoice line items tables.

## Quick Setup (2 minutes)

### 1. Open Supabase Dashboard
- Go to https://app.supabase.com
- Sign in to your account
- Select the "StackDek" project

### 2. Open SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "+ New Query"

### 3. Copy Migration SQL
1. Open the file: `MIGRATION_add_services_products_deposits.sql` in the repository root
2. Copy all the SQL code
3. Paste it into the Supabase SQL Editor

### 4. Run the Migration
- Click "RUN" button (or Ctrl+Enter)
- Wait for the migration to complete
- You should see: "Migration successful" or a success message

### 5. Verify Tables Were Created
In Supabase, go to "Table Editor" and confirm you see:
- ✅ `services` table
- ✅ `products` table  
- ✅ `invoice_line_items` table
- ✅ `quote_line_items` table

## What the Migration Does

The migration creates the following:

### New Tables
1. **services** - Store service offerings
   - id, company_id, name, description, price, created_at, updated_at

2. **products** - Store product offerings
   - id, company_id, name, description, price, created_at, updated_at

3. **invoice_line_items** - Line items for invoices
   - id, invoice_id, description, quantity, unit_price, sort_order, created_at

4. **quote_line_items** - Line items for quotes
   - id, quote_id, description, quantity, unit_price, sort_order, created_at

### Enhanced Columns
The migration also adds these columns to the `invoices` table:
- `invoice_number` - Human-readable invoice identifier
- `deposit_percentage` - Deposit percentage (default 25%)
- `total_amount` - Total invoice amount

### Security (RLS Policies)
Each table has Row Level Security (RLS) policies that ensure:
- Users can only see/edit their own company's data
- Services belong to a specific company
- Products belong to a specific company
- Invoice line items can only be accessed through authorized invoices

## Troubleshooting

### Migration Failed?
- Check if you're running the entire SQL script (scroll to the bottom)
- Ensure you're on the correct Supabase project
- Try running each section separately if there's an error

### Tables Exist Already?
- The migration uses `CREATE TABLE IF NOT EXISTS` so it won't break if tables exist
- If you get an error about RLS policies, that's OK - they may already be defined

### Still Having Issues?
Check that:
1. You're logged into Supabase
2. You're in the correct project
3. You have write permissions to the database
4. The SQL syntax is correct (no typos when copy/pasting)

## After Migration

Once the migration completes:
1. ✅ Services/Products in Settings will work
2. ✅ Invoice deposit percentage will save correctly
3. ✅ Invoice line items will be properly stored
4. ✅ All features from the MVP fixes are enabled

You're ready to use the app! 🎉

## Verifying It Worked

### Test Services/Products
1. Go to Settings → Manage Services
2. Click "Add Service"
3. Enter a service name and price
4. Click "Add Service"
5. You should see it appear in the list

### Test Invoice Deposit
1. Go to Invoices → Create Invoice
2. Scroll down - you should see "Deposit %" input field
3. Change the deposit % and see the deposit amount calculate
4. Create the invoice - it should save the deposit percentage

---

Need help? Check `MVP_FIXES_COMPLETED.md` for full feature documentation.
