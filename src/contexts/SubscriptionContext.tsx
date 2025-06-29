// src/contexts/SubscriptionContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface SubscriptionTier {
  id: 'free' | 'professional' | 'career_os';
  name: string;
  price: number;
  features: string[];
  limits: {
    jobViews: number; // -1 for unlimited
    aiConversations: number;
    savedJobs: number;
    voiceResponses: boolean;
    multiLanguage: boolean;
    marketInsights: boolean;
  };
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Starter',
    price: 0,
    features: [
      'Browse 10 jobs per week',
      '5 AI coaching conversations per month',
      'Basic job matching',
      'Email job alerts'
    ],
    limits: {
      jobViews: 10,
      aiConversations: 5,
      savedJobs: 5,
      voiceResponses: false,
      multiLanguage: false,
      marketInsights: false,
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 4.99,
    features: [
      'Unlimited job browsing',
      '50 AI coaching conversations per month',
      'Advanced job matching',
      'Priority job alerts',
      'Resume optimization'
    ],
    limits: {
      jobViews: -1,
      aiConversations: 50,
      savedJobs: -1,
      voiceResponses: true,
      multiLanguage: false,
      marketInsights: true,
    },
  },
  career_os: {
    id: 'career_os',
    name: 'Career OS',
    price: 9.99,
    features: [
      'Everything in Professional',
      'Unlimited AI coaching',
      'Voice-enabled responses',
      'Multi-language support',
      'Advanced market insights',
      'Priority support'
    ],
    limits: {
      jobViews: -1,
      aiConversations: -1,
      savedJobs: -1,
      voiceResponses: true,
      multiLanguage: true,
      marketInsights: true,
    },
  },
};

interface SubscriptionStatus {
  tier: 'free' | 'professional' | 'career_os';
  status: 'active' | 'inactive' | 'pending';
  periodEnd: Date | null;
  tierData: SubscriptionTier;
}

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus;
  loading: boolean;
  checkUsageLimit: (usageType: string) => Promise<{ canUse: boolean; remaining: number; limit: number }>;
  incrementUsage: (usageType: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    tier: 'free',
    status: 'active',
    periodEnd: null,
    tierData: SUBSCRIPTION_TIERS.free,
  });
  const [loading, setLoading] = useState(true);

  const getUserSubscription = async (userId: string): Promise<SubscriptionStatus> => {
    try {
      const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        return {
          tier: 'free',
          status: 'active',
          periodEnd: null,
          tierData: SUBSCRIPTION_TIERS.free,
        };
      }

      if (!subscription) {
        // Create default free subscription
        await supabase.from('user_subscriptions').insert({
          user_id: userId,
          subscription_tier: 'free',
          subscription_status: 'active',
        });

        return {
          tier: 'free',
          status: 'active',
          periodEnd: null,
          tierData: SUBSCRIPTION_TIERS.free,
        };
      }

      const tier = subscription.subscription_tier as 'free' | 'professional' | 'career_os';
      return {
        tier,
        status: subscription.subscription_status,
        periodEnd: subscription.current_period_end ? new Date(subscription.current_period_end) : null,
        tierData: SUBSCRIPTION_TIERS[tier],
      };
    } catch (error) {
      console.error('Failed to get user subscription:', error);
      return {
        tier: 'free',
        status: 'active',
        periodEnd: null,
        tierData: SUBSCRIPTION_TIERS.free,
      };
    }
  };

  const checkUsageLimit = async (usageType: string): Promise<{ canUse: boolean; remaining: number; limit: number }> => {
    if (!user) return { canUse: false, remaining: 0, limit: 0 };

    try {
      const subscription = await getUserSubscription(user.id);
      const limit = subscription.tierData.limits[usageType as keyof typeof subscription.tierData.limits];
      
      if (typeof limit === 'boolean') {
        return { canUse: limit, remaining: limit ? -1 : 0, limit: limit ? -1 : 0 };
      }
      
      if (limit === -1) return { canUse: true, remaining: -1, limit: -1 }; // Unlimited
      
      // Get current usage
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const { data: usage } = await supabase
        .from('user_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .eq('usage_type', usageType)
        .gte('reset_date', startOfMonth.toISOString())
        .single();

      const currentUsage = usage?.usage_count || 0;
      const remaining = Math.max(0, limit - currentUsage);
      
      return {
        canUse: remaining > 0,
        remaining,
        limit: limit as number
      };
    } catch (error) {
      console.error('Failed to check usage limit:', error);
      return { canUse: true, remaining: -1, limit: -1 };
    }
  };

  const incrementUsage = async (usageType: string): Promise<void> => {
    if (!user) return;

    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      
      // Get current usage
      const { data: existingUsage } = await supabase
        .from('user_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .eq('usage_type', usageType)
        .eq('reset_date', startOfMonth.toISOString())
        .single();

      if (existingUsage) {
        // Update existing usage
        await supabase
          .from('user_usage')
          .update({ usage_count: existingUsage.usage_count + 1 })
          .eq('user_id', user.id)
          .eq('usage_type', usageType)
          .eq('reset_date', startOfMonth.toISOString());
      } else {
        // Create new usage record
        await supabase
          .from('user_usage')
          .insert({
            user_id: user.id,
            usage_type: usageType,
            usage_count: 1,
            reset_date: startOfMonth.toISOString()
          });
      }
    } catch (error) {
      console.error('Failed to increment usage:', error);
    }
  };

  const refreshSubscription = async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    const status = await getUserSubscription(user.id);
    setSubscriptionStatus(status);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      refreshSubscription();
    } else {
      setSubscriptionStatus({
        tier: 'free',
        status: 'active',
        periodEnd: null,
        tierData: SUBSCRIPTION_TIERS.free,
      });
      setLoading(false);
    }
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscriptionStatus,
        loading,
        checkUsageLimit,
        incrementUsage,
        refreshSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};