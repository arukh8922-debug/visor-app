/**
 * Onchain Daily Checkin
 * Sends 0 ETH transfer to self for onchain transaction attribution
 */

import { createPublicClient, http, type Hash } from 'viem';
import { base } from 'viem/chains';
import { detectPlatform, getPlatformShortName, type Platform } from './platform';

// Base Builder Code for transaction attribution
export const BASE_BUILDER_CODE = 'bc_gy096wvf';

// Public client for tx verification
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Convert builder code to hex for calldata
 */
function builderCodeToHex(): string {
  return Buffer.from(BASE_BUILDER_CODE).toString('hex');
}

/**
 * Send 0 ETH checkin transaction
 * Returns tx hash on success
 */
export async function sendCheckinTransaction(
  walletClient: any, // WalletClient from wagmi
  address: `0x${string}`
): Promise<{ txHash: Hash; platform: Platform }> {
  const platform = detectPlatform();
  
  // Build calldata with builder code
  const builderCodeHex = builderCodeToHex();
  const calldata = `0x${builderCodeHex}` as `0x${string}`;
  
  // Send 0 ETH to self with builder code in data
  const txHash = await walletClient.sendTransaction({
    to: address,
    value: BigInt(0),
    data: calldata,
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
 * - Check tx is recent (within 5 minutes)
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
    
    // Verify it's a 0 ETH transfer (or very small amount)
    if (tx.value > BigInt(0)) {
      return { valid: false, error: 'Transaction has value (should be 0 ETH)' };
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
    const builderCodeHex = builderCodeToHex();
    const calldata = `0x${builderCodeHex}` as `0x${string}`;
    
    const gas = await publicClient.estimateGas({
      account: address,
      to: address,
      value: BigInt(0),
      data: calldata,
    });
    
    return gas;
  } catch {
    // Default to 21000 + some buffer for data
    return BigInt(25000);
  }
}

export { detectPlatform, getPlatformShortName, type Platform };
