# Products & Services Import/Export Feature

**Built:** March 2, 2026 (11:38 AM - 12:15 PM EST)  
**Status:** ✅ Complete & Deployed  
**Location:** Settings → Services & Products → Import/Export Data

---

## What Was Built

### New Page Section: "Customer Data Management"
Added to Settings page with 2 main sections:
1. **Products & Services** - Import/export functionality for services and products
2. **Customer Data** - Existing client import/export tools (already built)

### Features

**Services Import:**
- Upload CSV file with services (name, price, description)
- Validates data (name required, price must be valid number)
- Shows import summary (success/failed/errors)
- Skips invalid rows with detailed error messages
- Template download button

**Products Import:**
- Upload CSV file with products (name, price, description)
- Same validation as services
- Import summary and error reporting
- Template download button

**Export:**
- Export services to CSV (includes name, price, description, created_at)
- Export products to CSV (same fields)
- Timestamped filenames (e.g., `services_2026-03-02.csv`)
- One-click download

### Files Created
- `src/components/ProductsServicesImportExport.tsx` (349 lines)

### Files Modified
- `src/pages/Settings.tsx` - Added imports, view type, menu item, and view section

---

## How to Use

### Import Services
1. Go to Settings → Services & Products → Import/Export Data
2. Click "Download Template" under "Import Services"
3. Fill in your services data:
   ```csv
   name,price,description
   Lawn Mowing,50.00,Standard residential lawn
   Tree Trimming,150.00,Up to 20 feet
   Mulching,75.00,Per cubic yard
   ```
4. Upload the CSV file
5. Review import summary (success/failed/errors)

### Import Products
1. Same process as services
2. Template format:
   ```csv
   name,price,description
   Fertilizer Bag,25.00,50 lb bag
   Weed Killer,15.00,1 gallon
   Garden Soil,8.00,40 lb bag
   ```

### Export Data
1. Click "Export Services" or "Export Products"
2. File downloads automatically with timestamp
3. Open in Excel/Google Sheets for analysis

---

## CSV Format

### Required Fields
- **name** - Service/product name (required, must not be empty)
- **price** - Numeric value (required, must be ≥ 0)

### Optional Fields
- **description** - Text description of service/product

### Example CSV
```csv
name,price,description
Lawn Mowing,50.00,Standard residential lawn
Tree Trimming,150.00,Up to 20 feet tall
Mulching,75.00,Per cubic yard
Hedge Trimming,60.00,
Fertilization,45.00,Quarterly application
```

### Validation Rules
1. Name cannot be empty
2. Price must be a valid number (no $ symbols)
3. Price must be 0 or positive
4. Description is optional (can be blank)
5. Empty rows are skipped
6. Invalid rows show specific error messages

---

## Error Handling

### Import Errors
The system shows detailed errors:
- **"Row 3: Missing name"** - Name field is empty
- **"Row 5: Invalid price '$50.00'"** - Price has non-numeric characters
- **"Row 7: Invalid price '-10'"** - Negative price

### Import Summary
After upload, you see:
- Total rows processed
- Successfully imported count
- Failed count
- List of all errors with row numbers

### Edge Cases Handled
- Empty CSV file
- Missing headers
- Extra columns (ignored)
- Duplicate entries (both imported)
- File size limit (5 MB max)
- Invalid file type (must be .csv)

---

## Technical Details

### Database Tables
- **services** table (company_id, name, price, description)
- **products** table (company_id, name, price, description)

### Component Structure
```
ProductsServicesImportExport.tsx
├─ Import Services (file upload + validation)
├─ Import Products (file upload + validation)
├─ Export Section (both buttons)
└─ Info/Tips section
```

### Functions
- `parseCSV()` - Parses CSV text into objects
- `handleImportServices()` - Validates and imports services
- `handleImportProducts()` - Validates and imports products
- `exportServices()` - Fetches and downloads services CSV
- `exportProducts()` - Fetches and downloads products CSV
- `downloadServicesTemplate()` - Downloads example CSV
- `downloadProductsTemplate()` - Downloads example CSV

### State Management
- `importing` - Loading state during import
- `exporting` - Loading state during export
- `message` - User feedback messages
- `importStats` - Summary of last import (total/success/failed/errors)

---

## Integration with Existing Features

### Connected to Settings Page
- Added to existing Settings navigation
- Uses same styling/layout as other settings sections
- Consistent with existing CSV import/export for clients

### Reuses Existing Utils
- Uses `convertToCSV()` from `csvHelpers.ts`
- Uses `downloadCSV()` from `csvHelpers.ts`
- Consistent with client CSV functionality

### Supabase Integration
- Queries `services` table filtered by `company_id`
- Queries `products` table filtered by `company_id`
- Uses RLS policies (users can only access their own company data)

---

## Benefits for Contractors

### Time Savings
- Bulk import 50+ services/products in seconds vs manual entry
- Export for backup or analysis
- Reuse service lists across seasons

### Use Cases
1. **New User Onboarding** - Import complete service catalog from spreadsheet
2. **Seasonal Updates** - Export, update prices, re-import
3. **Data Backup** - Regular exports for record-keeping
4. **Pricing Analysis** - Export to Excel, analyze pricing trends
5. **Multi-Location** - Copy services between company accounts

---

## Testing Checklist

- [x] Build succeeds without errors
- [x] Component renders correctly
- [x] Services import validates name/price
- [x] Products import validates name/price
- [x] Export downloads files with correct format
- [x] Templates download correctly
- [x] Error messages display for invalid data
- [x] Import summary shows accurate counts
- [x] Files with missing headers show clear error
- [x] Empty CSV shows "no valid rows" message

---

## Next Steps (Future Enhancements)

**Potential improvements (not required for launch):**
1. **Edit imported items** - Allow inline editing after import
2. **Bulk delete** - Select multiple services/products to delete
3. **Import from other formats** - Support Excel, JSON
4. **Duplicate detection** - Skip services/products with same name
5. **Price history** - Track price changes over time
6. **Categories** - Group services (lawn, tree, hardscape, etc.)
7. **Templates library** - Pre-built service lists by trade

---

## Deployment Status

**Current Status:** ✅ Ready for Production

**Build:** Successful (3.23s)  
**Bundle Size:** 1.1 MB (warning is cosmetic, not a blocker)  
**Browser Compatibility:** Modern browsers (Chrome, Firefox, Safari, Edge)  
**Mobile:** Fully responsive

**Deployed At:** https://stackdek-app.vercel.app  
**Access:** Settings → Services & Products → Import/Export Data

---

## Support

**Common Issues:**

1. **"CSV must include 'name' and 'price' columns"**
   - Make sure first row has headers: `name,price,description`
   - Headers must be lowercase
   - No extra spaces

2. **"Invalid price"**
   - Remove $ symbols
   - Use numbers only (e.g., 50.00, not $50.00)
   - Decimal point is optional (50 or 50.00 both work)

3. **"No services/products to export"**
   - Add at least one service/product first
   - Make sure you're logged into correct account

**Contact:** If issues persist, check browser console for errors or contact support.

---

**Feature Complete ✅**  
Ready for contractors to bulk manage their service catalogs!
