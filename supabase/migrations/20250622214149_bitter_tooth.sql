/*
  # Phase 5: Subscription Management & Payment System

  1. New Tables
    - `user_subscriptions` - Track user subscription status and RevenueCat integration
    - `user_usage` - Track usage for tier limitations (saved jobs, AI conversations, etc.)
    - `subscription_events` - Log subscription events from RevenueCat webhooks

  2. Security
    - Enable RLS on all new tables
    - Add policies for users to manage their own subscription data
    - Add policies for webhook processing

  3. Indexes
    - Optimize subscription and usage queries
    - Support efficient usage tracking and limits
*/

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'professional', 'career_os')),
  revenuecat_customer_id TEXT,
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'paused')),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create user_usage table for tracking tier limitations
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL, -- 'saved_jobs', 'ai_conversations', 'job_views', 'applications'
  usage_count INTEGER DEFAULT 1,
  reset_date DATE DEFAULT CURRENT_DATE, -- Monthly reset on the 1st
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, usage_type, reset_date)
);

-- Create subscription_events table for RevenueCat webhook events
CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'subscription_started', 'renewed', 'cancelled', 'expired'
  subscription_tier TEXT,
  revenuecat_event_id TEXT UNIQUE,
  revenuecat_customer_id TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- User subscriptions policies
CREATE POLICY "Users can read own subscription"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON user_subscriptions
  FOR ALL
  TO service_role
  USING (true);

-- User usage policies
CREATE POLICY "Users can read own usage"
  ON user_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own usage"
  ON user_usage
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage"
  ON user_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage"
  ON user_usage
  FOR ALL
  TO service_role
  USING (true);

-- Subscription events policies
CREATE POLICY "Service role can manage subscription events"
  ON subscription_events
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Users can read own subscription events"
  ON subscription_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_revenuecat_id ON user_subscriptions(revenuecat_customer_id);

CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_type ON user_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_user_usage_reset_date ON user_usage(reset_date);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_type_date ON user_usage(user_id, usage_type, reset_date);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user_id ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_revenuecat_id ON subscription_events(revenuecat_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_customer_id ON subscription_events(revenuecat_customer_id);

-- Function to increment user usage
CREATE OR REPLACE FUNCTION increment_user_usage(
  p_user_id UUID,
  p_usage_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
  current_usage INTEGER;
BEGIN
  -- Insert or update usage for current month
  INSERT INTO user_usage (user_id, usage_type, usage_count, reset_date)
  VALUES (p_user_id, p_usage_type, p_increment, DATE_TRUNC('month', CURRENT_DATE)::DATE)
  ON CONFLICT (user_id, usage_type, reset_date)
  DO UPDATE SET 
    usage_count = user_usage.usage_count + p_increment,
    updated_at = NOW();

  -- Return current usage count
  SELECT usage_count INTO current_usage
  FROM user_usage
  WHERE user_id = p_user_id 
    AND usage_type = p_usage_type 
    AND reset_date = DATE_TRUNC('month', CURRENT_DATE)::DATE;

  RETURN COALESCE(current_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user usage for current month
CREATE OR REPLACE FUNCTION get_user_usage(
  p_user_id UUID,
  p_usage_type TEXT
) RETURNS INTEGER AS $$
DECLARE
  current_usage INTEGER;
BEGIN
  SELECT usage_count INTO current_usage
  FROM user_usage
  WHERE user_id = p_user_id 
    AND usage_type = p_usage_type 
    AND reset_date = DATE_TRUNC('month', CURRENT_DATE)::DATE;

  RETURN COALESCE(current_usage, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can perform action based on subscription tier
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_user_id UUID,
  p_usage_type TEXT,
  p_requested_amount INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  user_tier TEXT;
  current_usage INTEGER;
  tier_limit INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(subscription_tier, 'free') INTO user_tier
  FROM user_subscriptions
  WHERE user_id = p_user_id;

  -- If no subscription record, default to free
  IF user_tier IS NULL THEN
    user_tier := 'free';
  END IF;

  -- Get current usage
  current_usage := get_user_usage(p_user_id, p_usage_type);

  -- Define tier limits
  tier_limit := CASE
    WHEN user_tier = 'free' AND p_usage_type = 'saved_jobs' THEN 5
    WHEN user_tier = 'free' AND p_usage_type = 'ai_conversations' THEN 0
    WHEN user_tier = 'professional' AND p_usage_type = 'saved_jobs' THEN -1 -- unlimited
    WHEN user_tier = 'professional' AND p_usage_type = 'ai_conversations' THEN 5
    WHEN user_tier = 'career_os' THEN -1 -- unlimited for all features
    ELSE -1 -- default to unlimited
  END;

  -- Check if within limits (-1 means unlimited)
  IF tier_limit = -1 THEN
    RETURN TRUE;
  END IF;

  RETURN (current_usage + p_requested_amount) <= tier_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default subscription records for existing users
INSERT INTO user_subscriptions (user_id, subscription_tier, subscription_status)
SELECT id, 'free', 'active'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- Create trigger to automatically create subscription record for new users
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, subscription_tier, subscription_status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_user_subscription ON users;
CREATE TRIGGER trigger_create_user_subscription
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_subscription();