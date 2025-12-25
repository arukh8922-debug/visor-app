/**
 * Send Notification API
 * 
 * POST /api/notifications/send
 * 
 * Body:
 * - fid: number (optional, send to specific user)
 * - fids: number[] (optional, send to multiple users)
 * - broadcast: boolean (optional, send to all users)
 * - title: string (required, max 32 chars)
 * - body: string (required, max 128 chars)
 * - targetUrl: string (required, must be on same domain)
 * - notificationId: string (optional, for deduplication)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  sendNotification, 
  sendNotificationToMany, 
  broadcastNotification 
} from '@/lib/notifications';

// Simple API key auth for admin endpoints
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key');
    if (!ADMIN_API_KEY || apiKey !== ADMIN_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fid, fids, broadcast, title, body: notifBody, targetUrl, notificationId } = body;

    // Validate required fields
    if (!title || !notifBody || !targetUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: title, body, targetUrl' },
        { status: 400 }
      );
    }

    // Validate targetUrl is on same domain
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://visor-app-opal.vercel.app';
    if (!targetUrl.startsWith(appUrl)) {
      return NextResponse.json(
        { error: 'targetUrl must be on the same domain as the Mini App' },
        { status: 400 }
      );
    }

    let result;

    if (broadcast) {
      // Send to all users
      result = await broadcastNotification(title, notifBody, targetUrl, notificationId || `broadcast-${Date.now()}`);
      return NextResponse.json({
        success: true,
        type: 'broadcast',
        ...result,
      });
    } else if (fids && Array.isArray(fids)) {
      // Send to multiple users
      result = await sendNotificationToMany(fids, title, notifBody, targetUrl, notificationId);
      return NextResponse.json({
        success: true,
        type: 'multi',
        ...result,
      });
    } else if (fid) {
      // Send to single user
      result = await sendNotification({
        fid,
        title,
        body: notifBody,
        targetUrl,
        notificationId,
      });
      return NextResponse.json({
        success: result.success,
        type: 'single',
        ...result,
      });
    } else {
      return NextResponse.json(
        { error: 'Must specify fid, fids, or broadcast=true' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Notifications API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
