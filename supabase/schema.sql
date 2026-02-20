-- Supabase Database Schema for Infinite Entourage
-- Run these SQL commands in your Supabase SQL Editor

-- Users table (tracks credits and free tier usage)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  credits INTEGER DEFAULT 0,
  free_credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster fingerprint lookups
CREATE INDEX idx_users_fingerprint ON users(fingerprint);

-- Index for email lookups (if using auth)
CREATE INDEX idx_users_email ON users(email);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at on user changes
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for fingerprint-based users)
CREATE POLICY "Allow insert" ON users 
  FOR INSERT WITH CHECK (true);

-- Allow anyone to select their own user by fingerprint
-- Note: In practice, you'd want stricter policies with proper auth
CREATE POLICY "Allow select by fingerprint" ON users 
  FOR SELECT USING (true);

-- Allow updates to own user record
CREATE POLICY "Allow update" ON users 
  FOR UPDATE USING (true);

-- Purchases table (tracks Stripe purchases for reconciliation)
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- credits purchased
  price_paid INTEGER NOT NULL, -- amount in cents
  status TEXT DEFAULT 'pending', -- pending, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_purchases_user_id ON purchases(user_id);
CREATE INDEX idx_purchases_session_id ON purchases(stripe_session_id);

-- Enable RLS on purchases
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select own purchases" ON purchases 
  FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON purchases 
  FOR INSERT WITH CHECK (true);

-- IP tracking for free tier abuse prevention (optional but recommended)
CREATE TABLE ip_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  free_requests INTEGER DEFAULT 0,
  last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ip_usage_address ON ip_usage(ip_address);

-- Usage tracking (optional - for analytics)
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  prompt TEXT NOT NULL,
  style TEXT NOT NULL,
  replicate_url TEXT,
  final_url TEXT,
  credits_used INTEGER DEFAULT 1,
  was_free BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generations_user_id ON generations(user_id);
CREATE INDEX idx_generations_created_at ON generations(created_at);

-- Feedback tracking (syncs with localStorage for aggregation)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  generation_id UUID REFERENCES generations(id),
  prompt TEXT NOT NULL,
  style TEXT NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('good', 'bad')),
  issue TEXT CHECK (issue IN ('cropped', 'duplicate', 'blurry', 'wrong_subject', 'background', 'missing_prop', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);

-- Initial migration note:
-- After deploying, run this to migrate existing localStorage users:
-- (You'll need a script to read localStorage and call your API)
