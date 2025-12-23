/**
 * Points system for Visor
 * Points are stored in Supabase and can be recorded onchain
 */

import { supabase } from './supabase';

export interface LeaderboardEntry {
  address: string;
  points: number;
  nftCount: number;
  referralCount: number;
}

// Points values
export const POINTS = {
  NFT_MINT: 100_000,
  REFERRAL: 1_000,
  DAILY_TX: 100,
} as const;

/**
 * Get user's total points
 */
export async function getUserPoints(address: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('points')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (error || !data) return 0;
    return data.points || 0;
  } catch (error) {
    console.error('Failed to get user points:', error);
    return 0;
  }
}

/**
 * Add points to user
 */
export async function addPoints(
  address: string,
  amount: number,
  reason: 'nft_mint' | 'referral' | 'daily_tx'
): Promise<boolean> {
  try {
    // First, ensure user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, points')
      .eq('wallet_address', address.toLowerCase())
      .single();

    if (existingUser) {
      // Update existing user
      const { error } = await supabase
        .from('users')
        .update({ points: existingUser.points + amount })
        .eq('wallet_address', address.toLowerCase());

      if (error) throw error;
    } else {
      // Create new user
      const { error } = await supabase
        .from('users')
        .insert({
          wallet_address: address.toLowerCase(),
          points: amount,
        });

      if (error) throw error;
    }

    // Log points transaction
    await supabase.from('points_log').insert({
      wallet_address: address.toLowerCase(),
      amount,
      reason,
    });

    return true;
  } catch (error) {
    console.error('Failed to add points:', error);
    return false;
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('wallet_address, points, nft_count, referral_count')
      .order('points', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => ({
      address: row.wallet_address,
      points: row.points || 0,
      nftCount: row.nft_count || 0,
      referralCount: row.referral_count || 0,
    }));
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}
