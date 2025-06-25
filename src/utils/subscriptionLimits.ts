export interface SubscriptionLimits {
  saved_jobs: number; // -1 for unlimited
  ai_conversations: number; // -1 for unlimited
  voice_responses: boolean;
  advanced_filters: boolean;
  multi_language: boolean;
  priority_support: boolean;
  analytics_dashboard: boolean;
  interview_prep: boolean;
  career_roadmap: boolean;
  application_templates: boolean;
}

export const SUBSCRIPTION_LIMITS: Record<string, SubscriptionLimits> = {
  free: {
    saved_jobs: 5,
    ai_conversations: 0,
    voice_responses: false,
    advanced_filters: false,
    multi_language: false,
    priority_support: false,
    analytics_dashboard: false,
    interview_prep: false,
    career_roadmap: false,
    application_templates: false
  },
  professional: {
    saved_jobs: -1, // unlimited
    ai_conversations: 5,
    voice_responses: false,
    advanced_filters: true,
    multi_language: false,
    priority_support: true,
    analytics_dashboard: false,
    interview_prep: false,
    career_roadmap: false,
    application_templates: true
  },
  career_os: {
    saved_jobs: -1, // unlimited
    ai_conversations: -1, // unlimited
    voice_responses: true,
    advanced_filters: true,
    multi_language: true,
    priority_support: true,
    analytics_dashboard: true,
    interview_prep: true,
    career_roadmap: true,
    application_templates: true
  }
};

export const checkFeatureAccess = (userTier: string, feature: keyof SubscriptionLimits): boolean => {
  const limits = SUBSCRIPTION_LIMITS[userTier];
  if (!limits) return false;
  
  const featureValue = limits[feature];
  return featureValue !== false && featureValue !== 0;
};

export const getUsageLimit = (userTier: string, feature: keyof SubscriptionLimits): number => {
  const limits = SUBSCRIPTION_LIMITS[userTier];
  if (!limits) return 0;
  
  const featureValue = limits[feature];
  return typeof featureValue === 'number' ? featureValue : 0;
};

export const isUnlimited = (userTier: string, feature: keyof SubscriptionLimits): boolean => {
  const limit = getUsageLimit(userTier, feature);
  return limit === -1;
};

export const TIER_NAMES = {
  free: 'Starter',
  professional: 'Professional',
  career_os: 'Career OS'
};

export const TIER_PRICES = {
  professional: 4.99,
  career_os: 9.99
};

export const TIER_DESCRIPTIONS = {
  free: 'Perfect for getting started with your global career search',
  professional: 'For serious job seekers ready to accelerate their career',
  career_os: 'Complete career transformation with AI-powered guidance'
};