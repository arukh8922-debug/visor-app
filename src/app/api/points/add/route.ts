import { NextRequest, NextResponse } from 'next/server';
import { addPoints } from '@/lib/supabase';
import { validateBody, addPointsSchema } from '@/lib/validation';
import { rateLimitMiddleware } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate request body with Zod
    const validation = await validateBody(request, addPointsSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address, amount, reason, tx_hash } = validation.data;

    const newTotal = await addPoints(wallet_address, amount, reason, tx_hash);

    return NextResponse.json({
      success: true,
      new_total: newTotal,
    });
  } catch (error) {
    console.error('Add points error:', error);
    return NextResponse.json(
      { error: 'Failed to add points' },
      { status: 500 }
    );
  }
}
