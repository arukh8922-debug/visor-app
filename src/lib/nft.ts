/**
 * NFT utilities for Visor ERC-721 on Base
 * New collection: https://opensea.io/collection/visor-923504088
 */

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export const VISOR_NFT_ADDRESS = process.env.NEXT_PUBLIC_VISOR_NFT_ADDRESS_MAINNET || '0xefe887a1a761ad0ea870b66e59126e0249ee5aff';
export const VISOR_OPENSEA_URL = 'https://opensea.io/collection/visor-923504088';

// ERC-721 ABI (minimal for balance check and ownership)
const ERC721_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
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
 * Get user's Visor NFT balance (ERC-721)
 */
export async function getNFTBalance(address: string): Promise<number> {
  try {
    const balance = await publicClient.readContract({
      address: VISOR_NFT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
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

/**
 * Get total supply of Visor NFTs
 */
export async function getTotalSupply(): Promise<number> {
  try {
    const supply = await publicClient.readContract({
      address: VISOR_NFT_ADDRESS as `0x${string}`,
      abi: ERC721_ABI,
      functionName: 'totalSupply',
    });
    
    return Number(supply);
  } catch (error) {
    console.error('Failed to get total supply:', error);
    return 0;
  }
}
