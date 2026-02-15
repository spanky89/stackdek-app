# CSV Import/Export Test Plan

## Test Environment Setup

1. Ensure you're logged into StackDek
2. Navigate to Settings → Business Information
3. Scroll to the bottom to find "Customer Data Management" section
4. Have sample CSV files ready for testing

## Test Cases

### CSV Import Tests

#### TC-01: Valid CSV Import
**Objective**: Verify successful import of valid customer data

**Steps**:
1. Download the template by clicking "Download Template"
2. Open the template and verify it has the correct headers
3. Add 3-5 sample customers with complete data
4. Upload the CSV file
5. Wait for processing to complete

**Expected Results**:
- ✅ File uploads successfully
- ✅ Message shows "CSV parsed. Validating data..."
- ✅ Message shows "Import complete! X client(s) imported successfully"
- ✅ Import summary displays with correct counts
- ✅ Success count matches number of rows
- ✅ No errors listed

**Verification**:
- Navigate to Clients list
- Verify new clients appear with correct data

---

#### TC-02: Import with Missing Required Field (Name)
**Objective**: Verify validation catches missing required fields

**Test CSV**:
```csv
name,email,phone,address,vip
,test@example.com,(555) 123-4567,"123 Main St",false
John Doe,john@example.com,(555) 987-6543,"456 Oak Ave",true
```

**Expected Results**:
- ✅ Import completes
- ✅ Row 2 fails validation with error: "Row 2: Name is required"
- ✅ Row 3 imports successfully
- ✅ Import summary shows: Success: 1, Failed: 1

---

#### TC-03: Import with Invalid Email
**Objective**: Verify email validation

**Test CSV**:
```csv
name,email,phone,address,vip
John Doe,invalid-email,(555) 123-4567,"123 Main St",false
Jane Smith,jane@example.com,(555) 987-6543,"456 Oak Ave",true
```

**Expected Results**:
- ✅ Row 2 fails with error: "Row 2: Invalid email format"
- ✅ Row 3 imports successfully
- ✅ Import summary shows: Success: 1, Failed: 1

---

#### TC-04: Import with Duplicate Email
**Objective**: Verify duplicate detection

**Prerequisites**: Import a client with email "duplicate@example.com"

**Test CSV**:
```csv
name,email,phone,address,vip
New Client,duplicate@example.com,(555) 123-4567,"123 Main St",false
Different Client,unique@example.com,(555) 987-6543,"456 Oak Ave",true
```

**Expected Results**:
- ✅ First row skipped (duplicate email)
- ✅ Second row imports successfully
- ✅ Message shows "X client(s) imported successfully, X duplicate(s) skipped"

---

#### TC-05: Import with VIP Field Variations
**Objective**: Verify VIP field accepts multiple formats

**Test CSV**:
```csv
name,email,phone,address,vip
Client 1,client1@example.com,(555) 111-1111,"123 Main St",true
Client 2,client2@example.com,(555) 222-2222,"456 Oak Ave",false
Client 3,client3@example.com,(555) 333-3333,"789 Pine Rd",yes
Client 4,client4@example.com,(555) 444-4444,"321 Elm St",no
Client 5,client5@example.com,(555) 555-5555,"654 Maple Dr",1
Client 6,client6@example.com,(555) 666-6666,"987 Cedar Ln",0
```

**Expected Results**:
- ✅ All 6 rows import successfully
- ✅ VIP values correctly interpreted as boolean
- ✅ Clients 1, 3, 5 marked as VIP (true/yes/1)
- ✅ Clients 2, 4, 6 marked as non-VIP (false/no/0)

---

#### TC-06: Import with Invalid VIP Value
**Objective**: Verify VIP validation

**Test CSV**:
```csv
name,email,phone,address,vip
John Doe,john@example.com,(555) 123-4567,"123 Main St",maybe
```

**Expected Results**:
- ✅ Row fails with error: "Row 2: VIP must be true/false, yes/no, or 1/0"
- ✅ Import summary shows: Success: 0, Failed: 1

---

