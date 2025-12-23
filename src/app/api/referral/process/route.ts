import { NextRequest, NextResponse } from 'next/server';
import { processReferral } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referrer_address, referred_address } = body;

    if (!referrer_address || !referred_address) {
      return NextResponse.json(
        { error: 'referrer_address and referred_address are required' },
        { status: 400 }
      );
    }

    if (referrer_address.toLowerCase() === referred_address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot refer yourself' },
        { status: 400 }
      );
    }

    const result = await processReferral(referrer_address, referred_address);

    return NextResponse.json({
      success: result.success,
      points_awarded: result.pointsAwarded,
    });
  } catch (error) {
    console.error('Referral process error:', error);
    return NextResponse.json(
      { error: 'Failed to process referral' },
      { status: 500 }
    );
  }
}
