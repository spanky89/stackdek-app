/**
 * Create Stripe Billing Portal Session
 * 
 * Allows users to manage their subscription (cancel, update payment, view invoices)
 * 
 * Deploy to Vercel as: /api/create-billing-portal
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
    // Get company with Stripe customer ID
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !company || !company.stripe_customer_id) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripe_customer_id,
      return_url: `${process.env.VITE_APP_URL}/dashboard`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    return res.status(500).json({ error: 'Failed to create billing portal session' });
  }
}
