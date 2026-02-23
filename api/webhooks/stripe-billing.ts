import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// StackDek's own Stripe instance (for platform billing)
const stripe = new Stripe(process.env.STACKDEK_STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export const config = {
  api: {
    bodyParser: false,
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

  try {
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'] as string;

    // Verify webhook signature using StackDek's webhook secret
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody, 
        sig, 
        process.env.STACKDEK_STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    console.log(`StackDek billing webhook received:`, event.type);

    // Handle checkout.session.completed (initial subscription purchase)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.mode === 'subscription') {
        const companyId = session.metadata?.companyId;
        const plan = session.metadata?.plan;
        
        if (!companyId || !plan) {
          console.error('Missing metadata in checkout session');
          return res.status(400).json({ error: 'Missing metadata' });
        }

        // Get the subscription object
        const subscriptionId = session.subscription as string;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        // Update company subscription status
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            subscription_plan: plan,
            subscription_status: 'active',
            subscription_stripe_subscription_id: subscriptionId,
            subscription_stripe_customer_id: session.customer as string,
            subscription_started_at: new Date(subscription.created * 1000).toISOString(),
            subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('id', companyId);

        if (updateError) {
          console.error('Error updating company subscription:', updateError);
          return res.status(500).json({ error: 'Failed to update subscription' });
        }

        console.log(`Subscription activated for company ${companyId}, plan: ${plan}`);

        return res.status(200).json({ 
          received: true, 
          companyId,
          plan,
          subscriptionId 
        });
      }
    }

    // Handle subscription updates (renewals, plan changes)
    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.companyId;

      if (!companyId) {
        console.error('No companyId in subscription metadata');
        return res.status(400).json({ error: 'Missing companyId in metadata' });
      }

      // Determine status
      let status = 'inactive';
      if (subscription.status === 'active') status = 'active';
      else if (subscription.status === 'past_due') status = 'past_due';
      else if (subscription.status === 'canceled') status = 'canceled';

      // Update subscription
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_status: status,
          subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return res.status(500).json({ error: 'Failed to update subscription' });
      }

      console.log(`Subscription updated for company ${companyId}, status: ${status}`);
    }

    // Handle subscription deletion/cancellation
    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const companyId = subscription.metadata?.companyId;

      if (!companyId) {
        console.error('No companyId in subscription metadata');
        return res.status(400).json({ error: 'Missing companyId in metadata' });
      }

      // Mark as canceled, but keep expiration date (grace period until period end)
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          subscription_status: 'canceled',
          subscription_expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('id', companyId);

      if (updateError) {
        console.error('Error canceling subscription:', updateError);
        return res.status(500).json({ error: 'Failed to cancel subscription' });
      }

      console.log(`Subscription canceled for company ${companyId}`);
    }

    // Handle failed payments
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      // Find company by customer ID
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('subscription_stripe_customer_id', customerId)
        .single();

      if (company) {
        await supabase
          .from('companies')
          .update({ subscription_status: 'past_due' })
          .eq('id', company.id);

        console.log(`Payment failed for company ${company.id}`);
      }
    }

    // Return 200 for all events
    return res.status(200).json({ received: true, eventType: event.type });
  } catch (error: any) {
    console.error('Billing webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

