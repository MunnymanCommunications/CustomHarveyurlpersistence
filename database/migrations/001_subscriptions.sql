-- Subscription Management Schema
-- This SQL creates the necessary tables and policies for managing user subscriptions

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price_monthly INTEGER NOT NULL, -- Price in cents
    price_annual INTEGER NOT NULL, -- Price in cents
    memory_limit INTEGER, -- NULL means unlimited
    assistant_limit INTEGER, -- NULL means unlimited
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'active', -- active, canceled, past_due, trialing
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create usage_tracking table to track memory and assistant counts
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_count INTEGER DEFAULT 0,
    assistant_count INTEGER DEFAULT 0,
    first_memory_added_at TIMESTAMP WITH TIME ZONE,
    shown_first_memory_congrats BOOLEAN DEFAULT FALSE,
    shown_upgrade_prompt BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, price_monthly, price_annual, memory_limit, assistant_limit, features)
VALUES
    ('free', 'Free', 0, 0, 5, 1, '{"memory_limit": 5, "assistant_limit": 1, "includes_harvey": true}'),
    ('pro', 'Pro', 3000, 30500, NULL, NULL, '{"memory_limit": "unlimited", "assistant_limit": "unlimited", "priority_support": true}')
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_tiers (read-only for all authenticated users)
CREATE POLICY "Anyone can view subscription tiers"
    ON subscription_tiers FOR SELECT
    TO authenticated
    USING (true);

-- Policies for user_subscriptions
CREATE POLICY "Users can view their own subscription"
    ON user_subscriptions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
    ON user_subscriptions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
    ON user_subscriptions FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policies for usage_tracking
CREATE POLICY "Users can view their own usage"
    ON usage_tracking FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage"
    ON usage_tracking FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage"
    ON usage_tracking FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Create function to auto-create free subscription on user signup
CREATE OR REPLACE FUNCTION create_free_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create free subscription
    INSERT INTO user_subscriptions (user_id, tier_id, status)
    VALUES (NEW.id, 'free', 'active');

    -- Initialize usage tracking
    INSERT INTO usage_tracking (user_id, memory_count, assistant_count)
    VALUES (NEW.id, 0, 0);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create subscription on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_free_subscription_for_new_user();

-- Create function to update usage tracking timestamp
CREATE OR REPLACE FUNCTION update_usage_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update timestamp
DROP TRIGGER IF EXISTS update_usage_tracking_timestamp ON usage_tracking;
CREATE TRIGGER update_usage_tracking_timestamp
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_usage_tracking_timestamp();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);

-- Add subscription columns to profiles if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='profiles' AND column_name='subscription_tier') THEN
        ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
    END IF;
END $$;
