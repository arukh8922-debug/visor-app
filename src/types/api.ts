// ===========================================
// API REQUEST/RESPONSE TYPES
// ===========================================

import type { User, LeaderboardEntry, Referral } from './database';

// ===========================================
// USER API
// ===========================================

export interface RegisterUserRequest {
  wallet_address: string;
  fid?: number;
  referrer?: string;
}

export interface RegisterUserResponse {
  success: boolean;
  user: User;
  referral_processed?: boolean;
}

export interface GetUserResponse {
  user: User;
  rank: number;
}

// ===========================================
// LEADERBOARD API
// ===========================================

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  user_rank?: number;
}

// ===========================================
// REFERRAL API
// ===========================================

export interface ProcessReferralRequest {
  referrer_address: string;
  referred_address: string;
}

export interface ProcessReferralResponse {
  success: boolean;
  points_awarded: number;
}

export interface GetReferralsResponse {
  total_referrals: number;
  points_earned: number;
  recent: Referral[];
}

// ===========================================
// POINTS API
// ===========================================

export interface AddPointsRequest {
  wallet_address: string;
  amount: number;
  reason: 'nft_mint' | 'referral' | 'daily_checkin' | 'streak_bonus';
  tx_hash?: string;
}

export interface AddPointsResponse {
  success: boolean;
  new_total: number;
}

// ===========================================
// WHITELIST API
// ===========================================

export interface WhitelistStatus {
  follows_creator1: boolean;
  follows_creator2: boolean;
  has_casted: boolean;
  has_added_miniapp: boolean;
  is_whitelisted: boolean;
  fid?: number;
}

// ===========================================
// NFT API
// ===========================================

export interface NFTPriceResponse {
  price_wei: string;
  price_eth: string;
  total_supply: number;
  max_supply: number;
}

export interface MintCallbackRequest {
  wallet_address: string;
  tx_hash: string;
  amount: number;
}

export interface MintCallbackResponse {
  success: boolean;
  points_added: number;
}

// ===========================================
// DAILY CHECK-IN API
// ===========================================

export interface DailyCheckinResponse {
  success: boolean;
  points_awarded: number;
  streak: number;
  bonus_awarded: boolean;
}

// ===========================================
// ERROR RESPONSE
// ===========================================

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
