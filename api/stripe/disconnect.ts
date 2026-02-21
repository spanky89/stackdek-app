/**
 * Stripe Connect - Disconnect Account
 * Revokes access to connected Stripe account
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-02-24.acacia'
})

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
      .select('id, stripe_connected_account_id')
      .eq('owner_id', user.id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ error: 'Company not found' })
    }

    if (!company.stripe_connected_account_id) {
      return res.status(400).json({ error: 'No connected Stripe account' })
    }

    // Revoke Stripe access (optional - Stripe will keep the connection until user manually revokes)
    // In production, you may want to call stripe.oauth.deauthorize()
    // For now, we just remove the reference from our database
    
    try {
      await stripe.oauth.deauthorize({
        client_id: process.env.STRIPE_CONNECT_CLIENT_ID || 'ca_PLACEHOLDER',
        stripe_user_id: company.stripe_connected_account_id
      })
    } catch (stripeError) {
      // Log but don't fail - we still want to update our database
      console.error('Stripe deauthorization warning:', stripeError)
    }

    // Update company record
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        stripe_connected_account_id: null,
        stripe_connect_status: 'disconnected',
        stripe_connected_at: null
      })
      .eq('id', company.id)

    if (updateError) {
      console.error('Failed to update company:', updateError)
      throw updateError
    }

    return res.status(200).json({ 
      success: true,
      message: 'Stripe account disconnected successfully' 
    })

  } catch (error) {
    console.error('Stripe disconnect error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
