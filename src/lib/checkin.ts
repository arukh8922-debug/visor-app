/**
 * Onchain Daily Checkin with Fee Splitter Contract
 * Dynamic pricing: $0.04 USD converted to ETH at current market rate
 */

import { createPublicClient, http, encodeFunctionData, parseEther, type Hash } from 'viem';
import { base } from 'viem/chains';
import { detectPlatform, getPlatformShortName, type Platform } from './platform';

// Base Builder Code for transaction attribution
export const BASE_BUILDER_CODE = 'bc_gy096wvf';

// CheckinFeeSplitter Contract on Base Mainnet (v2 - dynamic pricing)
export const CHECKIN_CONTRACT_ADDRESS = '0xa31Ff9cb316757103aC99da04f93748035eca93d' as const;

// Target fee in USD
export const CHECKIN_FEE_USD = 0.04;

// Contract ABI (only checkin function needed)
const CHECKIN_ABI = [
  {
    name: 'checkin',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'payable',
  },
] as const;

// Public client for tx verification
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

// Cache ETH price for 5 minutes
let cachedEthPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch current ETH price in USD from CoinGecko
 */
export async function getEthPriceUSD(): Promise<number> {
  // Return cached price if still valid
  if (cachedEthPrice && Date.now() - cachedEthPrice.timestamp < CACHE_DURATION) {
    return cachedEthPrice.price;
  }
  
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 300 } } // Cache for 5 minutes
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch ETH price');
    }
    
    const data = await response.json();
    const price = data.ethereum.usd;
    
    // Cache the price
    cachedEthPrice = { price, timestamp: Date.now() };
    
    return price;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    // Fallback to a reasonable default if API fails
    return 3000; // $3000 as fallback
  }
}

/**
 * Calculate check-in fee in ETH based on current price
 * Target: $0.04 USD
 */
export async function getCheckinFeeWei(): Promise<bigint> {
  const ethPrice = await getEthPriceUSD();
  const ethAmount = CHECKIN_FEE_USD / ethPrice;
  
  // Convert to wei (18 decimals) with some precision
  // Round up to ensure we meet minimum
  const weiAmount = Math.ceil(ethAmount * 1e18);
  
  return BigInt(weiAmount);
}

/**
 * Get check-in fee amount in wei (split amount per recipient)
 */
export async function getCheckinFeePerRecipient(): Promise<bigint> {
  const totalFee = await getCheckinFeeWei();
  return totalFee / BigInt(2); // 50-50 split
}

/**
 * Get total check-in fee in wei
 */
export async function getTotalCheckinFee(): Promise<bigint> {
  return getCheckinFeeWei();
}

/**
 * Format fee for display
 */
export async function getCheckinFeeDisplay(): Promise<{ eth: string; usd: string }> {
  const feeWei = await getCheckinFeeWei();
  const ethAmount = Number(feeWei) / 1e18;
  
  return {
    eth: ethAmount.toFixed(6),
    usd: CHECKIN_FEE_USD.toFixed(2),
  };
}

/**
 * Send check-in transaction via CheckinFeeSplitter contract
 * Single transaction that auto-splits fee to both recipients
 */
export async function sendCheckinTransaction(
  walletClient: any, // WalletClient from wagmi
  _address: `0x${string}`
): Promise<{ txHash: Hash; platform: Platform }> {
  const platform = detectPlatform();
  
  // Get dynamic fee based on current ETH price
  const feeWei = await getCheckinFeeWei();
  
  // Encode checkin() function call
  const data = encodeFunctionData({
    abi: CHECKIN_ABI,
    functionName: 'checkin',
  });
  
  // Send transaction to contract with dynamic fee
  const txHash = await walletClient.sendTransaction({
    to: CHECKIN_CONTRACT_ADDRESS,
    value: feeWei,
    data,
  });
  
  return { txHash, platform };
}

/**
 * Wait for transaction confirmation
 */
export async function waitForCheckinConfirmation(txHash: Hash): Promise<boolean> {
  try {
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
      timeout: 60_000, // 60 seconds
    });
    
    return receipt.status === 'success';
  } catch (error) {
    console.error('Failed to confirm checkin tx:', error);
    return false;
  }
}

/**
 * Verify a checkin transaction
 * - Check tx exists
 * - Check tx is from the claimed address
 * - Check tx is to the CheckinFeeSplitter contract
 * - Check tx is recent (within 5 minutes)
 * - Check tx has some value (dynamic pricing, just verify > 0)
 */
export async function verifyCheckinTransaction(
  txHash: Hash,
  expectedAddress: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const tx = await publicClient.getTransaction({ hash: txHash });
    
    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }
    
    // Verify sender
    if (tx.from.toLowerCase() !== expectedAddress.toLowerCase()) {
      return { valid: false, error: 'Transaction sender mismatch' };
    }
    
    // Verify recipient is the CheckinFeeSplitter contract
    if (tx.to?.toLowerCase() !== CHECKIN_CONTRACT_ADDRESS.toLowerCase()) {
      return { valid: false, error: 'Transaction not to CheckinFeeSplitter contract' };
    }
    
    // Verify some fee was paid (dynamic pricing, just check > 0)
    if (tx.value === BigInt(0)) {
      return { valid: false, error: 'No fee payment' };
    }
    
    // Get block timestamp
    const block = await publicClient.getBlock({ blockNumber: tx.blockNumber! });
    const txTime = Number(block.timestamp) * 1000;
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - txTime > fiveMinutes) {
      return { valid: false, error: 'Transaction too old (>5 minutes)' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Failed to verify checkin tx:', error);
    return { valid: false, error: 'Failed to verify transaction' };
  }
}

/**
 * Get estimated gas for checkin transaction
 */
export async function estimateCheckinGas(address: `0x${string}`): Promise<bigint> {
  try {
    const feeWei = await getCheckinFeeWei();
    
    const data = encodeFunctionData({
      abi: CHECKIN_ABI,
      functionName: 'checkin',
    });
    
    const gas = await publicClient.estimateGas({
      account: address,
      to: CHECKIN_CONTRACT_ADDRESS,
      value: feeWei,
      data,
    });
    
    return gas;
  } catch {
    // Default gas estimate for contract call
    return BigInt(60000);
  }
}

export { detectPlatform, getPlatformShortName, type Platform };
