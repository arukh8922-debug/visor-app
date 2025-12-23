-- Visor App Database Schema Update
-- Migration 003: Add onchain checkin support with tx_hash and platform

-- Add platform column to users table for tracking last checkin platform
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_checkin_platform TEXT;

-- Add checkin_tx_hash column to points_log for tracking onchain transactions
ALTER TABLE points_log
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Update record_daily_checkin function to accept tx_hash and platform
CREATE OR REPLACE FUNCTION record_daily_checkin(
  wallet TEXT,
  tx_hash TEXT DEFAULT NULL,
  checkin_platform TEXT DEFAULT 'browser'
)
RETURNS TABLE(
  points_awarded INTEGER,
  streak INTEGER,
  bonus_awarded BOOLEAN
) AS $$
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
  
  -- Calculate points (100 base + 500 bonus on 7-day streak)
  total_points := 100;
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
  VALUES (wallet, 100, 'daily_checkin', tx_hash, checkin_platform);
  
  IF is_bonus THEN
    INSERT INTO points_log (wallet_address, amount, reason, tx_hash, platform)
    VALUES (wallet, 500, 'streak_bonus', tx_hash, checkin_platform);
  END IF;
  
  RETURN QUERY SELECT total_points, new_streak, is_bonus;
END;
$$ LANGUAGE plpgsql;

-- Create index for platform analytics
CREATE INDEX IF NOT EXISTS idx_points_log_platform ON points_log(platform);
CREATE INDEX IF NOT EXISTS idx_users_last_checkin_platform ON users(last_checkin_platform);
