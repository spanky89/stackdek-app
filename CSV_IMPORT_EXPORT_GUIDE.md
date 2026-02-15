# CSV Import/Export Guide

## Overview

The CSV Import/Export feature allows you to bulk import customer data and export all your StackDek data (clients, jobs, quotes, invoices) to CSV files for backup, analysis, or migration purposes.

## Location

The CSV Import/Export functionality is located in:
- **Settings** → **Business Information** → Scroll to bottom section: **Customer Data Management**

## Features

### 📥 Import Customers

Bulk import customer data from a CSV file.

#### CSV Format

Your CSV file must include the following headers:

```csv
name,email,phone,address,vip
```

#### Field Requirements

| Field   | Required | Type    | Description                                |
|---------|----------|---------|-------------------------------------------|
| name    | **Yes**  | Text    | Customer name                             |
| email   | No       | Text    | Valid email address                       |
| phone   | No       | Text    | Phone number (any format)                 |
| address | No       | Text    | Full address (can include commas)         |
| vip     | No       | Boolean | true/false, yes/no, or 1/0                |

#### Sample CSV

```csv
name,email,phone,address,vip
John Doe,john@example.com,(555) 123-4567,"123 Main St, New York, NY 10001",false
Jane Smith,jane@example.com,(555) 987-6543,"456 Oak Ave, Brooklyn, NY 11201",true
```

#### Import Process

1. Click **"Download Template"** to get a sample CSV file
2. Fill in your customer data following the template format
3. Click **"Choose File"** and select your CSV file
4. The system will:
   - Parse and validate the CSV
   - Check for duplicate email addresses
   - Import valid rows into your clients database
   - Display an import summary with success/error counts

#### Validation Rules

- **Name is required**: Every row must have a name
- **Email validation**: If provided, must be a valid email format
- **Duplicate detection**: Customers with existing email addresses will be skipped
- **VIP field**: Accepts multiple formats (true/false, yes/no, 1/0)
- **Max file size**: 5 MB

#### Error Handling

The import process will:
- Skip empty lines
- Report validation errors by row number
- Continue importing valid rows even if some rows fail
- Display detailed error messages for troubleshooting

### 📤 Export Data

Export your data to CSV files for backup or analysis.

#### Available Exports

1. **Clients** - Export all customer data
   - Fields: name, email, phone, address, vip, created_at

2. **Jobs** - Export all jobs with client information
   - Fields: title, description, status, date_scheduled, time_scheduled, estimate_amount, location, client_name, client_email, created_at

3. **Quotes** - Export all quotes with client information
   - Fields: title, amount, status, expiration_date, client_name, client_email, created_at

4. **Invoices** - Export all invoices with client information
   - Fields: amount, status, due_date, paid_date, client_name, client_email, created_at

#### Export Process

1. Click the button for the data type you want to export (Clients, Jobs, Quotes, or Invoices)
2. The system will:
   - Query all records for your company
   - Format the data as CSV
   - Automatically download the file with a timestamp (e.g., `clients_2026-02-14.csv`)

#### File Naming

Exported files are automatically named with timestamps:
- `clients_YYYY-MM-DD.csv`
- `jobs_YYYY-MM-DD.csv`
- `quotes_YYYY-MM-DD.csv`
- `invoices_YYYY-MM-DD.csv`

## Technical Details

### Architecture

#### Components

- **`CSVImportExport.tsx`** - Main React component for UI and orchestration
- **`csvHelpers.ts`** - Utility functions for parsing, validation, and conversion

#### Key Functions

##### CSV Parsing
```typescript
parseCSV(csvText: string): CSVImportResult
```
- Parses CSV text into an array of row objects
- Handles quoted values with commas
- Returns validation errors

##### Data Validation
```typescript
validateClientCSV(data: CSVRow[]): { valid: ClientCSVRow[]; errors: string[] }
```
- Validates each row against client schema
- Checks required fields, email format, VIP values
- Returns valid rows and error messages

##### CSV Export
```typescript
convertToCSV(data: any[], headers: string[]): string
```
- Converts array of objects to CSV format
- Handles special characters and escaping
- Preserves data integrity

##### File Download
```typescript
downloadCSV(filename: string, csvContent: string)
```
- Creates a Blob and triggers browser download
- Sets appropriate MIME type for CSV

### Database Integration

#### Import Flow

1. Parse CSV file
2. Validate data format and required fields
3. Check for duplicate emails in database:
   ```sql
   SELECT email FROM clients 
   WHERE company_id = ? AND email IN (?)
   ```
4. Filter out duplicates
5. Bulk insert valid records:
   ```sql
   INSERT INTO clients (company_id, name, email, phone, address, vip)
   VALUES (...)
   ```

#### Export Flow

1. Query data with related records:
   ```sql
   SELECT jobs.*, clients.name, clients.email
   FROM jobs
   LEFT JOIN clients ON jobs.client_id = clients.id
   WHERE jobs.company_id = ?
   ```
2. Flatten nested objects
3. Convert to CSV format
4. Trigger download

### Security

- **Row Level Security (RLS)**: All database queries respect RLS policies
- **Company Isolation**: Users can only import/export data for their own company
- **Input Validation**: All CSV data is validated before insertion
- **File Size Limits**: Maximum 5 MB to prevent abuse
- **SQL Injection Protection**: Uses parameterized queries via Supabase client

## Best Practices

### For Import

1. **Always download the template first** - Ensures correct format
2. **Test with a small file** - Import 5-10 records first to verify format
3. **Clean your data** - Remove empty rows, fix email formats
4. **Use UTF-8 encoding** - Prevents character encoding issues
5. **Check for duplicates** - Review your data for duplicate emails beforehand

### For Export

1. **Export regularly** - Create backups of your data
2. **Use timestamps** - Keep track of when exports were created
3. **Store securely** - Exported files contain sensitive customer data
4. **Version control** - Keep historical exports for audit trails

## Troubleshooting

### Common Import Issues

**"Name is required"**
- Ensure every row has a value in the name column
- Check for empty rows at the end of your file

**"Invalid email format"**
- Verify email addresses follow the format: user@domain.com
- Remove any extra spaces

**"Column count mismatch"**
- Ensure all rows have the same number of columns as the header
- Check for missing commas in your CSV

**"Duplicate email addresses"**
- The system automatically skips customers with existing emails
- Review the import summary for skipped records

**"File too large"**
- Maximum file size is 5 MB
- Split large imports into multiple smaller files

### Common Export Issues

**"No data to export"**
- Verify you have records in the selected category
- Check that you're logged in and have access to the data

**"Export failed"**
- Check your internet connection
- Refresh the page and try again
- Contact support if issue persists

## Support

For technical issues or questions:
1. Check this guide for common solutions
2. Review the import summary for specific error messages
3. Test with the provided sample CSV template
4. Contact StackDek support with error details

## Sample Files

A sample CSV file (`sample-clients.csv`) is included in the project root with example data you can use for testing.

## Future Enhancements

Potential future improvements:
- Import jobs, quotes, and invoices (currently export-only)
- Excel (.xlsx) file support
- Automatic data mapping/transformation
- Scheduled exports
- Import history and rollback
- Custom field mapping
