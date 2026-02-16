import type { VercelRequest, VercelResponse } from '@vercel/node'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { quoteId, depositAmount, clientEmail, clientName, companyId, companyName } = req.body

    if (!quoteId || !depositAmount || !companyId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Fetch company to get Stripe keys
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, stripe_publishable_key, stripe_secret_key, name')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    // Check if Stripe keys are configured
    if (!company.stripe_secret_key || !company.stripe_publishable_key) {
      return res.status(400).json({ 
        error: 'Stripe not configured',
        message: 'The contractor has not set up Stripe payments yet. Please contact them directly.' 
      })
    }

    // Initialize Stripe with company-specific secret key
    const stripe = new Stripe(company.stripe_secret_key, {
      apiVersion: '2024-11-20.acacia',
    })

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Deposit for Quote #${quoteId.slice(0, 8)}`,
              description: `Deposit payment for ${companyName || 'job'}`,
            },
            unit_amount: Math.round(depositAmount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.VITE_APP_URL || req.headers.origin || 'https://stackdek-app.vercel.app'}/quotes/view/${quoteId}?payment=success`,
      cancel_url: `${process.env.VITE_APP_URL || req.headers.origin || 'https://stackdek-app.vercel.app'}/quotes/view/${quoteId}?payment=cancelled`,
      customer_email: clientEmail,
      metadata: {
        quoteId,
        companyId,
        clientName: clientName || '',
        depositAmount: depositAmount.toString(),
        publicCheckout: 'true', // Mark as public/client-initiated
      },
    })

    return res.status(200).json({
      sessionId: session.id,
      url: session.url,
      publishableKey: company.stripe_publishable_key,
    })
  } catch (error: any) {
    console.error('Error creating public checkout session:', error)
    return res.status(500).json({ 
      error: 'Failed to create checkout session',
      message: error.message 
    })
  }
}

