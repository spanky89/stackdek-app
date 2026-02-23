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
    const { invoiceToken } = req.body;

    if (!invoiceToken) {
      return res.status(400).json({ error: 'Missing invoice token' });
    }

    // Get invoice with line items and related data (public access via token)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        invoice_line_items(*),
        clients(id, name, email),
        companies(id, name, stripe_connected_account_id)
      `)
      .eq('invoice_token', invoiceToken)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Check if already paid
    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Invoice already paid' });
    }

    // Verify company has Stripe connected
    if (!invoice.companies?.stripe_connected_account_id) {
      return res.status(400).json({ error: 'Payment processing not configured for this business' });
    }

    // Calculate amounts
    const subtotal = invoice.invoice_line_items.reduce(
      (sum: number, item: any) => sum + (item.quantity * item.unit_price),
      0
    );
    const tax = invoice.tax_amount || 0;
    const depositPaid = invoice.deposit_paid_amount || 0;
    const totalDue = subtotal + tax - depositPaid;

    if (totalDue <= 0) {
      return res.status(400).json({ error: 'No payment due' });
    }

    // Initialize Stripe with platform account
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });

    // Build line items for Stripe Checkout
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Add invoice line items
    invoice.invoice_line_items.forEach((item: any) => {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.title || item.description || 'Service',
            description: item.description && item.title ? item.description : undefined,
          },
          unit_amount: Math.round(item.unit_price * 100), // Convert to cents
        },
        quantity: item.quantity,
      });
    });

    // Add tax as separate line item if applicable
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Tax${invoice.tax_rate ? ` (${invoice.tax_rate}%)` : ''}`,
          },
          unit_amount: Math.round(tax * 100),
        },
        quantity: 1,
      });
    }

    // Subtract deposit if paid
    if (depositPaid > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Deposit Paid',
          },
          unit_amount: Math.round(-depositPaid * 100), // Negative amount
        },
        quantity: 1,
      });
    }

    // Create Stripe checkout session on contractor's connected account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.VITE_APP_URL || req.headers.origin}/invoice/${invoiceToken}?payment=success`,
      cancel_url: `${process.env.VITE_APP_URL || req.headers.origin}/invoice/${invoiceToken}?payment=cancelled`,
      customer_email: invoice.clients?.email || undefined,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        companyId: invoice.company_id,
        clientId: invoice.client_id,
        totalDue: totalDue.toString(),
      },
    }, {
      stripeAccount: invoice.companies.stripe_connected_account_id,
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating invoice checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
}
