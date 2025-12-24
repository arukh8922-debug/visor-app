/**
 * Farcaster Mini App SDK Helpers
 * Wrapper for @farcaster/miniapp-sdk actions
 */

import sdk from '@farcaster/miniapp-sdk';

export interface MiniAppContext {
  client: {
    added: boolean;
    notificationDetails?: {
      url: string;
      token: string;
    };
  };
  user: {
    fid: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
}

/**
 * Check if running inside Farcaster Mini App context
 */
export function isInFarcasterContext(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for Farcaster-specific indicators
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('warpcast') || userAgent.includes('farcaster')) {
      return true;
    }
    
    // Check for SDK context
    if (sdk && sdk.context) {
      return true;
    }
    
    // Check URL params (Farcaster adds these)
    const url = new URL(window.location.href);
    if (url.searchParams.has('fc_frame') || url.searchParams.has('fid')) {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Get Farcaster Mini App context
 * Returns null if not in Farcaster context
 */
export async function getMiniAppContext(): Promise<MiniAppContext | null> {
  if (!isInFarcasterContext()) return null;
  
  try {
    const context = await sdk.context;
    return context as MiniAppContext;
  } catch (error) {
    console.error('Failed to get mini app context:', error);
    return null;
  }
}

/**
 * Check if user has added the mini app
 * Uses SDK context.client.added field
 */
export async function hasUserAddedMiniApp(): Promise<boolean> {
  try {
    const context = await getMiniAppContext();
    return context?.client?.added ?? false;
  } catch {
    return false;
  }
}

/**
 * Prompt user to add mini app
 * Shows native Farcaster "Add Mini App" dialog
 * Returns true if user added, false if rejected or error
 */
export async function promptAddMiniApp(): Promise<{
  success: boolean;
  notificationDetails?: { url: string; token: string };
  error?: string;
}> {
  if (!isInFarcasterContext()) {
    return { 
      success: false, 
      error: 'not_in_farcaster_context' 
    };
  }
  
  try {
    const result = await sdk.actions.addMiniApp();
    return {
      success: true,
      notificationDetails: result.notificationDetails,
    };
  } catch (error: unknown) {
    // Handle specific errors
    const errorName = (error as { name?: string })?.name || '';
    
    if (errorName === 'AddMiniApp.RejectedByUser') {
      return { success: false, error: 'rejected_by_user' };
    }
    if (errorName === 'AddMiniApp.InvalidDomainManifest') {
      return { success: false, error: 'invalid_domain_manifest' };
    }
    
    console.error('Failed to add mini app:', error);
    return { success: false, error: 'unknown_error' };
  }
}

/**
 * Open compose cast dialog
 */
export async function openComposeCast(text: string, embeds?: string[]): Promise<boolean> {
  if (!isInFarcasterContext()) {
    // Fallback to Warpcast URL
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank');
    return true;
  }
  
  try {
    await sdk.actions.composeCast({
      text,
      embeds: embeds?.map(url => ({ url })),
    });
    return true;
  } catch (error) {
    console.error('Failed to open compose:', error);
    // Fallback to URL
    window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(text)}`, '_blank');
    return false;
  }
}

/**
 * View a user's profile
 */
export async function viewProfile(fid: number): Promise<boolean> {
  if (!isInFarcasterContext()) {
    window.open(`https://warpcast.com/~/profiles/${fid}`, '_blank');
    return true;
  }
  
  try {
    await sdk.actions.viewProfile({ fid });
    return true;
  } catch (error) {
    console.error('Failed to view profile:', error);
    window.open(`https://warpcast.com/~/profiles/${fid}`, '_blank');
    return false;
  }
}
