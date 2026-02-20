/**
 * Create Stripe Checkout Session
 * 
 * Creates a Stripe Checkout session for Pro/Premium subscription upgrade
 * 
 * Deploy to Vercel as: /api/create-checkout-session
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { priceId } = req.body;

  if (!priceId) {
    return res.status(400).json({ error: 'Missing priceId' });
  }

  // Get user from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    // Get or create company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    let customerId = company.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          company_id: company.id,
          user_id: user.id,
        },
      });

      customerId = customer.id;

      // Update company with customer ID
      await supabase
        .from('companies')
        .update({ stripe_customer_id: customerId })
        .eq('id', company.id);
    }

    // Create Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.VITE_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.VITE_APP_URL}/pricing`,
      metadata: {
        company_id: company.id,
        user_id: user.id,
      },
      subscription_data: {
        trial_period_days: 14, // 14-day trial
        metadata: {
          company_id: company.id,
        },
      },
    });

    return res.status(200).json({ sessionUrl: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
