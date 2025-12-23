/**
 * Whitelist verification logic
 * Uses Pinata Hub API (free, no API key required)
 * Checks if user follows required FIDs and has casted about Visor
 */

const CREATOR_FID_1 = process.env.NEXT_PUBLIC_CREATOR_FID_1 || '250704';
const CREATOR_FID_2 = process.env.NEXT_PUBLIC_CREATOR_FID_2 || '1043335';

// Pinata Hub API - Free, no API key required
const PINATA_HUB_URL = 'https://hub.pinata.cloud/v1';

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
 * Check if user follows a specific FID using Pinata Hub API
 */
async function checkFollows(userFid: number, targetFid: number): Promise<boolean> {
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
    console.error('Failed to check follows:', error);
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
