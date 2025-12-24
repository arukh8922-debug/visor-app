-- Visor App Database Schema Update
-- Migration 004: Investor Updates
-- - Add VIP status for NFT holders
-- - Add mini app tracking
-- - Update points configuration (check-in 500 points)
-- - Add check-in fee tracking

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_added_miniapp BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS miniapp_added_at TIMESTAMPTZ;

-- Create index for VIP users
CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users(is_vip);
CREATE INDEX IF NOT EXISTS idx_users_has_added_miniapp ON users(has_added_miniapp);

-- Checkin fees table for tracking fee payments
CREATE TABLE IF NOT EXISTS checkin_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  fee_amount TEXT NOT NULL, -- in wei
  recipient1_address TEXT NOT NULL,
  recipient2_address TEXT NOT NULL,
  split_amount TEXT NOT NULL, -- each recipient gets this amount in wei
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

-- Create indexes for checkin_fees
CREATE INDEX IF NOT EXISTS idx_checkin_fees_wallet ON checkin_fees(wallet_address);
CREATE INDEX IF NOT EXISTS idx_checkin_fees_tx_hash ON checkin_fees(tx_hash);

-- Enable RLS for checkin_fees
ALTER TABLE checkin_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for checkin_fees
CREATE POLICY "Anyone can read checkin_fees" ON checkin_fees
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert checkin_fees" ON checkin_fees
  FOR INSERT WITH CHECK (true);

-- Update record_daily_checkin function to award 500 points (was 100)
CREATE OR REPLACE FUNCTION record_daily_checkin(
  wallet TEXT,
  tx_hash TEXT DEFAULT NULL,
  checkin_platform TEXT DEFAULT 'browser'
)
RETURNS TABLE(
  points_awarded INTEGER,
  streak INTEGER,
  bonus_awarded BOOLEAN
) AS $
DECLARE
  user_record RECORD;
  hours_since_checkin NUMERIC;
  new_streak INTEGER;
  total_points INTEGER;
  is_bonus BOOLEAN := FALSE;
BEGIN
  -- Get user record
  SELECT * INTO user_record FROM users WHERE wallet_address = wallet;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Calculate hours since last check-in
  IF user_record.last_checkin IS NULL THEN
    hours_since_checkin := 999;
  ELSE
    hours_since_checkin := EXTRACT(EPOCH FROM (NOW() - user_record.last_checkin)) / 3600;
  END IF;
  
  -- Check if eligible for check-in (at least 24 hours)
  IF hours_since_checkin < 24 THEN
    RAISE EXCEPTION 'Already checked in today';
  END IF;
  
  -- Calculate streak
  IF hours_since_checkin < 48 THEN
    -- Within 48 hours, continue streak
    new_streak := user_record.streak_count + 1;
  ELSE
    -- Streak broken, start fresh
    new_streak := 1;
  END IF;
  
  -- Calculate points (500 base + 500 bonus on 7-day streak)
  total_points := 500; -- Updated from 100 to 500
  IF new_streak = 7 THEN
    total_points := total_points + 500;
    is_bonus := TRUE;
    new_streak := 0; -- Reset streak after bonus
  END IF;
  
  -- Update user with platform info
  UPDATE users 
  SET points = points + total_points,
      last_checkin = NOW(),
      streak_count = new_streak,
      last_checkin_platform = checkin_platform,
      updated_at = NOW()
  WHERE wallet_address = wallet;
  
  -- Log points with tx_hash and platform
  INSERT INTO points_log (wallet_address, amount, reason, tx_hash, platform)
  VALUES (wallet, 500, 'daily_checkin', tx_hash, checkin_platform); -- Updated from 100 to 500
  
  IF is_bonus THEN
    INSERT INTO points_log (wallet_address, amount, reason, tx_hash, platform)
    VALUES (wallet, 500, 'streak_bonus', tx_hash, checkin_platform);
  END IF;
  
  RETURN QUERY SELECT total_points, new_streak, is_bonus;
END;
$ LANGUAGE plpgsql;

-- Function to set user as VIP after NFT mint
CREATE OR REPLACE FUNCTION set_user_vip(wallet TEXT)
RETURNS VOID AS $
BEGIN
  UPDATE users 
  SET is_vip = TRUE,
      updated_at = NOW()
  WHERE wallet_address = wallet;
END;
$ LANGUAGE plpgsql;

-- Function to record mini app addition
CREATE OR REPLACE FUNCTION record_miniapp_added(wallet TEXT)
RETURNS VOID AS $
BEGIN
  UPDATE users 
  SET has_added_miniapp = TRUE,
      miniapp_added_at = NOW(),
      updated_at = NOW()
  WHERE wallet_address = wallet;
END;
$ LANGUAGE plpgsql;

-- Update record_nft_mint to also set VIP status
CREATE OR REPLACE FUNCTION record_nft_mint(wallet TEXT, mint_count INTEGER)
RETURNS VOID AS $
BEGIN
  UPDATE users 
  SET nft_count = nft_count + mint_count,
      points = points + (mint_count * 100000),
      is_vip = TRUE, -- Set VIP on mint
      updated_at = NOW()
  WHERE wallet_address = wallet;
  
  -- Log the points
  INSERT INTO points_log (wallet_address, amount, reason)
  VALUES (wallet, mint_count * 100000, 'nft_mint');
END;
$ LANGUAGE plpgsql;
