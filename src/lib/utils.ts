/**
 * Utility functions for Visor App
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ===========================================
// CLASSNAME UTILITIES
// ===========================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===========================================
// ADDRESS UTILITIES
// ===========================================

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function normalizeAddress(address: string): string {
  return address.toLowerCase();
}

// ===========================================
// NUMBER FORMATTING
// ===========================================

export function formatNumber(num: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

export function formatCompactNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

export function formatPoints(points: number): string {
  return formatNumber(points);
}

// ===========================================
// ETH FORMATTING
// ===========================================

export function formatEthValue(value: string | number, decimals = 6): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === 0) return '0';
  if (num < 0.000001) return '<0.000001';
  return num.toFixed(decimals).replace(/\.?0+$/, '');
}

// ===========================================
// DATE UTILITIES
// ===========================================

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function isMoreThan24HoursAgo(date: string | Date | null): boolean {
  if (!date) return true;
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours >= 24;
}

// ===========================================
// URL UTILITIES
// ===========================================

export function getReferralLink(address: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
  return `${appUrl}?ref=${address}`;
}

export function getFarcasterProfileUrl(fid: number): string {
  return `https://warpcast.com/~/profiles/${fid}`;
}

export function getFarcasterComposeUrl(text: string): string {
  return `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`;
}

export function getExplorerTxUrl(txHash: string): string {
  return `https://basescan.org/tx/${txHash}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://basescan.org/address/${address}`;
}

// ===========================================
// VALIDATION UTILITIES
// ===========================================

export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

// ===========================================
// ASYNC UTILITIES
// ===========================================

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delayMs * attempt);
      }
    }
  }
  
  throw lastError;
}

// ===========================================
// STORAGE UTILITIES
// ===========================================

export function getLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors
  }
}

export function removeLocalStorage(key: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

// Referral storage
export const REFERRAL_STORAGE_KEY = 'visor_referrer';

export function storeReferrer(address: string): void {
  setLocalStorage(REFERRAL_STORAGE_KEY, address);
}

export function getStoredReferrer(): string | null {
  return getLocalStorage<string | null>(REFERRAL_STORAGE_KEY, null);
}

export function clearStoredReferrer(): void {
  removeLocalStorage(REFERRAL_STORAGE_KEY);
}
