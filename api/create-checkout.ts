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
    const { quoteId, depositAmount, clientEmail, clientName, companyName } = req.body;

    if (!quoteId || !depositAmount) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    // Get company with Stripe keys
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, stripe_publishable_key, stripe_secret_key, name')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if Stripe keys are configured
    if (!company.stripe_secret_key || !company.stripe_publishable_key) {
      return res.status(400).json({ 
        error: 'Stripe not configured',
        message: 'Please configure your Stripe keys in Settings > Payment Settings' 
      });
    }

    // Initialize Stripe with company-specific secret key
    const stripe = new Stripe(company.stripe_secret_key, {
      apiVersion: '2024-11-20.acacia',
    });

    // Create Stripe checkout session using company's keys
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit for Quote ${quoteId}`,
              description: `Deposit payment for ${companyName || 'job'}`,
            },
            unit_amount: Math.round(depositAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.VITE_APP_URL || req.headers.origin}/quotes/${quoteId}?payment=success`,
      cancel_url: `${process.env.VITE_APP_URL || req.headers.origin}/quotes/${quoteId}?payment=cancelled`,
      customer_email: clientEmail,
      metadata: {
        quoteId,
        companyId: company.id, // CRITICAL: Include company_id for webhook routing
        clientName: clientName || '',
        depositAmount: depositAmount.toString(),
      },
    });

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      publishableKey: company.stripe_publishable_key, // Send company's publishable key to frontend
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    });
  }
}

