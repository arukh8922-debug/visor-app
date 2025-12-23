import { NextRequest, NextResponse } from 'next/server';
import { recordNFTMint } from '@/lib/supabase';
import { validateBody, mintCallbackSchema } from '@/lib/validation';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting - stricter for mint callback (20 per minute)
  const rateLimitResponse = rateLimitMiddleware(request, 20);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, mintCallbackSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address, tx_hash, amount } = validation.data;

    const result = await recordNFTMint(wallet_address, amount, tx_hash);

    return NextResponse.json({
      success: true,
      points_added: result.pointsAdded,
    });
  } catch (error) {
    console.error('Mint callback error:', error);
    return NextResponse.json(
      { error: 'Failed to process mint callback' },
      { status: 500 }
    );
  }
}
