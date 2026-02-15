import { useState, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import {
  parseCSV,
  validateClientCSV,
  convertToCSV,
  downloadCSV,
  getClientCSVTemplate,
  ClientCSVRow
} from '../utils/csvHelpers';

interface CSVImportExportProps {
  companyId: string;
}

export default function CSVImportExport({ companyId }: CSVImportExportProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState('');
  const [importStats, setImportStats] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle CSV file upload and import
   */
  async function handleImportCSV(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setMessage('❌ Please upload a CSV file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ File too large. Maximum size is 5MB');
      return;
    }

    setImporting(true);
    setMessage('📂 Reading CSV file...');
    setImportStats(null);

    try {
      // Read file content
      const text = await file.text();

      // Parse CSV
      const parseResult = parseCSV(text);
      if (!parseResult.success || !parseResult.data) {
        setMessage('❌ Failed to parse CSV file');
        setImportStats({
          total: 0,
          success: 0,
          failed: 0,
          errors: parseResult.errors || ['Unknown parsing error']
        });
        return;
      }

      setMessage('✅ CSV parsed. Validating data...');

      // Validate client data
      const { valid, errors } = validateClientCSV(parseResult.data);

      if (valid.length === 0) {
        setMessage('❌ No valid rows found in CSV');
        setImportStats({
          total: parseResult.data.length,
          success: 0,
          failed: parseResult.data.length,
          errors
        });
        return;
      }

      setMessage(`✅ Validation complete. Importing ${valid.length} clients...`);

      // Check for duplicate emails in the database
      const emailsToCheck = valid
        .filter(row => row.email)
        .map(row => row.email!);

      let existingEmails: string[] = [];
      if (emailsToCheck.length > 0) {
        const { data: existingClients } = await supabase
          .from('clients')
          .select('email')
          .eq('company_id', companyId)
          .in('email', emailsToCheck);

        existingEmails = existingClients?.map(c => c.email).filter(Boolean) || [];
      }

      // Filter out clients with duplicate emails
      const clientsToInsert = valid.filter(row => {
        if (!row.email) return true; // Allow clients without email
        return !existingEmails.includes(row.email);
      });

      const duplicateCount = valid.length - clientsToInsert.length;

      // Insert clients into database
      const insertData = clientsToInsert.map(row => ({
        company_id: companyId,
        name: row.name,
        email: row.email || null,
        phone: row.phone || null,
        address: row.address || null,
        vip: row.vip || false
      }));

      const { data: insertedClients, error: insertError } = await supabase
        .from('clients')
        .insert(insertData)
        .select();

      if (insertError) {
        throw insertError;
      }

      const successCount = insertedClients?.length || 0;
      const allErrors = [...errors];

      if (duplicateCount > 0) {
        allErrors.push(`${duplicateCount} client(s) skipped due to duplicate email addresses`);
      }

      setImportStats({
        total: parseResult.data.length,
        success: successCount,
        failed: parseResult.data.length - successCount,
        errors: allErrors
      });

      setMessage(
        `✅ Import complete! ${successCount} client(s) imported successfully` +
        (duplicateCount > 0 ? `, ${duplicateCount} duplicate(s) skipped` : '')
      );

    } catch (error) {
      console.error('Import error:', error);
      setMessage('❌ Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setImportStats({
        total: 0,
        success: 0,
        failed: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  /**
   * Export clients to CSV
   */
  async function exportClients() {
    setExporting(true);
    setMessage('📊 Exporting clients...');

    try {
      const { data: clients, error } = await supabase
        .from('clients')
        .select('name, email, phone, address, vip, created_at')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;

      if (!clients || clients.length === 0) {
        setMessage('⚠️ No clients to export');
        setExporting(false);
        return;
      }

      // Convert to CSV
      const headers = ['name', 'email', 'phone', 'address', 'vip', 'created_at'];
      const csvContent = convertToCSV(clients, headers);

      // Download file
      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(`clients_${timestamp}.csv`, csvContent);

      setMessage(`✅ Exported ${clients.length} client(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      setMessage('❌ Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  /**
   * Export jobs to CSV
   */
  async function exportJobs() {
    setExporting(true);
    setMessage('📊 Exporting jobs...');

    try {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select(`
          title,
          description,
          status,
          date_scheduled,
          time_scheduled,
          estimate_amount,
          location,
          created_at,
          clients (name, email)
        `)
        .eq('company_id', companyId)
        .order('date_scheduled', { ascending: false });

      if (error) throw error;

      if (!jobs || jobs.length === 0) {
        setMessage('⚠️ No jobs to export');
        setExporting(false);
        return;
      }

      // Flatten client data
      const flatJobs = jobs.map(job => ({
        title: job.title,
        description: job.description,
        status: job.status,
        date_scheduled: job.date_scheduled,
        time_scheduled: job.time_scheduled,
        estimate_amount: job.estimate_amount,
        location: job.location,
        client_name: job.clients?.name || '',
        client_email: job.clients?.email || '',
        created_at: job.created_at
      }));

      const headers = [
        'title',
        'description',
        'status',
        'date_scheduled',
        'time_scheduled',
        'estimate_amount',
        'location',
        'client_name',
        'client_email',
        'created_at'
      ];
      const csvContent = convertToCSV(flatJobs, headers);

      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(`jobs_${timestamp}.csv`, csvContent);

      setMessage(`✅ Exported ${jobs.length} job(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      setMessage('❌ Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  /**
   * Export quotes to CSV
   */
  async function exportQuotes() {
    setExporting(true);
    setMessage('📊 Exporting quotes...');

    try {
      const { data: quotes, error } = await supabase
        .from('quotes')
        .select(`
          title,
          amount,
          status,
          expiration_date,
          created_at,
          clients (name, email)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!quotes || quotes.length === 0) {
        setMessage('⚠️ No quotes to export');
        setExporting(false);
        return;
      }

      const flatQuotes = quotes.map(quote => ({
        title: quote.title,
        amount: quote.amount,
        status: quote.status,
        expiration_date: quote.expiration_date,
        client_name: quote.clients?.name || '',
        client_email: quote.clients?.email || '',
        created_at: quote.created_at
      }));

      const headers = [
        'title',
        'amount',
        'status',
        'expiration_date',
        'client_name',
        'client_email',
        'created_at'
      ];
      const csvContent = convertToCSV(flatQuotes, headers);

      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(`quotes_${timestamp}.csv`, csvContent);

      setMessage(`✅ Exported ${quotes.length} quote(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      setMessage('❌ Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  /**
   * Export invoices to CSV
   */
  async function exportInvoices() {
    setExporting(true);
    setMessage('📊 Exporting invoices...');

    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select(`
          amount,
          status,
          due_date,
          paid_date,
          created_at,
          clients (name, email)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!invoices || invoices.length === 0) {
        setMessage('⚠️ No invoices to export');
        setExporting(false);
        return;
      }

      const flatInvoices = invoices.map(invoice => ({
        amount: invoice.amount,
        status: invoice.status,
        due_date: invoice.due_date,
        paid_date: invoice.paid_date,
        client_name: invoice.clients?.name || '',
        client_email: invoice.clients?.email || '',
        created_at: invoice.created_at
      }));

      const headers = [
        'amount',
        'status',
        'due_date',
        'paid_date',
        'client_name',
        'client_email',
        'created_at'
      ];
      const csvContent = convertToCSV(flatInvoices, headers);

      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(`invoices_${timestamp}.csv`, csvContent);

      setMessage(`✅ Exported ${invoices.length} invoice(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      setMessage('❌ Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  /**
   * Download sample CSV template
   */
  function downloadTemplate() {
    const template = getClientCSVTemplate();
    downloadCSV('clients_template.csv', template);
    setMessage('✅ Template downloaded');
    setTimeout(() => setMessage(''), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-700">📥 Import Customers</h3>
          <button
            onClick={downloadTemplate}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Download Template
          </button>
        </div>

        <p className="text-xs text-neutral-600">
          Upload a CSV file to bulk import customer data. Expected format: name, email, phone, address, vip
        </p>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            disabled={importing}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
          />
        </div>

        {importing && (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <div className="animate-spin h-4 w-4 border-2 border-neutral-900 border-t-transparent rounded-full" />
            <span>Processing...</span>
          </div>
        )}

        {message && (
          <div className="text-sm p-3 bg-white border border-neutral-200 rounded-lg">
            {message}
          </div>
        )}

        {importStats && (
          <div className="p-3 bg-white border border-neutral-200 rounded-lg space-y-2">
            <div className="text-sm font-medium text-neutral-900">Import Summary</div>
            <div className="text-xs space-y-1">
              <p>Total rows: {importStats.total}</p>
              <p className="text-green-600">✓ Successfully imported: {importStats.success}</p>
              {importStats.failed > 0 && (
                <p className="text-red-600">✗ Failed: {importStats.failed}</p>
              )}
            </div>
            {importStats.errors && importStats.errors.length > 0 && (
              <div className="mt-2 pt-2 border-t border-neutral-200">
                <p className="text-xs font-medium text-neutral-700 mb-1">Errors:</p>
                <ul className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
                  {importStats.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
        <h3 className="text-sm font-medium text-neutral-700">📤 Export Data</h3>
        <p className="text-xs text-neutral-600">
          Download your data as CSV files for backup or analysis
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={exportClients}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting ? '...' : 'Clients'}
          </button>

          <button
            onClick={exportJobs}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting ? '...' : 'Jobs'}
          </button>

          <button
            onClick={exportQuotes}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting ? '...' : 'Quotes'}
          </button>

          <button
            onClick={exportInvoices}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting ? '...' : 'Invoices'}
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>💡 Tips:</strong>
        </p>
        <ul className="text-xs text-blue-700 space-y-1 mt-2 ml-4 list-disc">
          <li>CSV files must include headers: name, email, phone, address, vip</li>
          <li>Name field is required, all others are optional</li>
          <li>Duplicate email addresses will be automatically skipped</li>
          <li>VIP field accepts: true/false, yes/no, or 1/0</li>
          <li>Exported files include timestamps for easy organization</li>
        </ul>
      </div>
    </div>
  );
}
