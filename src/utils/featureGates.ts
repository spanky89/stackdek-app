/**
 * Feature Gates & Subscription Tiers
 * 
 * Defines which features are available to each subscription tier
 */

export type SubscriptionTier = 'starter' | 'pro';

export type FeatureName =
  | 'contract_signing'
  | 'multi_user'
  | 'job_costing'
  | 'marketing_automation';

export interface TierFeatures {
  features: FeatureName[];
}

/**
 * Subscription tier feature access
 * Note: Both tiers have unlimited clients and jobs
 */
export const FEATURE_ACCESS: Record<SubscriptionTier, TierFeatures> = {
  starter: {
    features: [], // Starter has no Pro features
  },
  pro: {
    features: [
      'contract_signing',
      'multi_user',
      'job_costing',
      'marketing_automation',
    ],
  },
};

/**
 * Feature metadata for UI display
 */
export const FEATURE_METADATA: Record<FeatureName, { name: string; description: string }> = {
  contract_signing: {
    name: 'Contract Sending & E-Signature',
    description: 'Send contracts and collect digital signatures from clients',
  },
  multi_user: {
    name: 'Multi-User Access',
    description: 'Add team members with role-based permissions',
  },
  job_costing: {
    name: 'Job Costing',
    description: 'Track materials, labor, and profit margins per job',
  },
  marketing_automation: {
    name: 'Marketing Suite',
    description: 'Email campaigns, drip sequences, and SMS marketing',
  },
};

/**
 * Pricing plans (for UI display)
 */
export const PRICING_PLANS = {
  starter: {
    name: 'Starter',
    price: '$29/mo',
    priceId: null, // Free tier
    features: [
      'Unlimited clients',
      'Unlimited jobs',
      'Quote management',
      'Invoicing',
      'Job scheduling',
      'Client management',
      'Basic reporting',
    ],
  },
  pro: {
    name: 'Pro',
    price: '$69/mo',
    priceId: 'price_pro_monthly', // Replace with actual Stripe price ID
    features: [
      'Everything in Starter',
      'Contract sending & e-signature',
      'Multi-user access (team logins)',
      'Job costing & profit tracking',
      'Full marketing suite',
      'Priority support',
    ],
  },
};

/**
 * Helper to check if feature requires Pro
 */
export function isProFeature(feature: FeatureName): boolean {
  return FEATURE_ACCESS.pro.features.includes(feature);
}

/**
 * Helper to get required tier for a feature
 */
export function getRequiredTier(feature: FeatureName): SubscriptionTier {
  return isProFeature(feature) ? 'pro' : 'starter';
}
