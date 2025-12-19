-- Migration: Admin Monitoring Features
-- Created: 2025-01-19
-- Description: Adds session tracking, error severity, and enhanced admin monitoring

-- 1. Add severity column to app_logs
ALTER TABLE app_logs ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'INFO';

-- 2. Create user_sessions table for tracking session duration
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  session_type TEXT CHECK (session_type IN ('voice', 'chat')),
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_app_logs_severity ON app_logs(severity);
CREATE INDEX IF NOT EXISTS idx_app_logs_event_type ON app_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_user_id ON app_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_assistant ON user_sessions(assistant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started ON user_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_ended ON user_sessions(ended_at DESC);

-- 4. Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for user_sessions
-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all sessions (using profiles table role check)
CREATE POLICY "Admins can view all sessions"
  ON user_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Users can insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. Create API health monitoring table
CREATE TABLE IF NOT EXISTS api_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  status TEXT CHECK (status IN ('healthy', 'degraded', 'down')),
  last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  response_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_health_provider ON api_health(provider);
CREATE INDEX IF NOT EXISTS idx_api_health_last_check ON api_health(last_check DESC);

-- 7. Enable RLS on api_health (admin only)
ALTER TABLE api_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view API health"
  ON api_health FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert API health"
  ON api_health FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 8. Add comment for documentation
COMMENT ON TABLE user_sessions IS 'Tracks user session duration and activity for analytics';
COMMENT ON TABLE api_health IS 'Monitors API provider health status for fallback management';
COMMENT ON COLUMN app_logs.severity IS 'Severity level: INFO, WARNING, ERROR, CRITICAL';
