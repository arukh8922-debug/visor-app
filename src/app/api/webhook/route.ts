/**
 * Farcaster Webhook Handler
 * Handles events from Farcaster mini app
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Webhook received:', body);

    // Handle different event types
    const { event, data } = body;

    switch (event) {
      case 'frame_added':
        // User added the mini app
        console.log('User added mini app:', data);
        break;
      case 'frame_removed':
        // User removed the mini app
        console.log('User removed mini app:', data);
        break;
      case 'notifications_enabled':
        // User enabled notifications
        console.log('Notifications enabled:', data);
        break;
      case 'notifications_disabled':
        // User disabled notifications
        console.log('Notifications disabled:', data);
        break;
      default:
        console.log('Unknown event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
