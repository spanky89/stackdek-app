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
 */
export function validateClientCSV(data: CSVRow[]): { valid: ClientCSVRow[]; errors: string[] } {
  const valid: ClientCSVRow[] = [];
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    const rowNum = index + 2; // +2 because index is 0-based and we skip header
    
    // Name is required
    if (!row.name || typeof row.name !== 'string' || !row.name.trim()) {
      errors.push(`Row ${rowNum}: Name is required`);
      return;
    }
    
    // Email validation (if provided)
    if (row.email && typeof row.email === 'string' && row.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(row.email.trim())) {
        errors.push(`Row ${rowNum}: Invalid email format`);
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
      name: String(row.name).trim(),
      email: row.email ? String(row.email).trim() : undefined,
      phone: row.phone ? String(row.phone).trim() : undefined,
      address: row.address ? String(row.address).trim() : undefined,
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
 */
export function getClientCSVTemplate(): string {
  return 'name,email,phone,address,vip\n' +
         'John Doe,john@example.com,(555) 123-4567,"123 Main St, New York, NY 10001",false\n' +
         'Jane Smith,jane@example.com,(555) 987-6543,"456 Oak Ave, Brooklyn, NY 11201",true';
}
