import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/cast
 * Record that user has casted about Visor
 * Called when user clicks "Cast" button and opens compose dialog
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: 'wallet_address is required' },
        { status: 400 }
      );
    }

    // Update user's has_casted status
    const { error } = await supabase
      .from('users')
      .update({
        has_casted: true,
        casted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('wallet_address', wallet_address.toLowerCase());

    if (error) {
      console.error('[Cast API] Failed to update cast status:', error);
      return NextResponse.json(
        { error: 'Failed to record cast' },
        { status: 500 }
      );
    }

    console.log(`[Cast API] Recorded cast for ${wallet_address}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cast API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
