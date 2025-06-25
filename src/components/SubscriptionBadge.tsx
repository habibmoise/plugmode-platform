import React from 'react';
import { Crown, Star, Zap } from 'lucide-react';
import { TIER_NAMES } from '../utils/subscriptionLimits';

interface SubscriptionBadgeProps {
  tier: string;
  className?: string;
  showIcon?: boolean;
}

export function SubscriptionBadge({ tier, className = '', showIcon = true }: SubscriptionBadgeProps) {
  const getBadgeConfig = (tier: string) => {
    switch (tier) {
      case 'professional':
        return {
          icon: Star,
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          name: TIER_NAMES.professional
        };
      case 'career_os':
        return {
          icon: Crown,
          color: 'bg-purple-100 text-purple-800 border-purple-200',
          name: TIER_NAMES.career_os
        };
      default:
        return {
          icon: Zap,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          name: TIER_NAMES.free
        };
    }
  };

  const config = getBadgeConfig(tier);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.color} ${className}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.name}</span>
    </span>
  );
}