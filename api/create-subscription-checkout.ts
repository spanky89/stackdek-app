import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// This uses YOUR (StackDek's) Stripe account, NOT the contractor's account
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_STACKDEK || process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
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
    const { priceId, planId } = req.body;

    if (!priceId || !planId) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Create or retrieve Stripe customer
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
      await supabase
        .from('companies')
        .update({ subscription_stripe_customer_id: customerId })
        .eq('id', company.id);
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
