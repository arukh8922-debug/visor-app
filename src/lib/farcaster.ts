/**
 * Farcaster User Data Utilities
 * Uses Neynar API (free tier available)
 */

const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster';
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || '';

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
 * Get Farcaster user by wallet address using Neynar API
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
    // Neynar bulk-by-address endpoint
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
      userCache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    const data = await response.json();
    // Response format: { [address]: [user1, user2, ...] }
    const users = data[address.toLowerCase()];
    
    if (!users || users.length === 0) {
      userCache.set(cacheKey, null);
      cacheTimestamps.set(cacheKey, Date.now());
      return null;
    }

    // Take the first user (primary account)
    const neynarUser = users[0];
    const user: FarcasterUser = {
      fid: neynarUser.fid,
      username: neynarUser.username || '',
      displayName: neynarUser.display_name || neynarUser.username || '',
      pfpUrl: neynarUser.pfp_url || '',
    };
    
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
 * Neynar supports up to 350 addresses per request
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

  if (uncachedAddresses.length === 0) {
    return result;
  }

  // Neynar supports up to 350 addresses per request
  const batchSize = 350;
  for (let i = 0; i < uncachedAddresses.length; i += batchSize) {
    const batch = uncachedAddresses.slice(i, i + batchSize);
    const addressList = batch.map(a => a.toLowerCase()).join(',');

    try {
      const response = await fetch(
        `${NEYNAR_API_URL}/user/bulk-by-address?addresses=${addressList}`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': NEYNAR_API_KEY,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        for (const addr of batch) {
          const key = addr.toLowerCase();
          const users = data[key];
          
          if (users && users.length > 0) {
            const neynarUser = users[0];
            const user: FarcasterUser = {
              fid: neynarUser.fid,
              username: neynarUser.username || '',
              displayName: neynarUser.display_name || neynarUser.username || '',
              pfpUrl: neynarUser.pfp_url || '',
            };
            result.set(key, user);
            userCache.set(key, user);
          } else {
            result.set(key, null);
            userCache.set(key, null);
          }
          cacheTimestamps.set(key, Date.now());
        }
      }
    } catch (error) {
      console.error('Failed to batch fetch Farcaster users:', error);
      // Set null for failed addresses
      for (const addr of batch) {
        const key = addr.toLowerCase();
        result.set(key, null);
        userCache.set(key, null);
        cacheTimestamps.set(key, Date.now());
      }
    }
  }

  return result;
}

/**
 * Get Farcaster user by FID using Neynar API
 */
export async function getFarcasterUserByFid(
  fid: number
): Promise<FarcasterUser | null> {
  try {
    const response = await fetch(
      `${NEYNAR_API_URL}/user/bulk?fids=${fid}`,
      {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const users = data.users;

    if (!users || users.length === 0) return null;

    const neynarUser = users[0];
    return {
      fid: neynarUser.fid,
      username: neynarUser.username || '',
      displayName: neynarUser.display_name || neynarUser.username || '',
      pfpUrl: neynarUser.pfp_url || '',
    };
  } catch (error) {
    console.error('Failed to fetch Farcaster user by FID:', error);
    return null;
  }
}
