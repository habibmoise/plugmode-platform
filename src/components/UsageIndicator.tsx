import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { getUsageLimit, isUnlimited, TIER_NAMES } from '../utils/subscriptionLimits';

interface UsageIndicatorProps {
  feature: string;
  currentUsage: number;
  className?: string;
  showUpgradePrompt?: boolean;
}

export function UsageIndicator({ 
  feature, 
  currentUsage, 
  className = '',
  showUpgradePrompt = true 
}: UsageIndicatorProps) {
  const { subscriptionStatus } = useSubscription();
  const limit = getUsageLimit(subscriptionStatus.tier, feature as any);
  const unlimited = isUnlimited(subscriptionStatus.tier, feature as any);

  if (unlimited) {
    return (
      <div className={`text-sm text-green-600 ${className}`}>
        <span className="font-medium">Unlimited</span> • {TIER_NAMES[subscriptionStatus.tier]}
      </div>
    );
  }

  if (limit === 0) {
    return null;
  }

  const percentage = (currentUsage / limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = currentUsage >= limit;

  const getProgressColor = () => {
    if (isAtLimit) return 'bg-red-500';
    if (isNearLimit) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getTextColor = () => {
    if (isAtLimit) return 'text-red-600';
    if (isNearLimit) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-sm font-medium ${getTextColor()}`}>
          {currentUsage} / {limit} used
        </span>
        {isNearLimit && (
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
        )}
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>

      {isAtLimit && showUpgradePrompt && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-800 text-sm font-medium">Limit reached</p>
              <p className="text-red-600 text-xs">Upgrade to continue using this feature</p>
            </div>
            <Link
              to="/pricing"
              className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors flex items-center space-x-1"
            >
              <span>Upgrade</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}