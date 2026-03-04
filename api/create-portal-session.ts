import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_STACKDEK || process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from session
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, subscription_stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.subscription_stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer ID found' });
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: company.subscription_stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://stackdek-app.vercel.app'}/settings/billing`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return res.status(500).json({ error: 'Failed to create portal session', message: error.message });
  }
}
