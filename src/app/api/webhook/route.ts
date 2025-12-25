/**
 * Farcaster Webhook Handler
 * Handles events from Farcaster mini app including notification tokens
 * 
 * Events:
 * - miniapp_added: User added the mini app (may include notificationDetails)
 * - miniapp_removed: User removed the mini app
 * - notifications_enabled: User enabled notifications
 * - notifications_disabled: User disabled notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  saveNotificationToken, 
  disableNotificationToken, 
  removeNotificationTokensByFid 
} from '@/lib/notifications';

// Webhook event types from Farcaster
interface WebhookEvent {
  event: string;
  data: {
    fid: number;
    notificationDetails?: {
      token: string;
      url: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as WebhookEvent;
    console.log('[Webhook] Received:', JSON.stringify(body, null, 2));

    const { event, data } = body;
    const { fid, notificationDetails } = data;

    if (!fid) {
      console.error('[Webhook] Missing fid in event data');
      return NextResponse.json({ error: 'Missing fid' }, { status: 400 });
    }

    switch (event) {
      case 'miniapp_added':
        // User added the mini app - save notification token if provided
        console.log('[Webhook] Mini app added by FID:', fid);
        if (notificationDetails?.token && notificationDetails?.url) {
          await saveNotificationToken(fid, notificationDetails.token, notificationDetails.url);
          console.log('[Webhook] Notification token saved for FID:', fid);
        }
        break;

      case 'miniapp_removed':
        // User removed the mini app - invalidate all tokens for this FID
        console.log('[Webhook] Mini app removed by FID:', fid);
        await removeNotificationTokensByFid(fid);
        break;

      case 'notifications_enabled':
        // User enabled notifications - save new token
        console.log('[Webhook] Notifications enabled for FID:', fid);
        if (notificationDetails?.token && notificationDetails?.url) {
          await saveNotificationToken(fid, notificationDetails.token, notificationDetails.url);
          console.log('[Webhook] Notification token saved for FID:', fid);
        }
        break;

      case 'notifications_disabled':
        // User disabled notifications - disable tokens for this FID
        console.log('[Webhook] Notifications disabled for FID:', fid);
        await disableNotificationToken(fid);
        break;

      default:
        console.log('[Webhook] Unknown event:', event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
