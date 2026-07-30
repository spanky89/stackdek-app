import { useState, useEffect } from 'react';
import { supabase } from '../api/supabaseClient';
import { FEATURE_ACCESS, SubscriptionTier, FeatureName } from '../utils/featureGates';
import { useAccess } from '../context/AccessContext';

export interface SubscriptionData {
  tier: SubscriptionTier;
  status: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
}

export interface SubscriptionHook {
  subscription: SubscriptionData | null;
  loading: boolean;
  error: Error | null;
  canAccessFeature: (feature: FeatureName) => boolean;
  refreshSubscription: () => Promise<void>;
  isPro: boolean;
  isStarter: boolean;
  isTrialing: boolean;
}

/**
 * Hook to access subscription data and feature gates
 * 
 * Usage:
 * const { isPro, canAccessFeature } = useSubscription();
 * 
 * if (!canAccessFeature('contract_signing')) {
 *   return <UpgradePrompt feature="Contract Signing" />;
 * }
 */
export function useSubscription(): SubscriptionHook {
  const { companyId } = useAccess();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptionData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!companyId) {
        throw new Error('No company found for user');
      }

      // Resolve the active company from AccessContext so managers use the
      // owner's subscription without receiving owner billing access.
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single();

      if (companyError) throw companyError;
      if (!company) {
        throw new Error('No company found for user');
      }

      // Parse subscription data
      const subData: SubscriptionData = {
        tier: company.subscription_plan === 'pro' ? 'pro' : 'starter',
        status: company.subscription_status === 'trial'
          ? 'trialing'
          : (company.subscription_status || 'canceled'),
        stripeCustomerId: company.subscription_stripe_customer_id,
        stripeSubscriptionId: company.subscription_stripe_subscription_id,
        currentPeriodEnd: company.subscription_current_period_end
          ? new Date(company.subscription_current_period_end)
          : null,
        cancelAtPeriodEnd: false,
        trialEndsAt: company.trial_ends_at ? new Date(company.trial_ends_at) : null,
      };

      setSubscription(subData);
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
    const { data } = supabase.auth.onAuthStateChange(() => fetchSubscriptionData());
    return () => data.subscription.unsubscribe();
  }, [companyId]);

  const canAccessFeature = (feature: FeatureName): boolean => {
    if (!subscription) return false;

    if (!['active', 'trialing'].includes(subscription.status)) return false;
    const tierFeatures = FEATURE_ACCESS[subscription.tier];
    return tierFeatures.features.includes(feature);
  };

  const isPro = subscription?.tier === 'pro'
    && ['active', 'trialing'].includes(subscription.status);
  const isStarter = subscription?.tier === 'starter';
  const isTrialing = subscription?.status === 'trialing';

  return {
    subscription,
    loading,
    error,
    canAccessFeature,
    refreshSubscription: fetchSubscriptionData,
    isPro,
    isStarter,
    isTrialing,
  };
}
