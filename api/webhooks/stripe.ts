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

    // Extract company_id from query parameter
    const companyId = req.query.companyId as string;

    if (!companyId) {
      console.error('No companyId in webhook URL');
      return res.status(400).json({ error: 'Missing companyId parameter' });
    }

    // Fetch company's Stripe keys
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, stripe_secret_key, stripe_webhook_secret, name')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      console.error('Company not found:', companyId);
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.stripe_secret_key || !company.stripe_webhook_secret) {
      console.error('Company Stripe keys not configured:', companyId);
      return res.status(400).json({ error: 'Stripe not configured for this company' });
    }

    // Initialize Stripe with company-specific secret key
    const stripe = new Stripe(company.stripe_secret_key, {
      apiVersion: '2024-11-20.acacia',
    });

    // Verify webhook signature using company's webhook secret
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, company.stripe_webhook_secret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log(`Webhook received for company ${companyId}:`, event.type);

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      try {
        const quoteId = session.metadata?.quoteId;
        const sessionCompanyId = session.metadata?.companyId;
        
        if (!quoteId) {
          console.error('No quoteId in session metadata');
          return res.status(400).json({ error: 'Missing quoteId in metadata' });
        }

        // Verify company_id matches (security check)
        if (sessionCompanyId !== companyId) {
          console.error('Company ID mismatch:', { sessionCompanyId, urlCompanyId: companyId });
          return res.status(403).json({ error: 'Company ID mismatch' });
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

