/**
 * Platform Detection Utility
 * Detects: Farcaster Mini App (Mobile/Desktop), Base App, Browser
 */

export type Platform = 
  | 'farcaster_mobile'
  | 'farcaster_desktop'
  | 'base_app'
  | 'browser';

/**
 * Check if running inside Farcaster Mini App
 */
function isInFarcaster(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check URL params for fc context
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('fc_context')) return true;
    
    // Check if embedded in Warpcast iframe
    if (window.parent !== window) {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes('warpcast')) return true;
    }
    
    // Check for Farcaster SDK global
    if ('farcaster' in window) return true;
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
}

/**
 * Check if running inside Base App
 */
function isInBaseApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('base_context')) return true;
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('base')) return true;
    
    // Check for Coinbase/MiniKit context
    if ('coinbase' in window || 'minikit' in window) return true;
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'browser';
  
  // Check Farcaster first
  if (isInFarcaster()) {
    return isMobileDevice() ? 'farcaster_mobile' : 'farcaster_desktop';
  }
  
  // Check Base App
  if (isInBaseApp()) return 'base_app';
  
  // Default to browser
  return 'browser';
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case 'farcaster_mobile':
      return 'Farcaster Mini App (Mobile)';
    case 'farcaster_desktop':
      return 'Farcaster Mini App (Desktop)';
    case 'base_app':
      return 'Base App';
    case 'browser':
      return 'Browser';
  }
}

/**
 * Get platform short name for database
 */
export function getPlatformShortName(platform: Platform): string {
  switch (platform) {
    case 'farcaster_mobile':
      return 'fc_mobile';
    case 'farcaster_desktop':
      return 'fc_desktop';
    case 'base_app':
      return 'base_app';
    case 'browser':
      return 'browser';
  }
}
