/**
 * Points API
 * Handles points queries and updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserPoints, addPoints, getLeaderboard, POINTS } from '@/lib/points';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address');
  const action = searchParams.get('action');

  if (action === 'leaderboard') {
    const limit = parseInt(searchParams.get('limit') || '50');
    const leaderboard = await getLeaderboard(limit);
    return NextResponse.json({ leaderboard });
  }

  if (!address) {
    return NextResponse.json({ error: 'Address required' }, { status: 400 });
  }

  const points = await getUserPoints(address);
  return NextResponse.json({ address, points });
}

export async function POST(request: NextRequest) {
  try {
    const { address, reason, txHash } = await request.json();

    if (!address || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate reason
    const validReasons = ['nft_mint', 'referral', 'daily_tx'] as const;
    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason' },
        { status: 400 }
      );
    }

    const amount = POINTS[reason.toUpperCase() as keyof typeof POINTS];
    const success = await addPoints(address, amount, reason);

    if (success) {
      return NextResponse.json({ success: true, pointsAdded: amount });
    } else {
      return NextResponse.json(
        { error: 'Failed to add points' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Points API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
