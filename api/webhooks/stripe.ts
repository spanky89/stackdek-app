import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for server-side operations
);

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for webhook verification
  },
};

// Helper to get raw body
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string;

    // Use platform-level webhook secret (single secret for all companies)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Initialize Stripe (we'll get company-specific key after parsing event)
    const platformStripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-02-24.acacia',
    });

    // Verify webhook signature using platform webhook secret
    let event: Stripe.Event;
    try {
      event = platformStripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log('[Stripe Webhook] Event received:', {
      type: event.type,
      id: event.id,
      account: event.account || 'platform',
    });

    // ============================================
    // HANDLE DEPOSIT PAYMENTS (Quote Deposits)
    // ============================================
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      try {
        const quoteId = session.metadata?.quoteId;
        const companyId = session.metadata?.companyId;
        
        if (!quoteId || !companyId) {
          console.error('Missing metadata:', { quoteId, companyId });
          return res.status(400).json({ error: 'Missing quoteId or companyId in metadata' });
        }

        // Fetch company to verify it exists
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name')
          .eq('id', companyId)
          .single();

        if (companyError || !company) {
          console.error('Company not found:', companyId);
          return res.status(404).json({ error: 'Company not found' });
        }

        // 1. Mark quote deposit as paid AND set status to approved
        const { data: quote, error: quoteError } = await supabase
          .from('quotes')
          .update({
            deposit_paid: true,
            status: 'approved',
            stripe_checkout_session_id: session.id,
            deposit_paid_at: new Date().toISOString(),
          })
          .eq('id', quoteId)
          .eq('company_id', companyId) // Extra security: ensure quote belongs to company
          .select('*, quote_line_items(*), clients(id, name, email), companies(id, name)')
          .single();

        if (quoteError) {
          console.error('Error updating quote:', quoteError);
          return res.status(500).json({ error: 'Failed to update quote' });
        }

        // 2. Auto-create job with same line items and transfer video/photos
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            company_id: quote.company_id,
            client_id: quote.client_id,
            quote_id: quoteId,
            title: quote.title,
            description: `Auto-created from Quote #${quoteId.slice(0, 8)} after deposit payment`,
            status: 'scheduled',
            date_scheduled: tomorrow.toISOString().split('T')[0],
            estimate_amount: quote.amount,
            video_url: quote.video_url || null,
            photos: quote.photos || [],
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (jobError) {
          console.error('Error creating job:', jobError);
          return res.status(500).json({ error: 'Failed to create job' });
        }

        // 3. Send receipt email asynchronously (don't block on this)
        try {
          const appUrl = process.env.VITE_APP_URL || 'https://stackdek-app.vercel.app';
          await fetch(`${appUrl}/api/send-receipt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quoteId,
              clientEmail: quote.clients?.email,
              clientName: quote.clients?.name,
              companyName: quote.companies?.name,
              depositAmount: session.metadata?.depositAmount || 0,
              quoteTitle: quote.title,
              jobId: newJob.id,
            }),
          }).catch(err => console.error('Async email error:', err));
        } catch (emailErr) {
          console.error('Error sending receipt email:', emailErr);
          // Don't fail the webhook if email fails - just log it
        }

        console.log('Successfully processed payment:', {
          companyId,
          quoteId,
          jobId: newJob.id,
          sessionId: session.id,
        });

        return res.status(200).json({ 
          received: true, 
          companyId,
          quoteId, 
          jobId: newJob.id 
        });
      } catch (error: any) {
        console.error('Error processing webhook:', error);
        return res.status(500).json({ 
          error: 'Internal server error',
          message: error.message 
        });
      }
    }

    // ============================================
    // HANDLE INVOICE PAYMENTS (Connected Accounts)
    // ============================================
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;
      
      try {
        const stripeInvoiceId = invoice.id;
        const stripeAccountId = event.account; // Connected account ID
        
        if (!stripeAccountId) {
          console.warn('[Stripe Webhook] Invoice payment on platform account (not Connect)');
          return res.status(200).json({ received: true, warning: 'Not a Connect event' });
        }

        const amountPaid = invoice.amount_paid / 100; // Cents to dollars
        const paidAt = invoice.status_transitions?.paid_at 
          ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
          : new Date().toISOString();

        console.log('[Stripe Webhook] Processing invoice payment:', {
          stripeInvoiceId,
          stripeAccountId,
          amountPaid,
        });

        // Find company by connected account ID
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, name')
          .eq('stripe_connected_account_id', stripeAccountId)
          .single();

        if (companyError || !company) {
          console.error('[Stripe Webhook] Company not found for connected account:', stripeAccountId);
          return res.status(200).json({ 
            received: true, 
            warning: 'Connected account not found',
            stripeAccountId 
          });
        }

        // Find invoice in database
        const { data: existingInvoice, error: findError } = await supabase
          .from('invoices')
          .select('id, status')
          .eq('stripe_invoice_id', stripeInvoiceId)
          .eq('company_id', company.id)
          .single();

        if (findError || !existingInvoice) {
          console.warn('[Stripe Webhook] Invoice not found in database:', stripeInvoiceId);
          return res.status(200).json({ 
            received: true, 
            warning: 'Invoice not found',
            stripeInvoiceId 
          });
        }

        // Update invoice to paid
        const { data: updatedInvoice, error: updateError } = await supabase
          .from('invoices')
          .update({
            status: 'paid',
            amount_paid: amountPaid,
            paid_at: paidAt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingInvoice.id)
          .select()
          .single();

        if (updateError) {
          console.error('[Stripe Webhook] Failed to update invoice:', updateError);
          return res.status(500).json({ error: 'Failed to update invoice' });
        }

        console.log('[Stripe Webhook] ✅ Invoice marked as paid:', {
          invoiceId: updatedInvoice.id,
          stripeInvoiceId,
          amountPaid,
        });

        return res.status(200).json({
          received: true,
          invoiceId: updatedInvoice.id,
          stripeInvoiceId,
          status: 'paid',
        });

      } catch (error: any) {
        console.error('[Stripe Webhook] Error processing invoice payment:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    // Return 200 for other event types
    return res.status(200).json({ received: true, eventType: event.type });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

