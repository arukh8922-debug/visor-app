/**
 * Whitelist verification logic
 * Checks if user follows required FIDs and has casted about Visor
 */

const CREATOR_FID_1 = process.env.NEXT_PUBLIC_CREATOR_FID_1 || '250704';
const CREATOR_FID_2 = process.env.NEXT_PUBLIC_CREATOR_FID_2 || '1043335';
const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

export interface WhitelistRequirements {
  followsCreator1: boolean;
  followsCreator2: boolean;
  hasCasted: boolean;
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
      };
    }

    // Check follows and casts in parallel
    const [followsCreator1, followsCreator2, hasCasted] = await Promise.all([
      checkFollows(userFid, parseInt(CREATOR_FID_1)),
      checkFollows(userFid, parseInt(CREATOR_FID_2)),
      checkVisorCast(userFid),
    ]);

    return {
      followsCreator1,
      followsCreator2,
      hasCasted,
      fid: userFid,
    };
  } catch (error) {
    console.error('Failed to check whitelist status:', error);
    return {
      followsCreator1: false,
      followsCreator2: false,
      hasCasted: false,
    };
  }
}

/**
 * Get FID from wallet address using Neynar API
 */
async function getFidFromAddress(address: string): Promise<number | null> {
  if (!NEYNAR_API_KEY) {
    console.warn('Neynar API key not configured');
    return null;
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/by_verification?address=${address}`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data.user?.fid || null;
  } catch (error) {
    console.error('Failed to get FID:', error);
    return null;
  }
}

/**
 * Check if user follows a specific FID
 */
async function checkFollows(userFid: number, targetFid: number): Promise<boolean> {
  if (!NEYNAR_API_KEY) return false;

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${userFid}&viewer_fid=${targetFid}`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    // Check if the user follows the target
    return data.users?.[0]?.viewer_context?.following || false;
  } catch (error) {
    console.error('Failed to check follows:', error);
    return false;
  }
}

/**
 * Check if user has casted about Visor
 */
async function checkVisorCast(userFid: number): Promise<boolean> {
  if (!NEYNAR_API_KEY) return false;

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/feed/user/${userFid}/casts?limit=100`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) return false;

    const data = await response.json();
    const casts = data.casts || [];
    
    // Check if any cast mentions "visor" (case insensitive)
    return casts.some((cast: { text: string }) => 
      cast.text.toLowerCase().includes('visor')
    );
  } catch (error) {
    console.error('Failed to check casts:', error);
    return false;
  }
}

/**
 * Fetch user info by FID from Neynar API
 */
async function fetchUserByFid(fid: number): Promise<CreatorInfo | null> {
  if (!NEYNAR_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'api_key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) return null;

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
