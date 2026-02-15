# CSV Import/Export - Quick Start Guide

## 📍 Location
**Settings** → **Business Information** → Scroll to bottom → **Customer Data Management**

---

## 📥 Import Customers (3 Steps)

### Step 1: Get the Template
Click **"Download Template"** to get a sample CSV file with the correct format.

### Step 2: Add Your Data
Open the template and add your customer information:

```csv
name,email,phone,address,vip
John Doe,john@example.com,(555) 123-4567,"123 Main St, New York, NY",false
Jane Smith,jane@example.com,(555) 987-6543,"456 Oak Ave, Brooklyn, NY",true
```

**Required:**
- `name` - Customer name (required)

**Optional:**
- `email` - Email address
- `phone` - Phone number
- `address` - Full address (can include commas)
- `vip` - true/false, yes/no, or 1/0

### Step 3: Upload
1. Click **"Choose File"**
2. Select your CSV file
3. Wait for processing
4. Review the import summary

✅ **Success!** Your customers are now in the system.

---

## 📤 Export Data (1 Click)

Click any button to download:
- **Clients** - All customer data
- **Jobs** - All jobs with customer info
- **Quotes** - All quotes with customer info
- **Invoices** - All invoices with customer info

Files download as `filename_YYYY-MM-DD.csv`

---

## 💡 Tips

### Import Tips
- ✅ Use the template - it has the correct format
- ✅ Name is required, everything else is optional
- ✅ Duplicate emails are automatically skipped
- ✅ VIP accepts: true/false, yes/no, or 1/0
- ✅ Max file size: 5 MB

### Common Issues
❌ **"Name is required"** → Make sure every row has a name
❌ **"Invalid email format"** → Check email addresses
❌ **"Column count mismatch"** → Ensure all rows have the same number of columns

### Export Tips
- 📅 Files include date stamps for easy organization
- 💾 Export regularly for backups
- 📊 Open in Excel, Google Sheets, or any CSV reader
- ♻️ Exported files can be re-imported

---

## 🎯 Quick Example

**Sample CSV:**
```csv
name,email,phone,address,vip
Alice Anderson,alice@example.com,(555) 111-2222,"10 Park Ave, NYC",true
Bob Brown,bob@example.com,(555) 333-4444,"20 Main St, Brooklyn",false
```

**Result:** 2 customers imported ✅

---

## 📚 Need More Help?

- **Full Guide**: See `CSV_IMPORT_EXPORT_GUIDE.md`
- **Test Plan**: See `CSV_TEST_PLAN.md`
- **Sample File**: See `sample-clients.csv`

---

**Quick Start Time:** ~2 minutes to import your first customers! 🚀
