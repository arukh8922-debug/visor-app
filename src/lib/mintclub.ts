/**
 * Mint.club SDK Wrapper
 * Wrapper untuk interaksi dengan Mint.club V2 SDK untuk NFT bonding curve
 */

import { mintclub } from 'mint.club-v2-sdk';
import { parseEther, formatEther } from 'viem';
import {
  NFT_SYMBOL,
  WETH_ADDRESS,
  MINTCLUB_NETWORK,
  CURVE_CONFIG,
  CHAIN_ID,
  CHAIN_NAME,
} from './config';

// ===========================================
// NETWORK CONFIGURATION
// ===========================================

export function getNetwork() {
  return MINTCLUB_NETWORK;
}

export function getWethAddress() {
  return WETH_ADDRESS;
}

// ===========================================
// NFT INSTANCE
// ===========================================

export function getNFT() {
  return mintclub.network(MINTCLUB_NETWORK).nft(NFT_SYMBOL);
}

// ===========================================
// READ FUNCTIONS
// ===========================================

export async function getBalance(address: string): Promise<bigint> {
  const nft = getNFT();
  return await nft.getBalanceOf(address as `0x${string}`);
}

export async function getTotalSupply(): Promise<bigint> {
  const nft = getNFT();
  return await nft.getTotalSupply();
}

export async function getMaxSupply(): Promise<bigint> {
  const nft = getNFT();
  return await nft.getMaxSupply();
}

export async function getPriceForNextMint(): Promise<bigint> {
  const nft = getNFT();
  return await nft.getPriceForNextMint();
}

export async function getBuyEstimation(amount: bigint): Promise<bigint> {
  const nft = getNFT();
  const result = await nft.getBuyEstimation(amount);
  // SDK returns [total, fee] tuple, we want total
  if (Array.isArray(result)) {
    return result[0];
  }
  return result as unknown as bigint;
}

export async function getSellEstimation(amount: bigint): Promise<bigint> {
  const nft = getNFT();
  const result = await nft.getSellEstimation(amount);
  // SDK returns [total, fee] tuple, we want total
  if (Array.isArray(result)) {
    return result[0];
  }
  return result as unknown as bigint;
}

export async function getNFTDetail() {
  const nft = getNFT();
  return await nft.getDetail();
}

export async function getReserveToken() {
  const nft = getNFT();
  return await nft.getReserveToken();
}

export async function getSteps() {
  const nft = getNFT();
  return await nft.getSteps();
}

// ===========================================
// FORMATTED READ FUNCTIONS
// ===========================================

export async function getNFTInfo() {
  const nft = getNFT();

  const [totalSupply, maxSupply, priceWei] = await Promise.all([
    nft.getTotalSupply(),
    nft.getMaxSupply(),
    nft.getPriceForNextMint(),
  ]);

  return {
    totalSupply: Number(totalSupply),
    maxSupply: Number(maxSupply),
    priceWei: priceWei.toString(),
    priceEth: formatEther(priceWei),
  };
}

export async function getUserNFTInfo(address: string) {
  const nft = getNFT();

  const [balance, totalSupply, maxSupply, priceWei] = await Promise.all([
    nft.getBalanceOf(address as `0x${string}`),
    nft.getTotalSupply(),
    nft.getMaxSupply(),
    nft.getPriceForNextMint(),
  ]);

  return {
    balance: Number(balance),
    totalSupply: Number(totalSupply),
    maxSupply: Number(maxSupply),
    priceWei: priceWei.toString(),
    priceEth: formatEther(priceWei),
  };
}

// ===========================================
// WRITE FUNCTIONS (BROWSER)
// ===========================================

export interface TransactionCallbacks {
  onAllowanceSignatureRequest?: () => void;
  onAllowanceSigned?: () => void;
  onSignatureRequest?: () => void;
  onSigned?: (txHash: string) => void;
  onSuccess?: (receipt: unknown) => void;
  onError?: (error: unknown) => void;
}

export async function buyNFT(
  amount: bigint,
  recipient: string,
  slippage: number = 5,
  callbacks?: TransactionCallbacks
) {
  const nft = getNFT();

  return await nft.buy({
    amount,
    recipient: recipient as `0x${string}`,
    slippage,
    onAllowanceSignatureRequest: callbacks?.onAllowanceSignatureRequest,
    onAllowanceSigned: callbacks?.onAllowanceSigned,
    onSignatureRequest: callbacks?.onSignatureRequest,
    onSigned: callbacks?.onSigned,
    onSuccess: callbacks?.onSuccess,
    onError: callbacks?.onError,
  });
}

export async function sellNFT(
  amount: bigint,
  recipient: string,
  slippage: number = 5,
  callbacks?: TransactionCallbacks
) {
  const nft = getNFT();

  return await nft.sell({
    amount,
    recipient: recipient as `0x${string}`,
    slippage,
    onSignatureRequest: callbacks?.onSignatureRequest,
    onSigned: callbacks?.onSigned,
    onSuccess: callbacks?.onSuccess,
    onError: callbacks?.onError,
  });
}

// ===========================================
// NFT DEPLOYMENT (ADMIN) - Disabled due to SDK type issues
// ===========================================

export interface CreateNFTConfig {
  name: string;
  symbol: string;
  uri: string;
  callbacks?: TransactionCallbacks;
}

// Note: createNFT function disabled - use Mint.club UI for deployment
// The SDK has breaking type changes that require significant refactoring

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export function formatPrice(priceWei: bigint | string): string {
  const wei = typeof priceWei === 'string' ? BigInt(priceWei) : priceWei;
  return formatEther(wei);
}

export function parsePrice(priceEth: string): bigint {
  return parseEther(priceEth);
}

// Export network info for UI
export const networkInfo = {
  network: MINTCLUB_NETWORK,
  chainId: CHAIN_ID,
  chainName: CHAIN_NAME,
  nftSymbol: NFT_SYMBOL,
};
