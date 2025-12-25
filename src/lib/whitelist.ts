/**
 * Whitelist verification logic
 * Uses Neynar API for all Farcaster data (follow check, casts, user lookup)
 * Checks if user follows required FIDs, has casted about Visor, and added mini app
 */

const CREATOR_FID_1 = process.env.NEXT_PUBLIC_CREATOR_FID_1 || '250704';
const CREATOR_FID_2 = process.env.NEXT_PUBLIC_CREATOR_FID_2 || '1043335';

// Neynar API - used for all Farcaster data
const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

export interface WhitelistRequirements {
  followsCreator1: boolean;
  followsCreator2: boolean;
  hasCasted: boolean;
  hasAddedMiniApp: boolean;
  fid?: number;
}

export interface CreatorInfo {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

// Cache for creator info
let creatorInfoCache: { creator1?: CreatorInfo; creator2?: CreatorInfo } = {};

/**
 * Check if user meets whitelist requirements
 */
export async function checkWhitelistStatus(address: string): Promise<WhitelistRequirements> {
  try {
    // Get user's FID from address
    const userFid = await getFidFromAddress(address);
    
    if (!userFid) {
      return {
        followsCreator1: false,
        followsCreator2: false,
        hasCasted: false,
        hasAddedMiniApp: false,
      };
    }

    // Check follows, casts, and mini app in parallel
    const [followsCreator1, followsCreator2, hasCasted, hasAddedMiniApp] = await Promise.all([
      checkFollows(userFid, parseInt(CREATOR_FID_1)),
      checkFollows(userFid, parseInt(CREATOR_FID_2)),
      checkVisorCast(userFid),
      checkMiniAppAdded(userFid),
    ]);

    return {
      followsCreator1,
      followsCreator2,
      hasCasted,
      hasAddedMiniApp,
      fid: userFid,
    };
  } catch (error) {
    console.error('Failed to check whitelist status:', error);
    return {
      followsCreator1: false,
      followsCreator2: false,
      hasCasted: false,
      hasAddedMiniApp: false,
    };
  }
}

/**
 * Get FID from wallet address using Neynar API
 */
async function getFidFromAddress(address: string): Promise<number | null> {
  try {
    if (!NEYNAR_API_KEY) {
      console.error('[Whitelist] NEYNAR_API_KEY not set');
      return null;
    }

    console.log(`[Whitelist] Looking up FID for address: ${address}`);
    
    const response = await fetch(
      `${NEYNAR_API_URL}/user/bulk-by-address?addresses=${address.toLowerCase()}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Whitelist] Neynar API error: ${response.status}`, errorText);
      return null;
    }

    const data = await response.json();
    console.log(`[Whitelist] Neynar response for ${address}:`, JSON.stringify(data).substring(0, 200));
    
    const users = data[address.toLowerCase()];
    
    if (!users || users.length === 0) {
      console.log(`[Whitelist] No Farcaster user found for address: ${address}`);
      return null;
    }
    
    const fid = users[0].fid || null;
    console.log(`[Whitelist] Found FID ${fid} for address: ${address}`);
    return fid;
  } catch (error) {
    console.error('Failed to get FID:', error);
    return null;
  }
}

/**
 * Check if user follows a specific FID using Neynar API with viewer_context
 */
