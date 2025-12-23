import { NextRequest, NextResponse } from 'next/server';
import { recordDailyCheckin } from '@/lib/supabase';
import { validateBody, checkinSchema } from '@/lib/validation';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { verifyCheckinTransaction } from '@/lib/checkin';

export async function POST(request: NextRequest) {
  // Rate limiting - stricter for checkin (10 per minute)
  const rateLimitResponse = rateLimitMiddleware(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate request body
    const validation = await validateBody(request, checkinSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address, tx_hash, platform } = validation.data;

    // Verify the onchain transaction
    const verification = await verifyCheckinTransaction(
      tx_hash as `0x${string}`,
      wallet_address
    );
    
    if (!verification.valid) {
      return NextResponse.json(
        { error: verification.error || 'Invalid transaction' },
        { status: 400 }
      );
    }

    // Record checkin with tx_hash and platform
    const result = await recordDailyCheckin(wallet_address, tx_hash, platform);

    return NextResponse.json({
      success: true,
      points_awarded: result.pointsAwarded,
      streak: result.streak,
      bonus_awarded: result.bonusAwarded,
      tx_hash,
      platform,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('Already checked in')) {
      return NextResponse.json(
        { error: 'Already checked in today', already_checked_in: true },
        { status: 400 }
      );
    }

    console.error('Daily checkin error:', error);
    return NextResponse.json(
      { error: 'Failed to record daily checkin' },
      { status: 500 }
    );
  }
}
