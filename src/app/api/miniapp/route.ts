import { NextRequest, NextResponse } from 'next/server';
import { recordMiniAppAdded, recordMiniAppRemoved, getUser } from '@/lib/supabase';
import { validateBody } from '@/lib/validation';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { z } from 'zod';

const miniAppSchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitMiddleware(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const validation = await validateBody(request, miniAppSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address } = validation.data;

    // Check if user exists
    const user = await getUser(wallet_address);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please connect wallet first.' },
        { status: 404 }
      );
    }

    // Record mini app added
    await recordMiniAppAdded(wallet_address);

    return NextResponse.json({
      success: true,
      message: 'Mini app added successfully',
    });
  } catch (error) {
    console.error('Mini app record error:', error);
    return NextResponse.json(
      { error: 'Failed to record mini app addition' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const user = await getUser(address);
    
    return NextResponse.json({
      has_added_miniapp: user?.has_added_miniapp || false,
      miniapp_added_at: user?.miniapp_added_at || null,
    });
  } catch (error) {
    console.error('Mini app check error:', error);
    return NextResponse.json(
      { error: 'Failed to check mini app status' },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitMiddleware(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const validation = await validateBody(request, miniAppSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address } = validation.data;

    // Check if user exists
    const user = await getUser(wallet_address);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      );
    }

    // Record mini app removed
    await recordMiniAppRemoved(wallet_address);

    return NextResponse.json({
      success: true,
      message: 'Mini app removed successfully',
    });
  } catch (error) {
    console.error('Mini app remove error:', error);
    return NextResponse.json(
      { error: 'Failed to record mini app removal' },
      { status: 500 }
    );
  }
}
