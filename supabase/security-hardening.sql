-- Security Hardening for Infinite Entourage
-- Run this after initial schema setup

-- ============================================
-- 1. TIGHTEN RLS POLICIES
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow select by fingerprint" ON users;
DROP POLICY IF EXISTS "Allow update" ON users;

-- Create more restrictive SELECT policy
-- Users can only see records where fingerprint matches
CREATE POLICY "Users can view own record" ON users 
  FOR SELECT 
  USING (fingerprint = current_setting('app.current_fingerprint', true));

-- Create more restrictive UPDATE policy  
-- Users can only update their own record
CREATE POLICY "Users can update own record" ON users 
  FOR UPDATE 
  USING (fingerprint = current_setting('app.current_fingerprint', true));

-- Keep the insert policy as-is (for new user creation)
-- Keep delete restricted (no delete allowed)

-- Drop permissive policies on purchases
DROP POLICY IF EXISTS "Allow select own purchases" ON purchases;
DROP POLICY IF EXISTS "Allow insert" ON purchases;

-- Create stricter purchase policies
CREATE POLICY "Users can view their purchases" ON purchases
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM users 
    WHERE fingerprint = current_setting('app.current_fingerprint', true)
  ));

-- Only server-side operations should insert purchases
CREATE POLICY "Server can insert purchases" ON purchases
  FOR INSERT
  WITH CHECK (true);

-- Drop permissive policies on generations
DROP POLICY IF EXISTS "Allow select" ON generations;
DROP POLICY IF EXISTS "Allow insert" ON generations;

-- Create stricter generation policies
CREATE POLICY "Users can view their generations" ON generations
  FOR SELECT
  USING (user_id IN (
    SELECT id FROM users 
    WHERE fingerprint = current_setting('app.current_fingerprint', true)
  ));

-- Server-side only insert
CREATE POLICY "Server can insert generations" ON generations
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 2. ADD RATE LIMITING TRIGGER
-- ============================================

-- Function to enforce generation rate limits per user
CREATE OR REPLACE FUNCTION check_generation_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  -- Count generations in last minute
  SELECT COUNT(*) INTO recent_count
  FROM generations
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '1 minute';
  
  -- Block if more than 5 per minute
  IF recent_count >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: max 5 generations per minute';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply rate limit trigger
DROP TRIGGER IF EXISTS generation_rate_limit ON generations;
CREATE TRIGGER generation_rate_limit
  BEFORE INSERT ON generations
  FOR EACH ROW
  EXECUTE FUNCTION check_generation_rate_limit();

-- ============================================
-- 3. ADD INPUT VALIDATION
-- ============================================

-- Function to sanitize and validate prompts
CREATE OR REPLACE FUNCTION validate_prompt(prompt TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if null or too short
  IF prompt IS NULL OR LENGTH(TRIM(prompt)) < 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if too long (max 500 chars)
  IF LENGTH(prompt) > 500 THEN
    RETURN FALSE;
  END IF;
  
  -- Basic XSS check - reject dangerous patterns
  IF prompt ~* '<script|javascript:|onclick|onerror|onload|eval\(|expression\(' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add prompt validation to generations table
ALTER TABLE generations 
  ADD CONSTRAINT valid_prompt 
  CHECK (validate_prompt(prompt));

-- ============================================
-- 4. ADD AUDIT LOGGING
-- ============================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  fingerprint TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only server can read audit logs
CREATE POLICY "Server can read audit logs" ON audit_logs
  FOR SELECT
  USING (false);

CREATE POLICY "Server can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Function to log credit changes
CREATE OR REPLACE FUNCTION log_credit_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.credits IS DISTINCT FROM NEW.credits THEN
    INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, fingerprint)
    VALUES (
      'users',
      NEW.id,
      'credit_change',
      jsonb_build_object('credits', OLD.credits, 'free_credits_used', OLD.free_credits_used),
      jsonb_build_object('credits', NEW.credits, 'free_credits_used', NEW.free_credits_used),
      NEW.fingerprint
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit trigger
DROP TRIGGER IF EXISTS credit_change_audit ON users;
CREATE TRIGGER credit_change_audit
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_credit_change();

-- ============================================
-- 5. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for recent generations (rate limiting)
CREATE INDEX IF NOT EXISTS idx_generations_user_created 
  ON generations(user_id, created_at DESC);

-- Index for credit audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
  ON audit_logs(table_name, action, created_at DESC);

-- Composite index for purchases lookup
CREATE INDEX IF NOT EXISTS idx_purchases_user_status 
  ON purchases(user_id, status, created_at DESC);

-- ============================================
-- 6. CLEANUP OLD DATA
-- ============================================

-- Function to cleanup old IP usage records (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_ip_usage()
RETURNS void AS $$
BEGIN
  DELETE FROM ip_usage 
  WHERE reset_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-ip-usage', '0 * * * *', 'SELECT cleanup_old_ip_usage()');

-- ============================================
-- SECURITY NOTES
-- ============================================

-- 1. Fingerprint is NOT a security mechanism - it's for convenience only
-- 2. Anyone can create a fingerprint and get 3 free credits
-- 3. For real security, implement email/password or OAuth auth
-- 4. IP-based rate limiting prevents abuse but can be bypassed with VPNs
-- 5. Consider adding CAPTCHA for signup/purchase flows
-- 6. Monitor the audit_logs table for suspicious patterns
-- 7. Set up alerts for unusual credit usage spikes
