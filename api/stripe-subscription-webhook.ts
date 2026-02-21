/**
 * Stripe Subscription Webhook Handler
 * 
 * Handles Stripe webhooks for subscription lifecycle events:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 * 
 * Deploy to Vercel as: /api/stripe-subscription-webhook
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Initialize Supabase Admin client (bypass RLS)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin access
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Webhook endpoint secret for signature verification
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Map Stripe price IDs to subscription tiers
 */
const PRICE_TO_TIER: Record<string, 'free' | 'pro' | 'premium'> = {
  'price_pro_monthly': 'pro',
  'price_pro_yearly': 'pro',
  'price_premium_monthly': 'premium',
  'price_premium_yearly': 'premium',
  // Add actual Stripe price IDs here
};

/**
 * Main webhook handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log('✅ Webhook event received:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle subscription created/updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const subscriptionId = subscription.id;
  const priceId = subscription.items.data[0]?.price.id;
  const tier = PRICE_TO_TIER[priceId] || 'free';

  const updateData = {
    subscription_tier: tier,
    subscription_status: subscription.status,
    stripe_subscription_id: subscriptionId,
    subscription_plan_id: priceId,
    subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
    trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };

  const { error } = await supabaseAdmin
    .from('companies')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating company subscription:', error);
    throw error;
  }

  console.log(`✅ Updated subscription for customer ${customerId} to ${tier} (${subscription.status})`);
}

/**
 * Handle subscription deleted (canceled/expired)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      subscription_tier: 'free',
      subscription_status: 'canceled',
      subscription_cancel_at_period_end: false,
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error downgrading subscription:', error);
    throw error;
  }

  console.log(`✅ Downgraded customer ${customerId} to Free tier`);
}

/**
 * Handle successful payment (renew subscription, reset monthly limits)
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Reset monthly job count on successful payment (subscription renewal)
  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      monthly_jobs_count: 0,
      monthly_jobs_reset_date: new Date().toISOString().split('T')[0],
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error resetting monthly limits:', error);
    throw error;
  }

  console.log(`✅ Reset monthly limits for customer ${customerId}`);
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  const { error } = await supabaseAdmin
    .from('companies')
    .update({
      subscription_status: 'past_due',
    })
    .eq('stripe_customer_id', customerId);

  if (error) {
    console.error('Error updating payment failure:', error);
    throw error;
  }

  console.log(`⚠️ Marked subscription as past_due for customer ${customerId}`);

  // TODO: Send email notification to user about failed payment
}
