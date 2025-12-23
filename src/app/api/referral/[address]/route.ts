import { NextRequest, NextResponse } from 'next/server';
import { getReferrals } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const { total, pointsEarned, recent } = await getReferrals(address);

    return NextResponse.json({
      total_referrals: total,
      points_earned: pointsEarned,
      recent,
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    return NextResponse.json(
      { error: 'Failed to get referrals' },
      { status: 500 }
    );
  }
}
