import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// This webhook handles StackDek subscription events (YOUR Stripe account)
// Separate from contractor payment webhooks

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_STACKDEK || process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for webhook verification
  },
};

// Helper to get raw body
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_STACKDEK || process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  console.log(`StackDek subscription webhook received:`, event.type);

  try {
    // Handle checkout.session.completed for new subscriptions
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only process if it's a subscription checkout (not one-time payment)
      if (session.mode !== 'subscription') {
        return res.status(200).json({ received: true, skipped: 'not_subscription' });
      }

      const companyId = session.metadata?.companyId;
      const planId = session.metadata?.planId || 'basic';
      
      if (!companyId) {
        console.error('No companyId in subscription session metadata');
        return res.status(400).json({ error: 'Missing companyId in metadata' });
      }

      // Mark subscription as active
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_status: 'active',
          subscription_plan: planId,
          subscription_stripe_subscription_id: session.subscription as string,
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      console.log('Successfully activated subscription:', {
        companyId,
        planId,
        subscriptionId: session.subscription,
      });

      return res.status(200).json({ 
        received: true, 
        companyId,
        subscriptionActivated: true,
      });
    }

    // Handle invoice.paid (recurring subscription payments)
    if (event.type === 'invoice.paid') {
      const invoice = event.data.object as Stripe.Invoice;
      
      // Only process subscription invoices
      if (!invoice.subscription) {
        return res.status(200).json({ received: true, skipped: 'not_subscription' });
      }

      // Get subscription to find companyId
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const companyId = subscription.metadata?.companyId;

      if (!companyId) {
        console.error('No companyId in subscription metadata');
        return res.status(400).json({ error: 'Missing companyId in metadata' });
      }

      // Update subscription status and period end
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_status: 'active',
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating subscription period:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      console.log('Successfully processed recurring payment:', {
        companyId,
        subscriptionId: invoice.subscription,
        periodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      });

      return res.status(200).json({ received: true, companyId });
    }

    // Handle invoice.payment_failed (payment failed)
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      
      if (!invoice.subscription) {
        return res.status(200).json({ received: true, skipped: 'not_subscription' });
      }

      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      const companyId = subscription.metadata?.companyId;

      if (!companyId) {
        console.error('No companyId in subscription metadata');
        return res.status(400).json({ error: 'Missing companyId in metadata' });
      }

      // Mark subscription as past due
      const { error: updateError } = await supabase
        .from('companies')
        .update({ subscription_status: 'past_due' })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error marking subscription past due:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      console.log('Marked subscription as past due:', { companyId });

      return res.status(200).json({ received: true, companyId, status: 'past_due' });
    }

    // Handle customer.subscription.deleted (subscription canceled)
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.companyId;

      if (!companyId) {
        console.error('No companyId in subscription metadata');
        return res.status(400).json({ error: 'Missing companyId in metadata' });
      }

      // Mark subscription as canceled
      const { error: updateError } = await supabase
        .from('companies')
        .update({ subscription_status: 'canceled' })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error marking subscription canceled:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      console.log('Marked subscription as canceled:', { companyId });

      return res.status(200).json({ received: true, companyId, status: 'canceled' });
    }

    // Handle customer.subscription.updated (plan change, etc.)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.companyId;
      const planId = subscription.metadata?.planId;

      if (!companyId) {
        return res.status(200).json({ received: true, skipped: 'no_company_id' });
      }

      // Update subscription details
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_status: subscription.status === 'active' ? 'active' : subscription.status as any,
          subscription_plan: planId || 'basic',
          subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      console.log('Updated subscription:', { companyId, status: subscription.status });

      return res.status(200).json({ received: true, companyId });
    }

    // Return 200 for other event types
    return res.status(200).json({ received: true, eventType: event.type });
  } catch (error: any) {
    console.error('StackDek subscription webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

