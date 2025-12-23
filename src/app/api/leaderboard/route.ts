import { NextRequest, NextResponse } from 'next/server';
import { getLeaderboard, getUserRank } from '@/lib/supabase';
import { getFarcasterUsersByAddresses } from '@/lib/farcaster';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userAddress = searchParams.get('user');

    const { entries, total } = await getLeaderboard(limit, offset);

    // Fetch Farcaster data for all addresses
    const addresses = entries.map((e) => e.wallet_address);
    const farcasterUsers = await getFarcasterUsersByAddresses(addresses);

    // Enrich entries with Farcaster data
    const enrichedEntries = entries.map((entry) => {
      const fcUser = farcasterUsers.get(entry.wallet_address.toLowerCase());
      return {
        ...entry,
        farcaster: fcUser
          ? {
              username: fcUser.username,
              displayName: fcUser.displayName,
              pfpUrl: fcUser.pfpUrl,
              fid: fcUser.fid,
            }
          : null,
      };
    });

    let userRank: number | undefined;
    if (userAddress) {
      userRank = await getUserRank(userAddress);
    }

    return NextResponse.json({
      entries: enrichedEntries,
      total,
      user_rank: userRank,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}
