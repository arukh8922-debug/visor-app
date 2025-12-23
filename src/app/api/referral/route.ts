/**
 * Referral API
 * Handles referral tracking and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { processReferral } from '@/lib/referral';

export async function POST(request: NextRequest) {
  try {
    const { referrerAddress, referredAddress } = await request.json();

    if (!referrerAddress || !referredAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Don't allow self-referral
    if (referrerAddress.toLowerCase() === referredAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot refer yourself' },
        { status: 400 }
      );
    }

    const success = await processReferral(referrerAddress, referredAddress);

    if (success) {
      return NextResponse.json({ success: true, message: 'Referral processed' });
    } else {
      return NextResponse.json(
        { error: 'Referral already exists or failed' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Referral API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
