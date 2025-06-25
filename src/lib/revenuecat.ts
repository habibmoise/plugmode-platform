import * as Purchases from '@revenuecat/purchases-js';

export interface SubscriptionStatus {
  isProfessional: boolean;
  isCareerOS: boolean;
  tier: 'free' | 'professional' | 'career_os';
  expirationDate?: string;
  willRenew?: boolean;
}

export class RevenueCatService {
  private static instance: RevenueCatService;
  private initialized = false;

  static getInstance(): RevenueCatService {
    if (!RevenueCatService.instance) {
      RevenueCatService.instance = new RevenueCatService();
    }
    return RevenueCatService.instance;
  }

  async initialize(userId: string): Promise<void> {
    if (this.initialized) return;

    try {
      const apiKey = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY;
      if (!apiKey) {
        console.warn('RevenueCat API key not found');
        return;
      }

      await Purchases.configure({ apiKey });
      await Purchases.logIn(userId);
      this.initialized = true;
      console.log('RevenueCat initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RevenueCat:', error);
    }
  }

  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      if (!this.initialized) {
        return this.getDefaultStatus();
      }

      const customerInfo = await Purchases.getCustomerInfo();
      const activeEntitlements = customerInfo.entitlements.active;

      const isProfessional = activeEntitlements['professional'] !== undefined;
      const isCareerOS = activeEntitlements['career_os'] !== undefined;

      return {
        isProfessional,
        isCareerOS,
        tier: this.determineTier(customerInfo),
        expirationDate: this.getExpirationDate(customerInfo),
        willRenew: this.getWillRenew(customerInfo)
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return this.getDefaultStatus();
    }
  }

  async getOfferings() {
    try {
      if (!this.initialized) return null;
      return await Purchases.getOfferings();
    } catch (error) {
      console.error('Error getting offerings:', error);
      return null;
    }
  }

  async purchasePackage(packageToPurchase: any) {
    try {
      if (!this.initialized) throw new Error('RevenueCat not initialized');
      
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      return customerInfo;
    } catch (error) {
      console.error('Error purchasing package:', error);
      throw error;
    }
  }

  async restorePurchases() {
    try {
      if (!this.initialized) throw new Error('RevenueCat not initialized');
      
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    } catch (error) {
      console.error('Error restoring purchases:', error);
      throw error;
    }
  }

  private determineTier(customerInfo: any): 'free' | 'professional' | 'career_os' {
    const activeEntitlements = customerInfo.entitlements.active;
    
    if (activeEntitlements['career_os']) return 'career_os';
    if (activeEntitlements['professional']) return 'professional';
    return 'free';
  }

  private getExpirationDate(customerInfo: any): string | undefined {
    const activeEntitlements = customerInfo.entitlements.active;
    const entitlement = activeEntitlements['career_os'] || activeEntitlements['professional'];
    
    return entitlement?.expirationDate;
  }

  private getWillRenew(customerInfo: any): boolean {
    const activeEntitlements = customerInfo.entitlements.active;
    const entitlement = activeEntitlements['career_os'] || activeEntitlements['professional'];
    
    return entitlement?.willRenew || false;
  }

  private getDefaultStatus(): SubscriptionStatus {
    return {
      isProfessional: false,
      isCareerOS: false,
      tier: 'free'
    };
  }
}

export const revenueCatService = RevenueCatService.getInstance();