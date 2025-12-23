/**
 * NFT utilities for Visor ERC-1155 on Base
 * Uses Mint.club SDK for bonding curve interactions
 */

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export const VISOR_NFT_ADDRESS = process.env.NEXT_PUBLIC_VISOR_NFT_ADDRESS || '0x2cc716f614db19252cc4a6b54313b8f5162956fb';

// ERC-1155 ABI (minimal for balance check)
const ERC1155_ABI = [
  {
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Public client for read operations
const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

/**
 * Get user's Visor NFT balance
 * Token ID 0 is the main Visor NFT
 */
export async function getNFTBalance(address: string): Promise<number> {
  try {
    const balance = await publicClient.readContract({
      address: VISOR_NFT_ADDRESS as `0x${string}`,
      abi: ERC1155_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`, BigInt(0)], // Token ID 0
    });
    
    return Number(balance);
  } catch (error) {
    console.error('Failed to get NFT balance:', error);
    return 0;
  }
}

/**
 * Check if user holds at least 1 Visor NFT
 */
export async function hasVisorNFT(address: string): Promise<boolean> {
  const balance = await getNFTBalance(address);
  return balance > 0;
}
