/**
 * Referral system for Visor
 */

import { supabase } from './supabase';
import { addPoints, POINTS } from './points';

export interface ReferralStats {
  totalReferrals: number;
  pointsEarned: number;
  recentReferrals: { address: string; timestamp: string }[];
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(address: string): Promise<ReferralStats> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('referred_address, created_at')
      .eq('referrer_address', address.toLowerCase())
      .order('created_at', { ascending: false });

    if (error || !data) {
      return {
        totalReferrals: 0,
        pointsEarned: 0,
        recentReferrals: [],
      };
    }

    return {
      totalReferrals: data.length,
      pointsEarned: data.length * POINTS.REFERRAL,
      recentReferrals: data.slice(0, 10).map((r) => ({
        address: r.referred_address,
        timestamp: r.created_at,
      })),
    };
  } catch (error) {
    console.error('Failed to get referral stats:', error);
    return {
      totalReferrals: 0,
      pointsEarned: 0,
      recentReferrals: [],
    };
  }
}

/**
 * Process a referral
 */
export async function processReferral(
  referrerAddress: string,
  referredAddress: string
): Promise<boolean> {
  try {
    // Check if referral already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_address', referredAddress.toLowerCase())
      .single();

    if (existing) {
      console.log('User already referred');
      return false;
    }

    // Create referral record
    const { error } = await supabase.from('referrals').insert({
      referrer_address: referrerAddress.toLowerCase(),
      referred_address: referredAddress.toLowerCase(),
    });

    if (error) throw error;

    // Award points to referrer
    await addPoints(referrerAddress, POINTS.REFERRAL, 'referral');

    // Update referrer's referral count
    await supabase.rpc('increment_referral_count', {
      wallet: referrerAddress.toLowerCase(),
    });

    return true;
  } catch (error) {
    console.error('Failed to process referral:', error);
    return false;
  }
}
