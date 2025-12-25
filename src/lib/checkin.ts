/**
 * Onchain Daily Checkin with Fee Splitter Contract
 * Sends ETH to CheckinFeeSplitter contract which auto-splits to 2 recipients
 */

import { createPublicClient, http, encodeFunctionData, type Hash } from 'viem';
import { base } from 'viem/chains';
import { detectPlatform, getPlatformShortName, type Platform } from './platform';

// Base Builder Code for transaction attribution
export const BASE_BUILDER_CODE = 'bc_gy096wvf';

// CheckinFeeSplitter Contract on Base Mainnet
export const CHECKIN_CONTRACT_ADDRESS = '0x43E98A36Dc2788bD422B74f562B12113CE7cfc02' as const;

// Check-in fee: 0.00004 ETH total (0.00002 ETH per recipient)
export const CHECKIN_FEE_WEI = BigInt('40000000000000'); // 40000000000000 wei = 0.00004 ETH

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

/**
 * Get check-in fee amount in wei (split amount per recipient)
 */
export function getCheckinFeePerRecipient(): bigint {
  return CHECKIN_FEE_WEI / BigInt(2); // 50-50 split
}

/**
 * Get total check-in fee in wei
 */
export function getTotalCheckinFee(): bigint {
  return CHECKIN_FEE_WEI;
}

/**
 * Send check-in transaction via CheckinFeeSplitter contract
 * Single transaction that auto-splits fee to both recipients
 */
export async function sendCheckinTransaction(
  walletClient: any, // WalletClient from wagmi
  address: `0x${string}`
): Promise<{ txHash: Hash; platform: Platform }> {
  const platform = detectPlatform();
  
  // Encode checkin() function call
  const data = encodeFunctionData({
    abi: CHECKIN_ABI,
    functionName: 'checkin',
  });
  
  // Send transaction to contract with fee
  const txHash = await walletClient.sendTransaction({
    to: CHECKIN_CONTRACT_ADDRESS,
    value: CHECKIN_FEE_WEI,
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
 * - Check tx has correct value (fee payment)
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
    
    // Verify fee amount
    if (tx.value < CHECKIN_FEE_WEI) {
      return { valid: false, error: 'Insufficient fee payment' };
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
    const data = encodeFunctionData({
      abi: CHECKIN_ABI,
      functionName: 'checkin',
    });
    
    const gas = await publicClient.estimateGas({
      account: address,
      to: CHECKIN_CONTRACT_ADDRESS,
      value: CHECKIN_FEE_WEI,
      data,
    });
    
    return gas;
  } catch {
    // Default gas estimate for contract call
    return BigInt(60000);
  }
}

export { detectPlatform, getPlatformShortName, type Platform };
