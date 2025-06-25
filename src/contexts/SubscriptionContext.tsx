import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { revenueCatService, SubscriptionStatus } from '../lib/revenuecat';
import { supabase } from '../lib/supabase';

interface SubscriptionContextType {
  subscriptionStatus: SubscriptionStatus;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  initializePurchases: () => Promise<void>;
  userUsage: Record<string, number>;
  refreshUsage: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    isProfessional: false,
    isCareerOS: false,
    tier: 'free'
  });
  const [loading, setLoading] = useState(true);
  const [userUsage, setUserUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      initializePurchases();
      loadUserUsage();
    }
  }, [user]);

  const initializePurchases = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await revenueCatService.initialize(user.id);
      await refreshSubscription();
    } catch (error) {
      console.error('Error initializing purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshSubscription = async () => {
    try {
      const status = await revenueCatService.getSubscriptionStatus();
      setSubscriptionStatus(status);

      // Update subscription in database
      if (user) {
        await updateSubscriptionInDatabase(status);
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  const updateSubscriptionInDatabase = async (status: SubscriptionStatus) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: user.id,
          subscription_tier: status.tier,
          subscription_status: 'active',
          current_period_end: status.expirationDate,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating subscription in database:', error);
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
    }
  };

  const loadUserUsage = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('usage_type, usage_count')
        .eq('user_id', user.id)
        .gte('reset_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      if (error) {
        console.error('Error loading user usage:', error);
        return;
      }

      const usage: Record<string, number> = {};
      data?.forEach(item => {
        usage[item.usage_type] = item.usage_count;
      });

      setUserUsage(usage);
    } catch (error) {
      console.error('Error loading user usage:', error);
    }
  };

  const refreshUsage = async () => {
    await loadUserUsage();
  };

  const value = {
    subscriptionStatus,
    loading,
    refreshSubscription,
    initializePurchases,
    userUsage,
    refreshUsage
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}