// CSV Import/Export Utility Functions

export interface CSVRow {
  [key: string]: string | number | boolean | null;
}

export interface CSVImportResult {
  success: boolean;
  data?: CSVRow[];
  errors?: string[];
  rowCount?: number;
}

export interface ClientCSVRow {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  vip?: boolean;
}

/**
 * Parse CSV text into rows of objects
 */
export function parseCSV(csvText: string): CSVImportResult {
  const errors: string[] = [];
  
  try {
    const lines = csvText.trim().split('\n');
    
    if (lines.length === 0) {
      return { success: false, errors: ['CSV file is empty'] };
    }
    
    // Parse header row
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    if (headers.length === 0) {
      return { success: false, errors: ['No headers found in CSV'] };
    }
    
    // Parse data rows
    const data: CSVRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = parseCSVLine(line);
      
      if (values.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
        continue;
      }
      
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      data.push(row);
    }
    
    return {
      success: true,
      data,
      errors: errors.length > 0 ? errors : undefined,
      rowCount: data.length
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Parse a single CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

/**
 * Validate client data from CSV
 * Supports two formats:
 * 1. Simple: name, email, phone, address, vip
 * 2. Detailed: Display Name, Company Name, First Name, Last Name, Main Phone #s, E-mails, Service Street 1, Service City, Service State, Service Zip code
 */
export function validateClientCSV(data: CSVRow[]): { valid: ClientCSVRow[]; errors: string[] } {
  const valid: ClientCSVRow[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because index is 0-based and we skip header
    
    // Detect which format is being used
    const hasDetailedFormat = 
      ('display name' in row || 'first name' in row || 'last name' in row) ||
      ('main phone #s' in row) ||
      ('e-mails' in row) ||
      ('service street 1' in row);
    
    let clientName: string;
    let clientEmail: string | undefined;
    let clientPhone: string | undefined;
    let clientAddress: string | undefined;
    
    if (hasDetailedFormat) {
      // Detailed format - construct name from available fields
      const displayName = row['display name'] as string;
      const companyName = row['company name'] as string;
      const firstName = row['first name'] as string;
      const lastName = row['last name'] as string;
      
      // Priority: Display Name > First+Last > Company Name
      if (displayName && displayName.trim()) {
        clientName = displayName.trim();
      } else if (firstName && lastName) {
        clientName = `${firstName.trim()} ${lastName.trim()}`.trim();
      } else if (firstName) {
        clientName = firstName.trim();
      } else if (companyName && companyName.trim()) {
        clientName = companyName.trim();
      } else {
        errors.push(`Row ${rowNum}: No name found (need Display Name, First/Last Name, or Company Name)`);
        return;
      }
      
      // Map phone field
      clientPhone = (row['main phone #s'] || row['phone']) as string | undefined;
      
      // Map email field
      clientEmail = (row['e-mails'] || row['email']) as string | undefined;
      
      // Construct address from street, city, state, zip
      const street = (row['service street 1'] || '') as string;
      const city = (row['service city'] || '') as string;
      const state = (row['service state'] || '') as string;
      const zip = (row['service zip code'] || '') as string;
      
      const addressParts = [street, city, state, zip].filter(p => p && p.trim());
      clientAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;
      
    } else {
      // Simple format - use name, email, phone, address directly
      if (!row.name || typeof row.name !== 'string' || !row.name.trim()) {
        errors.push(`Row ${rowNum}: Name is required`);
        return;
      }
      
      clientName = String(row.name).trim();
      clientEmail = row.email ? String(row.email).trim() : undefined;
      clientPhone = row.phone ? String(row.phone).trim() : undefined;
      clientAddress = row.address ? String(row.address).trim() : undefined;
    }
    
    // Email validation (if provided)
    if (clientEmail && clientEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(clientEmail.trim())) {
        errors.push(`Row ${rowNum}: Invalid email format: ${clientEmail}`);
        return;
      }
    }
    
    // VIP validation (if provided)
    let vipValue: boolean | undefined = undefined;
    if (row.vip !== undefined && row.vip !== null && row.vip !== '') {
      const vipStr = String(row.vip).toLowerCase().trim();
      if (vipStr === 'true' || vipStr === '1' || vipStr === 'yes') {
        vipValue = true;
      } else if (vipStr === 'false' || vipStr === '0' || vipStr === 'no') {
        vipValue = false;
      } else {
        errors.push(`Row ${rowNum}: VIP must be true/false, yes/no, or 1/0`);
        return;
      }
    }
    
    valid.push({
      name: clientName,
      email: clientEmail,
      phone: clientPhone,
      address: clientAddress,
      vip: vipValue
    });
  });
  
  return { valid, errors };
}

/**
 * Convert data array to CSV format
 */
export function convertToCSV(data: any[], headers: string[]): string {
  if (data.length === 0) return headers.join(',');
  
  const csvRows: string[] = [];
  
  // Add header row
  csvRows.push(headers.join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      
      // Handle null/undefined
      if (value === null || value === undefined) return '';
      
      // Convert to string
      let strValue = String(value);
      
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        strValue = '"' + strValue.replace(/"/g, '""') + '"';
      }
      
      return strValue;
    });
    
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Get sample CSV template for clients
 * Returns detailed format matching Google Sheets structure
 */
export function getClientCSVTemplate(): string {
  return 'Display Name,Company Name,First Name,Last Name,Main Phone #s,E-mails,Service Street 1,Service City,Service State,Service Zip code\n' +
         'John Doe,,John,Doe,5551234567,john@example.com,123 Main St,Cumming,Georgia,30040\n' +
         'Jane Smith,,Jane,Smith,5559876543,jane@example.com,456 Oak Ave,Ball Ground,Georgia,30107\n' +
         'ACME Corp,ACME Corp,,,5555551234,contact@acme.com,789 Business Blvd,Cumming,Georgia,30041';
}
