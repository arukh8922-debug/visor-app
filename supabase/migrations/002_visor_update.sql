-- Visor App Database Schema Update
-- Migration 002: Add daily check-in, streak, and transactions support

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_checkin TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS streak_count INTEGER DEFAULT 0;

-- Transactions table for tracking mint/sell operations
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mint', 'sell')),
  amount INTEGER NOT NULL,
  price_eth TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

-- Create indexes for transactions
CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);

-- Enable RLS for transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transactions
CREATE POLICY "Anyone can read transactions" ON transactions
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert transactions" ON transactions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update transactions" ON transactions
  FOR UPDATE USING (true);

-- Function to add points with logging
CREATE OR REPLACE FUNCTION add_points(
  wallet TEXT, 
  point_amount INTEGER, 
  point_reason TEXT,
  hash TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  new_total INTEGER;
BEGIN
  -- Update user points
  UPDATE users 
  SET points = points + point_amount,
      updated_at = NOW()
  WHERE wallet_address = wallet
  RETURNING points INTO new_total;
  
  -- Log the points
  INSERT INTO points_log (wallet_address, amount, reason, tx_hash)
  VALUES (wallet, point_amount, point_reason, hash);
  
  RETURN new_total;
END;
$$ LANGUAGE plpgsql;

-- Function to record daily check-in
CREATE OR REPLACE FUNCTION record_daily_checkin(wallet TEXT)
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
  
  -- Update user
  UPDATE users 
  SET points = points + total_points,
      last_checkin = NOW(),
      streak_count = new_streak,
      updated_at = NOW()
  WHERE wallet_address = wallet;
  
  -- Log points
  INSERT INTO points_log (wallet_address, amount, reason)
  VALUES (wallet, 100, 'daily_checkin');
  
  IF is_bonus THEN
    INSERT INTO points_log (wallet_address, amount, reason)
    VALUES (wallet, 500, 'streak_bonus');
  END IF;
  
  RETURN QUERY SELECT total_points, new_streak, is_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to update transaction status
CREATE OR REPLACE FUNCTION update_transaction_status(
  hash TEXT,
  new_status TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE transactions 
  SET status = new_status
  WHERE tx_hash = hash;
END;
$$ LANGUAGE plpgsql;

-- Function to get user rank
CREATE OR REPLACE FUNCTION get_user_rank(wallet TEXT)
RETURNS INTEGER AS $$
DECLARE
  user_rank INTEGER;
BEGIN
  SELECT rank INTO user_rank
  FROM (
    SELECT wallet_address, RANK() OVER (ORDER BY points DESC) as rank
    FROM users
  ) ranked
  WHERE wallet_address = wallet;
  
  RETURN COALESCE(user_rank, 0);
END;
$$ LANGUAGE plpgsql;
