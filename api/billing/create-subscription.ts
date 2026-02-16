import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// StackDek's own Stripe keys (NOT contractor keys - this is for platform billing)
const stripe = new Stripe(process.env.STACKDEK_STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

// Subscription pricing (in cents)
const PRICING = {
  basic: { price: 0, name: 'Basic', priceId: null }, // Free tier
  pro: { price: 2900, name: 'Pro', priceId: process.env.STRIPE_PRICE_PRO }, // $29/month
  premium: { price: 9900, name: 'Premium', priceId: process.env.STRIPE_PRICE_PREMIUM }, // $99/month
};

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
    const { plan } = req.body;

    if (!plan || !['basic', 'pro', 'premium'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name, email, subscription_stripe_customer_id')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Basic plan is free - just update the database
    if (plan === 'basic') {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_plan: 'basic',
          subscription_status: 'active',
          subscription_expires_at: null, // No expiration for free tier
        })
        .eq('id', company.id);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      return res.status(200).json({ 
        success: true, 
        plan: 'basic',
        message: 'Downgraded to Basic plan' 
      });
    }

    // Pro/Premium plans - create Stripe checkout session
    const planDetails = PRICING[plan as keyof typeof PRICING];

    if (!planDetails.priceId) {
      return res.status(500).json({ 
        error: 'Price ID not configured',
        message: 'Please set STRIPE_PRICE_PRO and STRIPE_PRICE_PREMIUM environment variables'
      });
    }

    // Create or retrieve Stripe customer
    let customerId = company.subscription_stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || company.email,
        name: company.name,
        metadata: {
          companyId: company.id,
          userId: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('companies')
        .update({ subscription_stripe_customer_id: customerId })
        .eq('id', company.id);
    }

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: planDetails.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.VITE_APP_URL || req.headers.origin}/settings/billing?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.VITE_APP_URL || req.headers.origin}/settings/billing?canceled=true`,
      metadata: {
        companyId: company.id,
        plan,
      },
      subscription_data: {
        metadata: {
          companyId: company.id,
          plan,
        },
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      publishableKey: process.env.STACKDEK_STRIPE_PUBLISHABLE_KEY,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return res.status(500).json({ 
      error: 'Failed to create subscription',
      message: error.message 
    });
  }
}

