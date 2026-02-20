import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { FEATURE_ACCESS, SubscriptionTier, FeatureName } from '../utils/featureGates';

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
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch company with subscription data
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (companyError) throw companyError;
      if (!company) {
        throw new Error('No company found for user');
      }

      // Parse subscription data
      const subData: SubscriptionData = {
        tier: company.subscription_tier || 'starter',
        status: company.subscription_status || 'active',
        stripeCustomerId: company.stripe_customer_id,
        stripeSubscriptionId: company.stripe_subscription_id,
        currentPeriodEnd: company.subscription_current_period_end
          ? new Date(company.subscription_current_period_end)
          : null,
        cancelAtPeriodEnd: company.subscription_cancel_at_period_end || false,
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
  }, [user?.id]);

  const canAccessFeature = (feature: FeatureName): boolean => {
    if (!subscription) return false;

    const tierFeatures = FEATURE_ACCESS[subscription.tier];
    return tierFeatures.features.includes(feature);
  };

  const isPro = subscription?.tier === 'pro';
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