#### TC-07: Import with Addresses Containing Commas
**Objective**: Verify CSV parsing handles quoted fields

**Test CSV**:
```csv
name,email,phone,address,vip
John Doe,john@example.com,(555) 123-4567,"123 Main St, New York, NY 10001",false
```

**Expected Results**:
- ✅ Row imports successfully
- ✅ Full address preserved including commas
- ✅ Client created with complete address

---

#### TC-08: Import with Optional Fields Missing
**Objective**: Verify optional fields can be empty

**Test CSV**:
```csv
name,email,phone,address,vip
John Doe,,,,
Jane Smith,jane@example.com,,,
Bob Johnson,,,(555) 123-4567,
```

**Expected Results**:
- ✅ All 3 rows import successfully
- ✅ Only name is required; other fields stored as null

---

#### TC-09: Import Empty CSV
**Objective**: Verify error handling for empty file

**Test CSV**:
```csv
name,email,phone,address,vip
```

**Expected Results**:
- ✅ Error message: "No valid rows found in CSV"
- ✅ Import summary shows: Success: 0, Failed: 0

---

#### TC-10: Import Large File
**Objective**: Verify handling of large CSV files

**Test Data**: Create CSV with 100+ rows

**Expected Results**:
- ✅ File processes successfully (under 5MB limit)
- ✅ All valid rows imported
- ✅ Import summary shows correct count

---

#### TC-11: Import File Too Large
**Objective**: Verify file size validation

**Test Data**: Create CSV file larger than 5MB

**Expected Results**:
- ✅ Error message: "File too large. Maximum size is 5MB"
- ✅ No processing occurs

---

#### TC-12: Import Non-CSV File
**Objective**: Verify file type validation

**Steps**:
1. Try to upload a .txt or .xlsx file

**Expected Results**:
- ✅ Error message: "Please upload a CSV file"
- ✅ No processing occurs

---

### CSV Export Tests

#### TC-20: Export Clients
**Objective**: Verify successful export of all clients

**Prerequisites**: Have at least 3 clients in the system

**Steps**:
1. Click "Clients" button in Export section
2. Wait for download to complete
3. Open downloaded file

**Expected Results**:
- ✅ File downloads as `clients_YYYY-MM-DD.csv`
- ✅ File contains headers: name, email, phone, address, vip, created_at
- ✅ All clients listed with correct data
- ✅ Success message appears

---

#### TC-21: Export Jobs
**Objective**: Verify successful export of all jobs

**Prerequisites**: Have at least 2 jobs in the system

**Steps**:
1. Click "Jobs" button
2. Open downloaded file

**Expected Results**:
- ✅ File downloads as `jobs_YYYY-MM-DD.csv`
- ✅ File contains job data with client information
- ✅ All jobs listed correctly

---

#### TC-22: Export Quotes
**Objective**: Verify successful export of all quotes

**Prerequisites**: Have at least 2 quotes in the system

**Steps**:
1. Click "Quotes" button
2. Open downloaded file

**Expected Results**:
- ✅ File downloads as `quotes_YYYY-MM-DD.csv`
- ✅ File contains quote data with client information
- ✅ All quotes listed correctly

---

#### TC-23: Export Invoices
**Objective**: Verify successful export of all invoices

**Prerequisites**: Have at least 2 invoices in the system

**Steps**:
1. Click "Invoices" button
2. Open downloaded file

**Expected Results**:
- ✅ File downloads as `invoices_YYYY-MM-DD.csv`
- ✅ File contains invoice data with client information
- ✅ All invoices listed correctly

---

#### TC-24: Export with No Data
**Objective**: Verify handling when no data exists

**Prerequisites**: Empty database (or test with new account)

**Steps**:
1. Click "Clients" button

**Expected Results**:
- ✅ Warning message: "No clients to export"
- ✅ No file downloads

---

#### TC-25: Export Multiple Times
**Objective**: Verify consistent export behavior

**Steps**:
1. Export clients
2. Add a new client
3. Export clients again
4. Compare both files

