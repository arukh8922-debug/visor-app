/**
 * Supabase client configuration and helper functions
 */

import { createClient } from '@supabase/supabase-js';
import type { User, Referral, PointsLog, Transaction, LeaderboardEntry } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Public client for client-side operations (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for server-side operations (uses service role key, bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// ===========================================
// USER FUNCTIONS
// ===========================================

export async function getUser(address: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('wallet_address', address.toLowerCase())
    .single();
  
  if (error) return null;
  return data as User;
}

export async function createUser(address: string, fid?: number): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({
      wallet_address: address.toLowerCase(),
      fid,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as User;
}

export async function getOrCreateUser(address: string, fid?: number): Promise<User> {
  const existing = await getUser(address);
  if (existing) return existing;
  return createUser(address, fid);
}

export async function updateUser(address: string, updates: Partial<User>): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('wallet_address', address.toLowerCase())
    .select()
    .single();
  
  if (error) return null;
  return data as User;
}

export async function updateUserWhitelist(address: string, isWhitelisted: boolean): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ is_whitelisted: isWhitelisted, updated_at: new Date().toISOString() })
    .eq('wallet_address', address.toLowerCase());
  
  if (error) throw error;
}

/**
 * Record that user has added the mini app
 */
export async function recordMiniAppAdded(address: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ 
      has_added_miniapp: true, 
      miniapp_added_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq('wallet_address', address.toLowerCase());
  
  if (error) throw error;
}

/**
 * Record that user has removed the mini app
 */
export async function recordMiniAppRemoved(address: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ 
      has_added_miniapp: false, 
      miniapp_added_at: null,
      updated_at: new Date().toISOString() 
    })
    .eq('wallet_address', address.toLowerCase());
  
  if (error) throw error;
}

/**
 * Set user as VIP (after NFT mint)
 */
export async function setUserVIP(address: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ 
      is_vip: true, 
      updated_at: new Date().toISOString() 
    })
    .eq('wallet_address', address.toLowerCase());
  
  if (error) throw error;
}

// ===========================================
// LEADERBOARD FUNCTIONS
// ===========================================

export async function getLeaderboard(limit: number = 50, offset: number = 0): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  const { data, error, count } = await supabase
    .from('users')
    .select('wallet_address, points, nft_count', { count: 'exact' })
    .gt('points', 0) // Only include users with points > 0
    .order('points', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  const entries: LeaderboardEntry[] = (data || []).map((user, index) => ({
    rank: offset + index + 1,
    wallet_address: user.wallet_address,
    points: user.points,
    nft_count: user.nft_count,
  }));
  
  return { entries, total: count || 0 };
}

export async function getUserRank(address: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_user_rank', {
    wallet: address.toLowerCase(),
  });
  
  if (error) return 0;
  return data || 0;
}

// ===========================================
// POINTS FUNCTIONS
// ===========================================

export async function addPoints(
  address: string,
  amount: number,
  reason: 'nft_mint' | 'referral' | 'daily_checkin' | 'streak_bonus',
  txHash?: string
): Promise<number> {
  const { data, error } = await supabase.rpc('add_points', {
    wallet: address.toLowerCase(),
    point_amount: amount,
    point_reason: reason,
    hash: txHash || null,
  });
  
  if (error) throw error;
  return data || 0;
}

