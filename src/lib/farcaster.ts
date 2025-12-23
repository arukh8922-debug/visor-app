/**
 * Farcaster User Data Utilities
 * Fetch user info from Neynar API
 */

const NEYNAR_API_KEY = process.env.NEXT_PUBLIC_NEYNAR_API_KEY || '';

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
 * Get Farcaster user by wallet address
 */
export async function getFarcasterUserByAddress(
  address: string
): Promise<FarcasterUser | null> {
  if (!NEYNAR_API_KEY) return null;

  const cacheKey = address.toLowerCase();

  // Check cache
  const cached = userCache.get(cacheKey);
  const timestamp = cacheTimestamps.get(cacheKey);
  if (cached !== undefined && timestamp && Date.now() - timestamp < CACHE_TTL) {
    return cached;
  }

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/by_verification?address=${address}`,
      {
        headers: {
          api_key: NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) {
      userCache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    const data = await response.json();
    const user = data.user;

    if (!user) {
      userCache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    const farcasterUser: FarcasterUser = {
      fid: user.fid,
      username: user.username || '',
      displayName: user.display_name || user.username || '',
      pfpUrl: user.pfp_url || '',
    };

    userCache.set(cacheKey, farcasterUser);
    cacheTimestamps.set(cacheKey, Date.now());

    return farcasterUser;
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

  if (!NEYNAR_API_KEY || addresses.length === 0) {
    addresses.forEach((addr) => result.set(addr.toLowerCase(), null));
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
 * Get Farcaster user by FID
 */
export async function getFarcasterUserByFid(
  fid: number
): Promise<FarcasterUser | null> {
  if (!NEYNAR_API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          api_key: NEYNAR_API_KEY,
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
    console.error('Failed to fetch Farcaster user by FID:', error);
    return null;
  }
}
