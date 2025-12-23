// ===========================================
// CENTRALIZED CONFIGURATION
// ===========================================

// Network Configuration - Base Mainnet Only
export const CHAIN_ID = 8453;
export const CHAIN_NAME = 'Base';
export const RPC_URL = process.env.NEXT_PUBLIC_BASE_MAINNET_RPC || 'https://mainnet.base.org';
export const EXPLORER_URL = 'https://basescan.org';

// WETH Address on Base Mainnet
export const WETH_ADDRESS = process.env.NEXT_PUBLIC_WETH_ADDRESS_MAINNET || '0x4200000000000000000000000000000000000006';

// App Configuration
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Visor';

// NFT Configuration
export const NFT_SYMBOL = process.env.NEXT_PUBLIC_VISOR_NFT_SYMBOL || 'VISOR';
export const NFT_ADDRESS = process.env.NEXT_PUBLIC_VISOR_NFT_ADDRESS_MAINNET || '0x2cc716F614dB19252CC4A6B54313B8f5162956Fb';
export const NFT_METADATA_URI = process.env.NEXT_PUBLIC_VISOR_NFT_METADATA_URI;

// Bonding Curve Configuration
export const CURVE_CONFIG = {
  curveType: (process.env.NEXT_PUBLIC_CURVE_TYPE || 'LINEAR') as 'LINEAR' | 'EXPONENTIAL' | 'FLAT',
  stepCount: Number(process.env.NEXT_PUBLIC_CURVE_STEP_COUNT) || 20,
  maxSupply: Number(process.env.NEXT_PUBLIC_NFT_MAX_SUPPLY) || 10000,
  initialMintPrice: process.env.NEXT_PUBLIC_INITIAL_MINT_PRICE || '0.0001',
  finalMintPrice: process.env.NEXT_PUBLIC_FINAL_MINT_PRICE || '0.01',
  creatorRoyalty: Number(process.env.NEXT_PUBLIC_CREATOR_ROYALTY) || 5,
  creatorAllocation: Number(process.env.NEXT_PUBLIC_CREATOR_ALLOCATION) || 100,
};

// Points Configuration
export const POINTS = {
  NFT_MINT: Number(process.env.NEXT_PUBLIC_POINTS_PER_MINT) || 100000,
  REFERRAL: Number(process.env.NEXT_PUBLIC_POINTS_PER_REFERRAL) || 1000,
  DAILY_CHECKIN: Number(process.env.NEXT_PUBLIC_POINTS_DAILY_CHECKIN) || 100,
  STREAK_BONUS: Number(process.env.NEXT_PUBLIC_POINTS_STREAK_BONUS) || 500,
};

// Creator FIDs for Whitelist
export const CREATOR_FIDS = {
  CREATOR_1: Number(process.env.NEXT_PUBLIC_CREATOR_FID_1) || 250704,
  CREATOR_2: Number(process.env.NEXT_PUBLIC_CREATOR_FID_2) || 1043335,
};

// Transaction Configuration
export const TX_CONFIG = {
  defaultSlippage: Number(process.env.NEXT_PUBLIC_DEFAULT_SLIPPAGE) || 5,
  timeout: Number(process.env.NEXT_PUBLIC_TX_TIMEOUT) || 60000,
};

// API Configuration
export const API_RATE_LIMIT = Number(process.env.API_RATE_LIMIT) || 100;

// Mint.club Network - Base Mainnet
export const MINTCLUB_NETWORK = 'base';

// Helper function to get explorer link
export function getExplorerLink(type: 'tx' | 'address' | 'token', value: string): string {
  switch (type) {
    case 'tx':
      return `${EXPLORER_URL}/tx/${value}`;
    case 'address':
      return `${EXPLORER_URL}/address/${value}`;
    case 'token':
      return `${EXPLORER_URL}/token/${value}`;
    default:
      return EXPLORER_URL;
  }
}

// Helper function to truncate address
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
