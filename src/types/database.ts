// ===========================================
// DATABASE TYPES
// ===========================================

export interface User {
  id: string;
  wallet_address: string;
  fid: number | null;
  points: number;
  nft_count: number;
  referral_count: number;
  is_whitelisted: boolean;
  is_vip: boolean;
  has_added_miniapp: boolean;
  miniapp_added_at: string | null;
  has_enabled_notifications: boolean;
  notifications_enabled_at: string | null;
  last_checkin: string | null;
  streak_count: number;
  last_checkin_platform: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckinFee {
  id: string;
  wallet_address: string;
  tx_hash: string;
  fee_amount: string;
  recipient1_address: string;
  recipient2_address: string;
  split_amount: string;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_address: string;
  referred_address: string;
  created_at: string;
}

export interface PointsLog {
  id: string;
  wallet_address: string;
  amount: number;
  reason: 'nft_mint' | 'referral' | 'daily_checkin' | 'streak_bonus';
  tx_hash: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  wallet_address: string;
  type: 'mint' | 'sell';
  amount: number;
  price_eth: string;
  tx_hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  wallet_address: string;
  points: number;
  nft_count: number;
  farcaster?: {
    username: string;
    displayName: string;
    pfpUrl: string;
    fid: number;
  } | null;
}
