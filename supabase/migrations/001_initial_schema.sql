-- Visor App Database Schema
-- Run this migration in Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  fid INTEGER,
  points INTEGER DEFAULT 0,
  nft_count INTEGER DEFAULT 0,
  referral_count INTEGER DEFAULT 0,
  is_whitelisted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_address TEXT NOT NULL,
  referred_address TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (referrer_address) REFERENCES users(wallet_address),
  FOREIGN KEY (referred_address) REFERENCES users(wallet_address)
);

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_address);

-- Points log table (for audit trail)
CREATE TABLE IF NOT EXISTS points_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

-- Create index for points log
CREATE INDEX IF NOT EXISTS idx_points_log_wallet ON points_log(wallet_address);

-- Function to increment referral count
CREATE OR REPLACE FUNCTION increment_referral_count(wallet TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET referral_count = referral_count + 1,
      updated_at = NOW()
  WHERE wallet_address = wallet;
END;
$$ LANGUAGE plpgsql;

-- Function to update NFT count and add points
CREATE OR REPLACE FUNCTION record_nft_mint(wallet TEXT, mint_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET nft_count = nft_count + mint_count,
      points = points + (mint_count * 100000),
      updated_at = NOW()
  WHERE wallet_address = wallet;
  
  -- Log the points
  INSERT INTO points_log (wallet_address, amount, reason)
  VALUES (wallet, mint_count * 100000, 'nft_mint');
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can read all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own record" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (true);

-- RLS Policies for referrals
CREATE POLICY "Anyone can read referrals" ON referrals
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert referrals" ON referrals
  FOR INSERT WITH CHECK (true);

-- RLS Policies for points_log
CREATE POLICY "Anyone can read points_log" ON points_log
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert points_log" ON points_log
  FOR INSERT WITH CHECK (true);
