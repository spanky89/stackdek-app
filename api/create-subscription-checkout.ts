import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// This uses YOUR (StackDek's) Stripe account, NOT the contractor's account
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_STACKDEK || process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

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
    const { planId } = req.body;
    const prices: Record<string, string | undefined> = {
      basic: process.env.VITE_STRIPE_PRICE_BASIC,
      pro: process.env.VITE_STRIPE_PRICE_PRO,
    };
    const priceId = prices[planId];

    if (!priceId || !planId) {
      return res.status(400).json({ error: 'Unknown plan or missing server price configuration' });
    }

    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user and get company
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, subscription_stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    let customerId = company.subscription_stripe_customer_id;

    // Customer IDs are scoped to a Stripe account and mode. A company can
    // retain a test-mode customer ID after production is switched to live
    // keys, so validate the saved ID before using it for checkout.
    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (customer.deleted) {
          customerId = null;
        }
      } catch (error: any) {
        if (error?.code === 'resource_missing') {
          customerId = null;
        } else {
          throw error;
        }
      }
    }

    // Create a live customer when none exists or the saved ID is stale.
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          companyId: company.id,
          companyName: company.name,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      const { error: updateError } = await supabase
        .from('companies')
        .update({ subscription_stripe_customer_id: customerId })
        .eq('id', company.id);

      if (updateError) {
        throw new Error('Unable to save Stripe customer');
      }
    }

    // Create checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.VITE_APP_URL || req.headers.origin}/settings/billing?subscription=success`,
      cancel_url: `${process.env.VITE_APP_URL || req.headers.origin}/settings/billing?subscription=cancelled`,
      metadata: {
        companyId: company.id,
        planId,
      },
      subscription_data: {
        metadata: {
          companyId: company.id,
          planId,
        },
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Error creating subscription checkout:', error);
    return res.status(500).json({ 
      error: 'Failed to create subscription checkout',
      message: error.message 
    });
  }
}