async function checkFollows(userFid: number, targetFid: number): Promise<boolean> {
  try {
    if (!NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not set');
      return false;
    }

    const response = await fetch(
      `${NEYNAR_API_URL}/user/bulk?fids=${targetFid}&viewer_fid=${userFid}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('Neynar API error:', response.status);
      return false;
    }

    const data = await response.json();
    const targetUser = data.users?.[0];
    
    if (!targetUser) return false;

    // viewer_context.following means the viewer (userFid) follows the target
    return targetUser.viewer_context?.following === true;
  } catch (error) {
    console.error('Failed to check follows:', error);
    return false;
  }
}

/**
 * Check if user has casted about Visor using Neynar API
 * Uses multiple methods to ensure we catch the cast:
 * 1. Check user's recent casts for "visor" keyword in text
 * 2. Check for casts with visor app URL in embeds
 */
async function checkVisorCast(userFid: number): Promise<boolean> {
  try {
    if (!NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not set');
      return false;
    }

    console.log(`[Whitelist] Checking casts for FID ${userFid}`);

    // Use user's feed endpoint to get their casts
    // Correct endpoint: /feed/user/{fid}/casts
    const feedResponse = await fetch(
      `${NEYNAR_API_URL}/feed/user/${userFid}/casts?limit=100&include_replies=true`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
      }
    );

    if (!feedResponse.ok) {
      const errorText = await feedResponse.text();
      console.error(`[Whitelist] Neynar feed API error: ${feedResponse.status}`, errorText);
      return false;
    }

    const feedData = await feedResponse.json();
    const casts = feedData.casts || [];
    
    console.log(`[Whitelist] Found ${casts.length} casts for FID ${userFid}`);
    
    // Check if any cast mentions "visor" in text or has visor URL in embeds
    const visorAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'visor-app';
    
    for (const cast of casts) {
      const text = (cast.text || '').toLowerCase();
      
      // Check text for "visor" (includes @visor mentions)
      if (text.includes('visor')) {
        console.log(`[Whitelist] Found cast with "visor" in text for FID ${userFid}:`, text.substring(0, 100));
        return true;
      }
      
      // Check embeds for visor app URL
      if (cast.embeds && Array.isArray(cast.embeds)) {
        for (const embed of cast.embeds) {
          const embedUrl = (embed.url || '').toLowerCase();
          if (embedUrl.includes('visor') || embedUrl.includes(visorAppUrl.toLowerCase())) {
            console.log(`[Whitelist] Found cast with visor URL in embed for FID ${userFid}:`, embedUrl);
            return true;
          }
        }
      }
    }

    console.log(`[Whitelist] No visor cast found for FID ${userFid} after checking ${casts.length} casts`);
    return false;
  } catch (error) {
    console.error('[Whitelist] Failed to check casts:', error);
    return false;
  }
}

/**
 * Check if user has added Visor mini app
 * Mini app status is tracked in database (via SDK callback)
 * This function returns false - actual check happens in whitelist API route
 */
async function checkMiniAppAdded(_userFid: number): Promise<boolean> {
  // Mini app status is tracked in database when user clicks "Add Mini App"
  // The SDK callback records it via /api/miniapp endpoint
  // This function returns false, and the actual status is merged in the API route
  return false;
}

/**
 * Fetch user info by FID using Neynar API
 */
async function fetchUserByFid(fid: number): Promise<CreatorInfo | null> {
  try {
    if (!NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not set');
      return null;
    }

    const response = await fetch(
      `${NEYNAR_API_URL}/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('Neynar API error:', response.status);
      return null;
    }

    const data = await response.json();
    const user = data.users?.[0];
    
    if (!user) return null;

    return {
      fid: user.fid,
      username: user.username || '',
      displayName: user.display_name || user.username || '',
      pfpUrl: user.pfp_url || '',
    };
  } catch (error) {
    console.error('Failed to fetch user by FID:', error);
    return null;
  }
}

/**
 * Get creator info (with caching)
 */
export async function getCreatorInfo(): Promise<{ creator1: CreatorInfo | null; creator2: CreatorInfo | null }> {
  // Return cached if available
  if (creatorInfoCache.creator1 && creatorInfoCache.creator2) {
    return {
      creator1: creatorInfoCache.creator1,
      creator2: creatorInfoCache.creator2,
    };
  }

  // Fetch both creators in parallel
  const [creator1, creator2] = await Promise.all([
    fetchUserByFid(parseInt(CREATOR_FID_1)),
    fetchUserByFid(parseInt(CREATOR_FID_2)),
  ]);

  // Cache the results
  if (creator1) creatorInfoCache.creator1 = creator1;
  if (creator2) creatorInfoCache.creator2 = creator2;

  return { creator1, creator2 };
}
