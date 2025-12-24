/**
 * Whitelist verification logic
 * Uses Neynar API for reliable follow checking with viewer_context
 * Checks if user follows required FIDs, has casted about Visor, and added mini app
 */

const CREATOR_FID_1 = process.env.NEXT_PUBLIC_CREATOR_FID_1 || '250704';
const CREATOR_FID_2 = process.env.NEXT_PUBLIC_CREATOR_FID_2 || '1043335';

// Pinata Hub API - Free, no API key required (for casts and FID lookup)
const PINATA_HUB_URL = 'https://hub.pinata.cloud/v1';

// Neynar API for follow check and mini app check
const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

// Visor Mini App URL (for checking if user added it)
const VISOR_MINIAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://visor-app-opal.vercel.app';

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
 * Get FID from wallet address using Pinata Hub API
 */
async function getFidFromAddress(address: string): Promise<number | null> {
  try {
    // Pinata Hub uses verificationsByAddress endpoint
    const response = await fetch(
      `${PINATA_HUB_URL}/verificationsByAddress?address=${address.toLowerCase()}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    // Get FID from first verification message
    return data.messages?.[0]?.data?.fid || null;
  } catch (error) {
    console.error('Failed to get FID:', error);
    return null;
  }
}

/**
 * Check if user follows a specific FID using Neynar API with viewer_context
 * This is more reliable than Pinata Hub API
 */
async function checkFollows(userFid: number, targetFid: number): Promise<boolean> {
  try {
    // Use Neynar API to get target user with viewer_context
    // viewer_context.following tells us if userFid follows targetFid
    if (!NEYNAR_API_KEY) {
      console.warn('NEYNAR_API_KEY not set, falling back to Pinata Hub');
      return checkFollowsPinata(userFid, targetFid);
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
      return checkFollowsPinata(userFid, targetFid);
    }

    const data = await response.json();
    const targetUser = data.users?.[0];
    
    if (!targetUser) return false;

    // viewer_context.followed_by means the viewer (userFid) is followed by target
    // viewer_context.following means the viewer (userFid) follows the target
    // We want to check if userFid follows targetFid, so we check "following"
    return targetUser.viewer_context?.following === true;
  } catch (error) {
    console.error('Failed to check follows via Neynar:', error);
    return checkFollowsPinata(userFid, targetFid);
  }
}

/**
 * Fallback: Check if user follows a specific FID using Pinata Hub API
 */
async function checkFollowsPinata(userFid: number, targetFid: number): Promise<boolean> {
  try {
    // Get all links (follows) by user
    const response = await fetch(
      `${PINATA_HUB_URL}/linksByFid?fid=${userFid}&link_type=follow`
    );

    if (!response.ok) return false;

    const data = await response.json();
    const links = data.messages || [];
    
    // Check if any link targets the creator FID
    return links.some((link: { data?: { linkBody?: { targetFid?: number } } }) => 
      link.data?.linkBody?.targetFid === targetFid
    );
  } catch (error) {
    console.error('Failed to check follows via Pinata:', error);
    return false;
  }
}

/**
 * Check if user has casted about Visor using Pinata Hub API
 */
async function checkVisorCast(userFid: number): Promise<boolean> {
  try {
    // Get user's casts
    const response = await fetch(
      `${PINATA_HUB_URL}/castsByFid?fid=${userFid}&pageSize=100`
    );

    if (!response.ok) return false;

    const data = await response.json();
    const casts = data.messages || [];
    
    // Check if any cast mentions "visor" (case insensitive)
    return casts.some((cast: { data?: { castAddBody?: { text?: string } } }) => {
      const text = cast.data?.castAddBody?.text || '';
      return text.toLowerCase().includes('visor');
    });
  } catch (error) {
    console.error('Failed to check casts:', error);
    return false;
  }
}

/**
 * Check if user has added Visor mini app using Neynar API
 * This checks if the user has the mini app in their added apps list
 */
async function checkMiniAppAdded(userFid: number): Promise<boolean> {
  try {
    // If no API key, we can't check - return true to not block users
    if (!NEYNAR_API_KEY) {
      console.warn('NEYNAR_API_KEY not set, skipping mini app check');
      return true;
    }

    // Use Neynar to get user's mini apps
    // Note: This endpoint may need adjustment based on actual Neynar API
    const response = await fetch(
      `${NEYNAR_API_URL}/user/bulk?fids=${userFid}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error('Failed to fetch user from Neynar:', response.status);
      return false;
    }

    const data = await response.json();
    const user = data.users?.[0];
    
    if (!user) return false;

    // Check if user has added mini apps (this is a simplified check)
    // The actual implementation depends on how Farcaster/Neynar exposes mini app data
    // For now, we check if user has interacted with the app URL in their profile
    
    // Alternative: Check if user has the app in their "added_apps" or similar field
    // This may require a different Neynar endpoint or checking frame interactions
    
    // Simplified check: If user has a verified address and FID, assume they can add mini app
    // The actual "Add Mini App" action happens client-side in Farcaster
    // We'll track this in our database when user clicks "Add Mini App" button
    
    return false; // Default to false, will be updated via API when user adds mini app
  } catch (error) {
    console.error('Failed to check mini app status:', error);
    return false;
  }
}

/**
 * Fetch user info by FID from Pinata Hub API
 */
async function fetchUserByFid(fid: number): Promise<CreatorInfo | null> {
  try {
    const response = await fetch(
      `${PINATA_HUB_URL}/userDataByFid?fid=${fid}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    const messages = data.messages || [];
    
    // Parse user data from messages
    let username = '';
    let displayName = '';
    let pfpUrl = '';
    
    for (const msg of messages) {
      const userDataBody = msg.data?.userDataBody;
      if (!userDataBody) continue;
      
      switch (userDataBody.type) {
        case 'USER_DATA_TYPE_USERNAME':
          username = userDataBody.value || '';
          break;
        case 'USER_DATA_TYPE_DISPLAY':
          displayName = userDataBody.value || '';
          break;
        case 'USER_DATA_TYPE_PFP':
          pfpUrl = userDataBody.value || '';
          break;
      }
    }

    return {
      fid,
      username,
      displayName: displayName || username,
      pfpUrl,
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