**Expected Results**:
- ✅ Both exports successful
- ✅ Different timestamps in filenames
- ✅ Second file contains new client
- ✅ Previous client data unchanged

---

### UI/UX Tests

#### TC-30: Template Download
**Objective**: Verify template download functionality

**Steps**:
1. Click "Download Template" link

**Expected Results**:
- ✅ File downloads as `clients_template.csv`
- ✅ Contains sample data with correct format
- ✅ Success message appears

---

#### TC-31: Loading States
**Objective**: Verify proper loading indicators

**Steps**:
1. Start importing a CSV file
2. Observe UI during processing

**Expected Results**:
- ✅ Loading spinner appears
- ✅ "Processing..." text displayed
- ✅ Upload button disabled during import
- ✅ Export buttons disabled during export

---

#### TC-32: Error Display
**Objective**: Verify error messages are clear and actionable

**Steps**:
1. Import a CSV with multiple errors

**Expected Results**:
- ✅ Error summary clearly displayed
- ✅ Each error listed with row number
- ✅ Errors are scrollable if many
- ✅ Errors persist until next import

---

#### TC-33: Success Messages
**Objective**: Verify success feedback

**Steps**:
1. Successfully import clients
2. Successfully export data

**Expected Results**:
- ✅ Green checkmark or success icon
- ✅ Clear success message with count
- ✅ Message auto-clears after action

---

### Security Tests

#### TC-40: Company Isolation
**Objective**: Verify users can only import to their own company

**Prerequisites**: Two different user accounts

**Steps**:
1. Log in as User A
2. Import clients
3. Log in as User B
4. Check client list

**Expected Results**:
- ✅ User B cannot see User A's clients
- ✅ Each company's data is isolated

---

#### TC-41: Authentication Required
**Objective**: Verify authentication is enforced

**Steps**:
1. Log out
2. Try to access Settings page

**Expected Results**:
- ✅ Redirected to login page
- ✅ Cannot access import/export without authentication

---

### Performance Tests

#### TC-50: Import Speed
**Objective**: Measure import performance

**Test Data**: CSV with 50, 100, 500 rows

**Expected Results**:
- ✅ 50 rows: < 5 seconds
- ✅ 100 rows: < 10 seconds
- ✅ 500 rows: < 30 seconds

---

#### TC-51: Export Speed
**Objective**: Measure export performance

**Prerequisites**: Database with 100+ clients

**Expected Results**:
- ✅ Export completes in < 5 seconds
- ✅ File downloads immediately after processing

---

## Regression Tests

Run these tests after any code changes:

1. Basic import (TC-01)
2. Basic export (TC-20)
3. Validation (TC-02, TC-03)
4. Duplicate detection (TC-04)
5. Company isolation (TC-40)

## Browser Compatibility

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Mobile Chrome (Android)

## Test Data Files

Create these test files for consistent testing:

1. **valid_clients.csv** - 5 valid clients
2. **invalid_emails.csv** - Mix of valid/invalid emails
3. **missing_names.csv** - Some rows without names
4. **large_file.csv** - 100+ rows
5. **special_chars.csv** - Names/addresses with special characters
6. **duplicate_emails.csv** - Contains duplicate emails

## Sign-Off Criteria

Feature is ready for production when:
- ✅ All critical test cases pass (TC-01 to TC-12, TC-20 to TC-24)
- ✅ No blocking bugs
- ✅ Performance meets expectations (TC-50, TC-51)
- ✅ Security tests pass (TC-40, TC-41)
- ✅ Works on all major browsers
- ✅ Documentation complete (CSV_IMPORT_EXPORT_GUIDE.md)
- ✅ Sample files available for users

## Known Issues / Limitations

Document any known issues here:
- Maximum file size: 5MB
- CSV format only (no Excel support yet)
- Import for clients only (jobs/quotes/invoices export-only)

## Future Test Cases

For future enhancements:
- Import jobs from CSV
- Import quotes from CSV
- Import invoices from CSV
- Excel file support
- Automated scheduled exports
- Import with custom field mapping
