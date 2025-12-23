import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, processReferral } from '@/lib/supabase';
import { validateBody, registerUserSchema } from '@/lib/validation';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate request body
    const validation = await validateBody(request, registerUserSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address, fid, referrer } = validation.data;

    // Create or get user
    const user = await getOrCreateUser(wallet_address, fid);

    // Process referral if present
    let referralProcessed = false;
    if (referrer && referrer !== wallet_address.toLowerCase()) {
      try {
        const result = await processReferral(referrer, wallet_address);
        referralProcessed = result.success;
      } catch (error) {
        console.error('Referral processing failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      user,
      referral_processed: referralProcessed,
    });
  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
