import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { validateBody } from '@/lib/validation';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { z } from 'zod';

const notificationsSchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitMiddleware(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.clone().json();
    console.log('[notifications-enabled] Received request:', body);
    
    const validation = await validateBody(request, notificationsSchema);
    if (!validation.success) {
      console.log('[notifications-enabled] Validation failed:', validation.error);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address } = validation.data;
    const normalizedAddress = wallet_address.toLowerCase();
    console.log('[notifications-enabled] Normalized address:', normalizedAddress);

    // Check if user exists
    const user = await getUser(normalizedAddress);
    console.log('[notifications-enabled] User found:', !!user);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please connect wallet first.' },
        { status: 404 }
      );
    }

    // Record notifications enabled
    const { error } = await supabase
      .from('users')
      .update({
        has_enabled_notifications: true,
        notifications_enabled_at: new Date().toISOString(),
      })
      .eq('wallet_address', normalizedAddress);

    if (error) {
      console.error('[notifications-enabled] Failed to update:', error);
      return NextResponse.json(
        { error: 'Failed to record notifications enabled' },
        { status: 500 }
      );
    }

    console.log('[notifications-enabled] Success for:', normalizedAddress);
    return NextResponse.json({
      success: true,
      message: 'Notifications enabled successfully',
    });
  } catch (error) {
    console.error('[notifications-enabled] Error:', error);
    return NextResponse.json(
      { error: 'Failed to record notifications enabled' },
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
      has_enabled_notifications: user?.has_enabled_notifications || false,
      notifications_enabled_at: user?.notifications_enabled_at || null,
    });
  } catch (error) {
    console.error('Notifications check error:', error);
    return NextResponse.json(
      { error: 'Failed to check notifications status' },
      { status: 500 }
    );
  }
}
