/**
 * Farcaster User Data Utilities
 * Uses Pinata Hub API (free, no API key required)
 */

// Pinata Hub API - Free, no API key required
const PINATA_HUB_URL = 'https://hub.pinata.cloud/v1';

export interface FarcasterUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

// Cache for user data (in-memory, resets on server restart)
const userCache = new Map<string, FarcasterUser | null>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cacheTimestamps = new Map<string, number>();

/**
 * Get Farcaster user by wallet address using Pinata Hub API
 */
export async function getFarcasterUserByAddress(
  address: string
): Promise<FarcasterUser | null> {
  const cacheKey = address.toLowerCase();

  // Check cache
  const cached = userCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);
  if (cached !== undefined && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return cached;
  }

  try {
    // First get FID from address verification
    const verifyResponse = await fetch(
      `${PINATA_HUB_URL}/verificationsByAddress?address=${address.toLowerCase()}`
    );

    if (!verifyResponse.ok) {
      userCache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    const verifyData = await verifyResponse.json();
    const fid = verifyData.messages?.[0]?.data?.fid;

    if (!fid) {
      userCache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    // Then get user data by FID
    const user = await getFarcasterUserByFid(fid);
    
    userCache.set(cacheKey, user);
    cacheTimestamps.set(cacheKey, Date.now());

    return user;
  } catch (error) {
    console.error('Failed to fetch Farcaster user:', error);
    return null;
  }
}

/**
 * Get Farcaster users by multiple wallet addresses (batch)
 * Returns a map of address -> FarcasterUser
 */
export async function getFarcasterUsersByAddresses(
  addresses: string[]
): Promise<Map<string, FarcasterUser | null>> {
  const result = new Map<string, FarcasterUser | null>();

  if (addresses.length === 0) {
    return result;
  }

  // Check cache first
  const uncachedAddresses: string[] = [];
  for (const address of addresses) {
    const cacheKey = address.toLowerCase();
    const cached = userCache.get(cacheKey);
    const timestamp = cacheTimestamps.get(cacheKey);

    if (cached !== undefined && timestamp && Date.now() - timestamp < CACHE_TTL) {
      result.set(cacheKey, cached);
    } else {
      uncachedAddresses.push(address);
    }
  }

  // Fetch uncached addresses in parallel (max 10 concurrent)
  const batchSize = 10;
  for (let i = 0; i < uncachedAddresses.length; i += batchSize) {
    const batch = uncachedAddresses.slice(i, i + batchSize);
    const promises = batch.map((addr) => getFarcasterUserByAddress(addr));
    const results = await Promise.all(promises);

    batch.forEach((addr, index) => {
      result.set(addr.toLowerCase(), results[index]);
    });
  }

  return result;
}

/**
 * Get Farcaster user by FID using Pinata Hub API
 */
export async function getFarcasterUserByFid(
  fid: number
): Promise<FarcasterUser | null> {
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

    if (!username && !displayName) return null;

    return {
      fid,
      username,
      displayName: displayName || username,
      pfpUrl,
    };
  } catch (error) {
    console.error('Failed to fetch Farcaster user by FID:', error);
    return null;
  }
}
