/**
 * Notification Token API
 * 
 * POST /api/notifications/token - Save notification token from frontend
 * DELETE /api/notifications/token - Remove/disable notification token
 * 
 * This endpoint is called from frontend when user enables/disables notifications
 * via the Farcaster SDK (not from webhook)
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { z } from 'zod';

const saveTokenSchema = z.object({
  fid: z.number().int().positive(),
  token: z.string().min(1),
  url: z.string().url(),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

const disableTokenSchema = z.object({
  fid: z.number().int().positive(),
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

/**
 * Save notification token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Notification Token] Received save request:', body);

    const validation = saveTokenSchema.safeParse(body);
    if (!validation.success) {
      console.log('[Notification Token] Validation failed:', validation.error);
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { fid, token, url, wallet_address } = validation.data;

    // Save token to database using upsert
    const { error } = await supabaseAdmin
      .from('notification_tokens')
      .upsert(
        {
          fid,
          token,
          url,
          enabled: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'fid',
        }
      );

    if (error) {
      console.error('[Notification Token] Failed to save:', error);
      return NextResponse.json(
        { error: 'Failed to save notification token' },
        { status: 500 }
      );
    }

    // Also update user's has_enabled_notifications if wallet_address provided
    if (wallet_address) {
      await supabaseAdmin
        .from('users')
        .update({
          has_enabled_notifications: true,
          notifications_enabled_at: new Date().toISOString(),
        })
        .eq('wallet_address', wallet_address.toLowerCase());
    }

    console.log('[Notification Token] Saved successfully for FID:', fid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notification Token] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Disable notification token (when user disables notifications)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Notification Token] Received disable request:', body);

    const validation = disableTokenSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { fid, wallet_address } = validation.data;

    // Disable token in database
    const { error } = await supabaseAdmin
      .from('notification_tokens')
      .update({
        enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('fid', fid);

    if (error) {
      console.error('[Notification Token] Failed to disable:', error);
      return NextResponse.json(
        { error: 'Failed to disable notification token' },
        { status: 500 }
      );
    }

    // Also update user's has_enabled_notifications if wallet_address provided
    if (wallet_address) {
      await supabaseAdmin
        .from('users')
        .update({
          has_enabled_notifications: false,
          notifications_enabled_at: null,
        })
        .eq('wallet_address', wallet_address.toLowerCase());
    }

    console.log('[Notification Token] Disabled for FID:', fid);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Notification Token] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
