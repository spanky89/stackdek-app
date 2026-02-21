/**
 * Stripe Connect - OAuth Flow Initiator
 * Redirects user to Stripe to authorize their account
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get authorization header
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' })
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Get user's company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    // Build Stripe Connect OAuth URL
    // TODO: Replace with real client_id when available from Stripe Dashboard
    const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || 'ca_PLACEHOLDER'
    const redirectUri = `${process.env.VITE_APP_URL || 'http://localhost:5173'}/api/stripe/connect-callback`
    
    const state = JSON.stringify({
      companyId: company.id,
      userId: user.id,
      timestamp: Date.now()
    })

    const stripeAuthUrl = `https://connect.stripe.com/oauth/authorize?` +
      `response_type=code` +
      `&client_id=${clientId}` +
      `&scope=read_write` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${encodeURIComponent(state)}`

    return res.status(200).json({
      url: stripeAuthUrl,
      message: 'Redirect to this URL to connect Stripe account'
    })

  } catch (error) {
    console.error('Stripe Connect OAuth error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
