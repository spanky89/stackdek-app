import { useState, useRef } from 'react';
import { supabase } from '../api/supabaseClient';
import {
  convertToCSV,
  downloadCSV
} from '../utils/csvHelpers';

interface ProductsServicesImportExportProps {
  companyId: string;
}

interface ServiceCSVRow {
  name: string;
  price: number | string;
  description?: string;
}

interface ProductCSVRow {
  name: string;
  price: number | string;
  description?: string;
}

export default function ProductsServicesImportExport({ companyId }: ProductsServicesImportExportProps) {
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
   * Parse CSV text into array of objects
   */
  function parseCSV(text: string): { headers: string[]; rows: any[] } {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

    return { headers, rows };
  }

  /**
   * Import services from CSV
   */
  async function handleImportServices(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setMessage('❌ Please upload a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ File too large. Maximum size is 5MB');
      return;
    }

    setImporting(true);
    setMessage('📂 Reading services CSV...');
    setImportStats(null);

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      if (!headers.includes('name') || !headers.includes('price')) {
        setMessage('❌ CSV must include "name" and "price" columns');
        setImporting(false);
        return;
      }

      const validRows: ServiceCSVRow[] = [];
      const errors: string[] = [];

      rows.forEach((row, index) => {
        if (!row.name || row.name.trim() === '') {
          errors.push(`Row ${index + 2}: Missing name`);
          return;
        }

        const price = parseFloat(row.price);
        if (isNaN(price) || price < 0) {
          errors.push(`Row ${index + 2}: Invalid price "${row.price}"`);
          return;
        }

        validRows.push({
          name: row.name.trim(),
          price: price,
          description: row.description?.trim() || ''
        });
      });

      if (validRows.length === 0) {
        setMessage('❌ No valid services found in CSV');
        setImportStats({
          total: rows.length,
          success: 0,
          failed: rows.length,
          errors
        });
        setImporting(false);
        return;
      }

      // Insert services
      const insertData = validRows.map(row => ({
        company_id: companyId,
        name: row.name,
        price: Number(row.price),
        description: row.description || null
      }));

      const { data: inserted, error } = await supabase
        .from('services')
        .insert(insertData)
        .select();

      if (error) throw error;

      setImportStats({
        total: rows.length,
        success: inserted?.length || 0,
        failed: rows.length - (inserted?.length || 0),
        errors
      });

      setMessage(`✅ Imported ${inserted?.length || 0} service(s) successfully`);

    } catch (error) {
      console.error('Import error:', error);
      setMessage('❌ Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /**
   * Import products from CSV
   */
  async function handleImportProducts(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setMessage('❌ Please upload a CSV file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage('❌ File too large. Maximum size is 5MB');
      return;
    }

    setImporting(true);
    setMessage('📂 Reading products CSV...');
    setImportStats(null);

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      if (!headers.includes('name') || !headers.includes('price')) {
        setMessage('❌ CSV must include "name" and "price" columns');
        setImporting(false);
        return;
      }

      const validRows: ProductCSVRow[] = [];
      const errors: string[] = [];

      rows.forEach((row, index) => {
        if (!row.name || row.name.trim() === '') {
          errors.push(`Row ${index + 2}: Missing name`);
          return;
        }

        const price = parseFloat(row.price);
        if (isNaN(price) || price < 0) {
          errors.push(`Row ${index + 2}: Invalid price "${row.price}"`);
          return;
        }

        validRows.push({
          name: row.name.trim(),
          price: price,
          description: row.description?.trim() || ''
        });
      });

      if (validRows.length === 0) {
        setMessage('❌ No valid products found in CSV');
        setImportStats({
          total: rows.length,
          success: 0,
          failed: rows.length,
          errors
        });
        setImporting(false);
        return;
      }

      // Insert products
      const insertData = validRows.map(row => ({
        company_id: companyId,
        name: row.name,
        price: Number(row.price),
        description: row.description || null
      }));

      const { data: inserted, error } = await supabase
        .from('products')
        .insert(insertData)
        .select();

      if (error) throw error;

      setImportStats({
        total: rows.length,
        success: inserted?.length || 0,
        failed: rows.length - (inserted?.length || 0),
        errors
      });

      setMessage(`✅ Imported ${inserted?.length || 0} product(s) successfully`);

    } catch (error) {
      console.error('Import error:', error);
      setMessage('❌ Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  /**
   * Export services to CSV
   */
  async function exportServices() {
    setExporting(true);
    setMessage('📊 Exporting services...');

    try {
      const { data: services, error } = await supabase
        .from('services')
        .select('name, price, description, created_at')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;

      if (!services || services.length === 0) {
        setMessage('⚠️ No services to export');
        setExporting(false);
        return;
      }

      const headers = ['name', 'price', 'description', 'created_at'];
      const csvContent = convertToCSV(services, headers);

      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(`services_${timestamp}.csv`, csvContent);

      setMessage(`✅ Exported ${services.length} service(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      setMessage('❌ Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  /**
   * Export products to CSV
   */
  async function exportProducts() {
    setExporting(true);
    setMessage('📊 Exporting products...');

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('name, price, description, created_at')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;

      if (!products || products.length === 0) {
        setMessage('⚠️ No products to export');
        setExporting(false);
        return;
      }

      const headers = ['name', 'price', 'description', 'created_at'];
      const csvContent = convertToCSV(products, headers);

      const timestamp = new Date().toISOString().split('T')[0];
      downloadCSV(`products_${timestamp}.csv`, csvContent);

      setMessage(`✅ Exported ${products.length} product(s) successfully`);
    } catch (error) {
      console.error('Export error:', error);
      setMessage('❌ Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExporting(false);
    }
  }

  /**
   * Download sample CSV templates
   */
  function downloadServicesTemplate() {
    const template = 'name,price,description\nLawn Mowing,50.00,Standard residential lawn\nTree Trimming,150.00,Up to 20 feet\nMulching,75.00,Per cubic yard';
    downloadCSV('services_template.csv', template);
    setMessage('✅ Services template downloaded');
    setTimeout(() => setMessage(''), 2000);
  }

  function downloadProductsTemplate() {
    const template = 'name,price,description\nFertilizer Bag,25.00,50 lb bag\nWeed Killer,15.00,1 gallon\nGarden Soil,8.00,40 lb bag';
    downloadCSV('products_template.csv', template);
    setMessage('✅ Products template downloaded');
    setTimeout(() => setMessage(''), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Services Import */}
      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-700">📥 Import Services</h3>
          <button
            onClick={downloadServicesTemplate}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Download Template
          </button>
        </div>

        <p className="text-xs text-neutral-600">
          Upload a CSV file to bulk import services. Required: name, price. Optional: description
        </p>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportServices}
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

      {/* Products Import */}
      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-neutral-700">📥 Import Products</h3>
          <button
            onClick={downloadProductsTemplate}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            Download Template
          </button>
        </div>

        <p className="text-xs text-neutral-600">
          Upload a CSV file to bulk import products. Required: name, price. Optional: description
        </p>

        <div>
          <input
            type="file"
            accept=".csv"
            onChange={handleImportProducts}
            disabled={importing}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
          />
        </div>
      </div>

      {/* Export Section */}
      <div className="p-4 bg-neutral-50 rounded-lg border border-neutral-200 space-y-4">
        <h3 className="text-sm font-medium text-neutral-700">📤 Export Data</h3>
        <p className="text-xs text-neutral-600">
          Download your services and products as CSV files
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={exportServices}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting ? '...' : 'Export Services'}
          </button>

          <button
            onClick={exportProducts}
            disabled={exporting}
            className="px-4 py-2 bg-white border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {exporting ? '...' : 'Export Products'}
          </button>
        </div>
      </div>

      {/* Info Section */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-xs text-blue-800">
          <strong>💡 Tips:</strong>
        </p>
        <ul className="text-xs text-blue-700 space-y-1 mt-2 ml-4 list-disc">
          <li>CSV files must include headers: name, price, description (optional)</li>
          <li>Name and price fields are required</li>
          <li>Price must be a number (e.g., 50.00, not $50.00)</li>
          <li>Exported files include timestamps for easy organization</li>
        </ul>
      </div>
    </div>
  );
}
