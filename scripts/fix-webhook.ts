/**
 * One-time script: Add webhook to existing Stripe Connect account
 * Run: npx tsx scripts/fix-webhook.ts
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const stripeSecret = process.env.STRIPE_CONNECT_CLIENT_SECRET || ''

if (!supabaseUrl || !supabaseKey || !stripeSecret) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const stripe = new Stripe(stripeSecret, { apiVersion: '2025-02-24.acacia' })

async function main() {
  // Get all companies with Stripe connected
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name, stripe_connected_account_id, stripe_webhook_secret')
    .not('stripe_connected_account_id', 'is', null)

  if (error) {
    console.error('Error fetching companies:', error)
    process.exit(1)
  }

  console.log(`Found ${companies.length} companies with Stripe connected\n`)

  for (const company of companies) {
    console.log(`Processing: ${company.name} (${company.id})`)

    if (company.stripe_webhook_secret) {
      console.log('  ✓ Webhook already exists\n')
      continue
    }

    try {
      const webhookUrl = `https://app.stackdek.com/api/webhooks/stripe?companyId=${company.id}`
      
      const webhookEndpoint = await stripe.webhookEndpoints.create({
        url: webhookUrl,
        enabled_events: ['checkout.session.completed'],
        connect: true,
      }, {
        stripeAccount: company.stripe_connected_account_id,
      })

      // Save webhook secret to database
      const { error: updateError } = await supabase
        .from('companies')
        .update({ stripe_webhook_secret: webhookEndpoint.secret })
        .eq('id', company.id)

      if (updateError) {
        console.error('  ✗ Failed to save webhook secret:', updateError.message)
      } else {
        console.log(`  ✓ Created webhook: ${webhookEndpoint.id}`)
        console.log(`  ✓ URL: ${webhookUrl}\n`)
      }
    } catch (err: any) {
      console.error(`  ✗ Failed to create webhook: ${err.message}\n`)
    }
  }

  console.log('Done!')
}

main()
