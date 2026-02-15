// Unified line item types for quotes, jobs, and invoices
export interface UnifiedLineItem {
  id: string;
  title?: string; // Optional short name (e.g., "Lawn Mowing")
  description: string; // Detailed description
  quantity: number;
  unit_price: number;
  sort_order: number;
}

// For creating new line items (no id yet)
export interface NewLineItem {
  title?: string;
  description: string;
  quantity: number;
  unit_price: number;
  sort_order: number;
}

// Mode for LineItemCard component
export type LineItemMode = 'view' | 'edit';

// Document types for context
export type DocumentType = 'quote' | 'job' | 'invoice';
