/**
 * Stripe Connect - OAuth Callback
 * Handles the redirect from Stripe after user authorizes
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const stripe = new Stripe(process.env.STRIPE_CONNECT_CLIENT_SECRET || '', {
  apiVersion: '2024-11-20.acacia'
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, state, error } = req.query

    // Handle user cancellation or errors
    if (error) {
      console.error('Stripe OAuth error:', error)
      return res.redirect(`${process.env.VITE_APP_URL || 'http://localhost:5173'}/settings?stripe_error=${error}`)
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' })
    }

    // Parse state to get company and user IDs
    let stateData: { companyId: string; userId: string; timestamp: number }
    try {
      stateData = JSON.parse(state as string)
    } catch {
      return res.status(400).json({ error: 'Invalid state parameter' })
    }

    // Verify state timestamp (prevent replay attacks)
    const maxAge = 10 * 60 * 1000 // 10 minutes
    if (Date.now() - stateData.timestamp > maxAge) {
      return res.status(400).json({ error: 'State expired' })
    }

    // Exchange authorization code for access token
    const clientSecret = process.env.STRIPE_CONNECT_CLIENT_SECRET
    
    if (!clientSecret) {
      throw new Error('STRIPE_CONNECT_CLIENT_SECRET not configured')
    }
    
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code as string,
      // Note: Stripe SDK automatically uses the secret key from initialization
    })

    const { stripe_user_id } = response

    if (!stripe_user_id) {
      throw new Error('No stripe_user_id returned')
    }

    // Update company record
    const { error: updateError } = await supabase
      .from('companies')
      .update({
        stripe_connected_account_id: stripe_user_id,
        stripe_connect_status: 'connected',
        stripe_connected_at: new Date().toISOString()
      })
      .eq('id', stateData.companyId)

    if (updateError) {
      console.error('Failed to update company:', updateError)
      throw updateError
    }

    // Redirect back to settings with success message
    return res.redirect(`${process.env.VITE_APP_URL || 'http://localhost:5173'}/settings?stripe_connected=true`)

  } catch (error) {
    console.error('Stripe Connect callback error:', error)
    return res.redirect(`${process.env.VITE_APP_URL || 'http://localhost:5173'}/settings?stripe_error=connection_failed`)
  }
}
