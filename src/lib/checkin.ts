/**
 * Onchain Daily Checkin with Fee
 * Sends 0.03$ ETH split to 2 recipients for check-in
 */

import { createPublicClient, http, type Hash } from 'viem';
import { base } from 'viem/chains';
import { detectPlatform, getPlatformShortName, type Platform } from './platform';

// Base Builder Code for transaction attribution
export const BASE_BUILDER_CODE = 'bc_gy096wvf';

// Check-in fee configuration
// 0.000012 ETH = 12000000000000 wei (12 * 10^12)
export const CHECKIN_FEE_WEI = BigInt(process.env.NEXT_PUBLIC_CHECKIN_FEE_WEI || '12000000000000');
export const FEE_RECIPIENT_1 = process.env.NEXT_PUBLIC_FEE_RECIPIENT_1 || '';
export const FEE_RECIPIENT_2 = process.env.NEXT_PUBLIC_FEE_RECIPIENT_2 || '';

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
 * Send check-in transaction with fee payment
 * Sends half of the fee to each recipient
 * Returns tx hashes on success
 */
export async function sendCheckinTransaction(
  walletClient: any, // WalletClient from wagmi
  address: `0x${string}`
): Promise<{ txHash: Hash; platform: Platform }> {
  const platform = detectPlatform();
  
  // Build calldata with builder code
  const builderCodeHex = builderCodeToHex();
  const calldata = `0x${builderCodeHex}` as `0x${string}`;
  
  // Calculate fee per recipient (50-50 split)
  const feePerRecipient = getCheckinFeePerRecipient();
  
  // If recipients are configured, send fee payments
  if (FEE_RECIPIENT_1 && FEE_RECIPIENT_2) {
    // Send to first recipient
    const txHash1 = await walletClient.sendTransaction({
      to: FEE_RECIPIENT_1 as `0x${string}`,
      value: feePerRecipient,
      data: calldata,
    });
    
    // Send to second recipient
    await walletClient.sendTransaction({
      to: FEE_RECIPIENT_2 as `0x${string}`,
      value: feePerRecipient,
      data: calldata,
    });
    
    return { txHash: txHash1, platform };
  } else {
    // Fallback: Send 0 ETH to self (old behavior) if recipients not configured
    const txHash = await walletClient.sendTransaction({
      to: address,
      value: BigInt(0),
      data: calldata,
    });
    
    return { txHash, platform };
  }
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
 * - Check tx has correct value (fee payment) OR is 0 ETH to self
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
    
    const toAddress = tx.to?.toLowerCase();
    const hasFeeRecipients = FEE_RECIPIENT_1 && FEE_RECIPIENT_2;
    
    // Check if tx is to fee recipients OR to self (fallback mode)
    if (hasFeeRecipients) {
      // Fee mode: verify recipient is one of the fee recipients
      if (toAddress !== FEE_RECIPIENT_1.toLowerCase() && toAddress !== FEE_RECIPIENT_2.toLowerCase()) {
        // Also allow self-transfer (old behavior) for backward compatibility
        if (toAddress !== expectedAddress.toLowerCase()) {
          return { valid: false, error: 'Transaction recipient mismatch' };
        }
      } else {
        // Verify fee amount (should be half of total fee)
        const expectedFee = getCheckinFeePerRecipient();
        if (tx.value < expectedFee) {
          return { valid: false, error: 'Insufficient fee payment' };
        }
      }
    } else {
      // Fallback mode: 0 ETH to self
      // Allow any recipient (self or fee recipients) with any value
      // This is more permissive to handle transition period
      if (toAddress !== expectedAddress.toLowerCase()) {
        // Not to self - could be fee payment, allow it
        console.log('Check-in tx to non-self address, allowing for fee payment mode');
      }
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
    const feePerRecipient = getCheckinFeePerRecipient();
    
    // Estimate for fee payment transaction
    const recipient = FEE_RECIPIENT_1 || address;
    const value = FEE_RECIPIENT_1 ? feePerRecipient : BigInt(0);
    
    const gas = await publicClient.estimateGas({
      account: address,
      to: recipient as `0x${string}`,
      value,
      data: calldata,
    });
    
    // Multiply by 2 since we send 2 transactions
    return FEE_RECIPIENT_1 ? gas * BigInt(2) : gas;
  } catch {
    // Default to 21000 + some buffer for data, times 2 for 2 txs
    return BigInt(50000);
  }
}

/**
 * Check if fee recipients are configured
 */
export function areFeeRecipientsConfigured(): boolean {
  return Boolean(FEE_RECIPIENT_1 && FEE_RECIPIENT_2);
}

export { detectPlatform, getPlatformShortName, type Platform };
