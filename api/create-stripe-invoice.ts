import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceId } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Missing invoiceId' });
    }

    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user and get company_id
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get company info including Stripe account
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, stripe_connected_account_id')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.stripe_connected_account_id) {
      return res.status(400).json({ error: 'Stripe account not connected. Please connect your Stripe account in Settings.' });
    }

    // Get invoice with line items and client info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*), clients(id, name, email)')
      .eq('id', invoiceId)
      .eq('company_id', company.id)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (!invoice.clients?.email) {
      return res.status(400).json({ error: 'Client email required for Stripe invoicing' });
    }

    // Initialize Stripe with platform account
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });

    // Create or retrieve customer on connected account
    const customers = await stripe.customers.list(
      { email: invoice.clients.email, limit: 1 },
      { stripeAccount: company.stripe_connected_account_id }
    );

    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create(
        {
          email: invoice.clients.email,
          name: invoice.clients.name,
          metadata: {
            clientId: invoice.client_id,
            companyId: company.id,
          },
        },
        { stripeAccount: company.stripe_connected_account_id }
      );
    }

    // Create Stripe invoice on connected account
    const stripeInvoice = await stripe.invoices.create(
      {
        customer: customer.id,
        auto_advance: true, // Automatically finalize and send
        collection_method: 'send_invoice',
        days_until_due: invoice.due_days || 30,
        metadata: {
          invoiceId: invoice.id,
          companyId: company.id,
          invoiceNumber: invoice.invoice_number,
        },
      },
      { stripeAccount: company.stripe_connected_account_id }
    );

    // Add line items to Stripe invoice
    if (invoice.invoice_line_items && invoice.invoice_line_items.length > 0) {
      for (const item of invoice.invoice_line_items) {
        await stripe.invoiceItems.create(
          {
            customer: customer.id,
            invoice: stripeInvoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_amount: Math.round((item.unit_price || 0) * 100), // Convert to cents
          },
          { stripeAccount: company.stripe_connected_account_id }
        );
      }
    }

    // Finalize and send invoice
    const finalizedInvoice = await stripe.invoices.finalizeInvoice(
      stripeInvoice.id,
      { auto_advance: true },
      { stripeAccount: company.stripe_connected_account_id }
    );

    // Update database with Stripe invoice ID and status
    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        stripe_invoice_id: finalizedInvoice.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      // Don't fail the request - Stripe invoice was created successfully
    }

    return res.status(200).json({
      success: true,
      stripeInvoiceId: finalizedInvoice.id,
      invoiceUrl: finalizedInvoice.hosted_invoice_url,
    });
  } catch (error: any) {
    console.error('Error creating Stripe invoice:', error);
    return res.status(500).json({ 
      error: 'Failed to create Stripe invoice',
      message: error.message 
    });
  }
}