export async function getPointsLog(address: string, limit: number = 20): Promise<PointsLog[]> {
  const { data, error } = await supabase
    .from('points_log')
    .select('*')
    .eq('wallet_address', address.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return (data || []) as PointsLog[];
}

// ===========================================
// REFERRAL FUNCTIONS
// ===========================================

export async function processReferral(referrerAddress: string, referredAddress: string): Promise<{ success: boolean; pointsAwarded: number }> {
  // Check if referral already exists
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_address', referredAddress.toLowerCase())
    .single();
  
  if (existing) {
    return { success: false, pointsAwarded: 0 };
  }
  
  // Create referral record
  const { error: refError } = await supabase
    .from('referrals')
    .insert({
      referrer_address: referrerAddress.toLowerCase(),
      referred_address: referredAddress.toLowerCase(),
    });
  
  if (refError) throw refError;
  
  // Increment referral count
  await supabase.rpc('increment_referral_count', {
    wallet: referrerAddress.toLowerCase(),
  });
  
  // Add points to referrer
  const pointsAwarded = 1000; // POINTS.REFERRAL
  await addPoints(referrerAddress, pointsAwarded, 'referral');
  
  return { success: true, pointsAwarded };
}

export async function getReferrals(address: string): Promise<{ total: number; pointsEarned: number; recent: Referral[] }> {
  const { data, error, count } = await supabase
    .from('referrals')
    .select('*', { count: 'exact' })
    .eq('referrer_address', address.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) throw error;
  
  const total = count || 0;
  const pointsEarned = total * 1000; // POINTS.REFERRAL
  
  return {
    total,
    pointsEarned,
    recent: (data || []) as Referral[],
  };
}

// ===========================================
// DAILY CHECK-IN FUNCTIONS
// ===========================================

export async function recordDailyCheckin(
  address: string,
  txHash?: string,
  platform?: string
): Promise<{ pointsAwarded: number; streak: number; bonusAwarded: boolean }> {
  const { data, error } = await supabase.rpc('record_daily_checkin', {
    wallet: address.toLowerCase(),
    tx_hash: txHash || null,
    checkin_platform: platform || 'browser',
  });
  
  if (error) throw error;
  
  const result = data?.[0] || { points_awarded: 0, streak: 0, bonus_awarded: false };
  return {
    pointsAwarded: result.points_awarded,
    streak: result.streak,
    bonusAwarded: result.bonus_awarded,
  };
}

// ===========================================
// TRANSACTION FUNCTIONS
// ===========================================

export async function createTransaction(
  address: string,
  type: 'mint' | 'sell',
  amount: number,
  priceEth: string,
  txHash: string
): Promise<Transaction> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      wallet_address: address.toLowerCase(),
      type,
      amount,
      price_eth: priceEth,
      tx_hash: txHash,
      status: 'pending',
    })
    .select()
    .single();
  
  if (error) throw error;
  return data as Transaction;
}

export async function updateTransactionStatus(txHash: string, status: 'pending' | 'confirmed' | 'failed'): Promise<void> {
  const { error } = await supabase.rpc('update_transaction_status', {
    hash: txHash,
    new_status: status,
  });
  
  if (error) throw error;
}

export async function getTransactions(address: string, limit: number = 20): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('wallet_address', address.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return (data || []) as Transaction[];
}

// ===========================================
// NFT MINT CALLBACK
// ===========================================

export async function recordNFTMint(address: string, amount: number, txHash: string): Promise<{ pointsAdded: number }> {
  // Update NFT count and set VIP status
  const { error: updateError } = await supabase
    .from('users')
    .update({
      nft_count: supabase.rpc('increment', { x: amount }),
      is_vip: true, // Set VIP on mint
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', address.toLowerCase());
  
  if (updateError) {
    // Fallback: use direct update
    const user = await getUser(address);
    if (user) {
      await supabase
        .from('users')
        .update({
          nft_count: user.nft_count + amount,
          is_vip: true, // Set VIP on mint
          updated_at: new Date().toISOString(),
        })
        .eq('wallet_address', address.toLowerCase());
    }
  }
  
  // Add points (100,000 per mint)
  const pointsPerMint = 100000; // POINTS.NFT_MINT
  const totalPoints = pointsPerMint * amount;
  await addPoints(address, totalPoints, 'nft_mint', txHash);
  
  return { pointsAdded: totalPoints };
}


/**
 * Sync NFT balance from blockchain and award points for new mints
 * Used when user mints on OpenSea and syncs balance in app
 */
export async function syncNFTBalance(address: string, newBalance: number, newMints: number): Promise<{ pointsAdded: number }> {
  // Update NFT count and set VIP status
  const { error: updateError } = await supabase
    .from('users')
    .update({
      nft_count: newBalance,
      is_vip: newBalance > 0, // VIP if has any NFT
      updated_at: new Date().toISOString(),
    })
    .eq('wallet_address', address.toLowerCase());
  
  if (updateError) {
    console.error('Failed to update NFT balance:', updateError);
    throw updateError;
  }
  
  // Add points for new mints (100,000 per mint)
  const pointsPerMint = 100000;
  const totalPoints = pointsPerMint * newMints;
  
  if (totalPoints > 0) {
    await addPoints(address, totalPoints, 'nft_mint');
  }
  
  return { pointsAdded: totalPoints };
}
