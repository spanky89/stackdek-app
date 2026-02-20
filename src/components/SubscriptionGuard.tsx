import React, { ReactNode } from 'react';
import { useSubscription } from '../hooks/useSubscription';
import { FeatureName, FEATURE_METADATA } from '../utils/featureGates';

interface SubscriptionGuardProps {
  feature: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

/**
 * Wrapper component that gates features behind subscription tiers
 * 
 * Usage:
 * <SubscriptionGuard feature="csv_export">
 *   <CSVExportButton />
 * </SubscriptionGuard>
 */
export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}) => {
  const { canAccessFeature, loading } = useSubscription();

  if (loading) {
    return null; // Or a loading spinner
  }

  const hasAccess = canAccessFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} />;
  }

  return null;
};

/**
 * Pro badge component to show on locked features
 */
export const ProBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded ${sizeClasses[size]}`}
    >
      PRO
    </span>
  );
};

/**
 * Upgrade prompt shown when user tries to access Pro feature
 */
export const UpgradePrompt: React.FC<{ feature: FeatureName }> = ({ feature }) => {
  const metadata = FEATURE_METADATA[feature];

  const handleUpgrade = () => {
    // Navigate to pricing page or open Stripe checkout
    window.location.href = '/pricing';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-6 text-center max-w-md mx-auto">
      <div className="flex justify-center mb-3">
        <ProBadge size="lg" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{metadata.name}</h3>
      <p className="text-gray-600 mb-4">{metadata.description}</p>
      <p className="text-sm text-gray-500 mb-4">
        Upgrade to <strong>Pro</strong> to unlock this feature and more.
      </p>
      <button
        onClick={handleUpgrade}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-2 px-6 rounded-lg transition"
      >
        Upgrade to Pro
      </button>
    </div>
  );
};

/**
 * Limit indicator for Free tier (e.g., "8/10 clients")
 */
export const LimitIndicator: React.FC<{
  used: number;
  max: number | null;
  label: string;
}> = ({ used, max, label }) => {
  if (max === null) {
    // Unlimited
    return (
      <div className="text-sm text-gray-600">
        <span className="font-semibold">{used}</span> {label}
      </div>
    );
  }

  const percentage = (used / max) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = used >= max;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-600">{label}</span>
        <span className={`font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-yellow-600' : 'text-gray-900'}`}>
          {used} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-blue-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {isAtLimit && (
        <p className="text-xs text-red-600 mt-1">
          Limit reached. <a href="/pricing" className="underline font-semibold">Upgrade to Pro</a> for unlimited.
        </p>
      )}
    </div>
  );
};

/**
 * Component to show locked feature with tooltip
 */
export const LockedFeatureButton: React.FC<{
  feature: FeatureName;
  children: ReactNode;
  onClick?: () => void;
}> = ({ feature, children, onClick }) => {
  const { canAccessFeature } = useSubscription();
  const hasAccess = canAccessFeature(feature);
  const metadata = FEATURE_METADATA[feature];

  if (hasAccess) {
    return <>{children}</>;
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default: navigate to pricing
      window.location.href = '/pricing';
    }
  };

  return (
    <div className="relative group inline-block">
      <button
        onClick={handleClick}
        className="relative opacity-50 cursor-not-allowed"
        disabled
        title={`${metadata.name} - Pro feature`}
      >
        {children}
        <div className="absolute top-0 right-0 -mt-1 -mr-1">
          <ProBadge size="sm" />
        </div>
      </button>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
          {metadata.name} - Upgrade to Pro
        </div>
      </div>
    </div>
  );
};
