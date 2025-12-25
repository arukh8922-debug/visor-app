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
 * Works on both iOS and Android
 */
export function isInFarcasterContext(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for Farcaster-specific indicators in user agent
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('warpcast') || userAgent.includes('farcaster')) {
      return true;
    }
    
    // Check URL params (Farcaster adds these)
    const url = new URL(window.location.href);
    if (url.searchParams.has('fc_frame') || url.searchParams.has('fid')) {
      return true;
    }
    
    // Check if opened in iframe (mini apps run in iframe)
    if (window.self !== window.top) {
      return true;
    }
    
    // Check for Farcaster SDK ready state
    // @ts-ignore - check if sdk has been initialized
    if (window.__FARCASTER_MINIAPP_SDK_READY__) {
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
 * Works on iOS and Android Farcaster apps
 * 
 * Note on mentions: Use @username format in text (e.g., "Hello @dwr!")
 * The Farcaster client will automatically convert valid usernames to mentions.
 * Make sure usernames are valid Farcaster usernames (no spaces, lowercase).
 */
export async function openComposeCast(text: string, embeds?: string[]): Promise<boolean> {
  // Build embeds array for URL fallback
  const embedsParam = embeds?.map(e => `&embeds[]=${encodeURIComponent(e)}`).join('') || '';
  const composeUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${embedsParam}`;
  
  // Always try SDK first (works in mini app context)
  try {
    await sdk.actions.composeCast({
      text,
      embeds: embeds as [string] | [string, string] | undefined,
    });
    return true;
  } catch (error) {
    console.log('[Farcaster] SDK composeCast failed, trying fallback:', error);
    
    // Fallback: try opening Warpcast URL
    // On iOS in mini app, window.open may not work, so we also try location.href
    try {
      // First try window.open
      const newWindow = window.open(composeUrl, '_blank');
      if (!newWindow) {
        // If blocked, try direct navigation (will leave the app)
        window.location.href = composeUrl;
      }
      return true;
    } catch (fallbackError) {
      console.error('[Farcaster] Fallback also failed:', fallbackError);
      // Last resort: copy to clipboard and alert user
      try {
        await navigator.clipboard.writeText(`${text}\n\n${embeds?.[0] || ''}`);
        alert('Link copied! Paste it in a new cast on Warpcast.');
        return true;
      } catch {
        return false;
      }
    }
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
