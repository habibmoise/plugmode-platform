import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Crown, Star, ArrowRight } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { checkFeatureAccess, TIER_NAMES, TIER_PRICES } from '../utils/subscriptionLimits';

interface FeatureGateProps {
  feature: string;
  requiredTier: 'professional' | 'career_os';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGate({ 
  feature, 
  requiredTier, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { subscriptionStatus } = useSubscription();
  const hasAccess = checkFeatureAccess(subscriptionStatus.tier, feature as any);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const getUpgradeConfig = () => {
    if (requiredTier === 'career_os') {
      return {
        icon: Crown,
        color: 'from-purple-500 to-purple-600',
        borderColor: 'border-purple-200',
        bgColor: 'bg-purple-50',
        textColor: 'text-purple-800',
        tier: 'Career OS',
        price: TIER_PRICES.career_os
      };
    } else {
      return {
        icon: Star,
        color: 'from-blue-500 to-blue-600',
        borderColor: 'border-blue-200',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-800',
        tier: 'Professional',
        price: TIER_PRICES.professional
      };
    }
  };

  const config = getUpgradeConfig();
  const Icon = config.icon;

  return (
    <div className={`${config.bgColor} ${config.borderColor} border rounded-lg p-6 text-center`}>
      <div className="flex items-center justify-center mb-4">
        <div className={`bg-gradient-to-r ${config.color} p-3 rounded-full`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      
      <h3 className={`text-lg font-semibold ${config.textColor} mb-2`}>
        Unlock {config.tier} Features
      </h3>
      
      <p className="text-gray-600 mb-4">
        This feature is available with {config.tier} subscription starting at ${config.price}/month.
      </p>
      
      <Link
        to="/pricing"
        className={`inline-flex items-center space-x-2 bg-gradient-to-r ${config.color} text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity font-medium`}
      >
        <span>Upgrade to {config.tier}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}