/**
 * Farcaster Mini App Notifications
 * 
 * This module handles:
 * - Storing notification tokens from webhook events
 * - Sending push notifications to users
 * 
 * Flow:
 * 1. User adds mini app → webhook receives token → saveNotificationToken()
 * 2. App wants to notify user → sendNotification() → POST to Farcaster client URL
 */

import { supabase } from './supabase';

// ===========================================
// TYPES
// ===========================================

export interface NotificationToken {
  id: string;
  fid: number;
  token: string;
  url: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface SendNotificationParams {
  fid: number;
  title: string;
  body: string;
  targetUrl: string;
  notificationId?: string;
}

export interface SendNotificationResult {
  success: boolean;
  successfulTokens: string[];
  invalidTokens: string[];
  rateLimitedTokens: string[];
}

// ===========================================
// TOKEN MANAGEMENT
// ===========================================

/**
 * Save or update a notification token for a user
 */
export async function saveNotificationToken(
  fid: number,
  token: string,
  url: string
): Promise<void> {
  const { error } = await supabase
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
        onConflict: 'fid,token',
      }
    );

  if (error) {
    console.error('[Notifications] Failed to save token:', error);
    throw error;
  }
}

/**
 * Disable notification tokens for a user (when they disable notifications)
 */
export async function disableNotificationToken(fid: number): Promise<void> {
  const { error } = await supabase
    .from('notification_tokens')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('fid', fid);

  if (error) {
    console.error('[Notifications] Failed to disable token:', error);
    throw error;
  }
}

/**
 * Remove all notification tokens for a user (when they remove the mini app)
 */
export async function removeNotificationTokensByFid(fid: number): Promise<void> {
  const { error } = await supabase
    .from('notification_tokens')
    .delete()
    .eq('fid', fid);

  if (error) {
    console.error('[Notifications] Failed to remove tokens:', error);
    throw error;
  }
}

/**
 * Mark tokens as invalid (returned by Farcaster client)
 */
export async function markTokensInvalid(tokens: string[]): Promise<void> {
  if (tokens.length === 0) return;

  const { error } = await supabase
    .from('notification_tokens')
    .delete()
    .in('token', tokens);

  if (error) {
    console.error('[Notifications] Failed to mark tokens invalid:', error);
  }
}

/**
 * Get all enabled notification tokens for a user
 */
export async function getNotificationTokens(fid: number): Promise<NotificationToken[]> {
  const { data, error } = await supabase
    .from('notification_tokens')
    .select('*')
    .eq('fid', fid)
    .eq('enabled', true);

  if (error) {
    console.error('[Notifications] Failed to get tokens:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all enabled notification tokens (for broadcast)
 */
export async function getAllEnabledTokens(): Promise<NotificationToken[]> {
  const { data, error } = await supabase
    .from('notification_tokens')
    .select('*')
    .eq('enabled', true);

  if (error) {
    console.error('[Notifications] Failed to get all tokens:', error);
    return [];
  }

  return data || [];
}

// ===========================================
// SEND NOTIFICATIONS
// ===========================================

/**
 * Send a notification to a specific user by FID
 */
export async function sendNotification(
  params: SendNotificationParams
): Promise<SendNotificationResult> {
  const { fid, title, body, targetUrl, notificationId } = params;

  // Get user's notification tokens
  const tokens = await getNotificationTokens(fid);

  if (tokens.length === 0) {
    console.log('[Notifications] No tokens found for FID:', fid);
    return {
      success: false,
      successfulTokens: [],
      invalidTokens: [],
      rateLimitedTokens: [],
    };
  }

  // Group tokens by URL (different Farcaster clients may have different URLs)
  const tokensByUrl = tokens.reduce((acc, t) => {
    if (!acc[t.url]) acc[t.url] = [];
    acc[t.url].push(t.token);
    return acc;
  }, {} as Record<string, string[]>);

  const result: SendNotificationResult = {
    success: false,
    successfulTokens: [],
    invalidTokens: [],
    rateLimitedTokens: [],
  };

  // Send to each URL
  for (const [url, tokenList] of Object.entries(tokensByUrl)) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationId: notificationId || `notif-${fid}-${Date.now()}`,
          title: title.slice(0, 32), // Max 32 chars
          body: body.slice(0, 128), // Max 128 chars
          targetUrl,
          tokens: tokenList.slice(0, 100), // Max 100 tokens per request
        }),
      });

      if (response.ok) {
        const data = await response.json();
        result.successfulTokens.push(...(data.successfulTokens || []));
        result.invalidTokens.push(...(data.invalidTokens || []));
        result.rateLimitedTokens.push(...(data.rateLimitedTokens || []));
      } else {
        console.error('[Notifications] Failed to send to URL:', url, response.status);
      }
    } catch (error) {
      console.error('[Notifications] Error sending to URL:', url, error);
    }
  }

  // Clean up invalid tokens
  if (result.invalidTokens.length > 0) {
    await markTokensInvalid(result.invalidTokens);
  }

  result.success = result.successfulTokens.length > 0;
  return result;
}

/**
 * Send notification to multiple users by FIDs
 */
export async function sendNotificationToMany(
  fids: number[],
  title: string,
  body: string,
  targetUrl: string,
  notificationId?: string
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const fid of fids) {
    const result = await sendNotification({
      fid,
      title,
      body,
      targetUrl,
      notificationId: notificationId ? `${notificationId}-${fid}` : undefined,
    });

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Broadcast notification to all users with enabled notifications
 */
export async function broadcastNotification(
  title: string,
  body: string,
  targetUrl: string,
  notificationId: string
): Promise<{ sent: number; failed: number }> {
  const tokens = await getAllEnabledTokens();
  
  // Get unique FIDs
  const fids = [...new Set(tokens.map(t => t.fid))];
  
  return sendNotificationToMany(fids, title, body, targetUrl, notificationId);
}


// ===========================================
// NOTIFICATION HELPERS FOR SPECIFIC EVENTS
// ===========================================

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://visor-app-opal.vercel.app';

/**
 * Send notification when user gets a new referral
 */
export async function notifyNewReferral(
  referrerFid: number,
  pointsEarned: number
): Promise<void> {
  try {
    await sendNotification({
      fid: referrerFid,
      title: '🎉 New Referral!',
      body: `Someone joined using your link! +${pointsEarned.toLocaleString()} points`,
      targetUrl: `${APP_URL}/profile`,
      notificationId: `referral-${referrerFid}-${Date.now()}`,
    });
  } catch (error) {
    console.error('[Notifications] Failed to send referral notification:', error);
  }
}

/**
 * Send notification when user earns points from check-in
 */
export async function notifyCheckinPoints(
  fid: number,
  pointsEarned: number,
  streak: number
): Promise<void> {
  try {
    const streakText = streak > 1 ? ` 🔥 ${streak} day streak!` : '';
    await sendNotification({
      fid,
      title: '✅ Daily Check-in',
      body: `+${pointsEarned.toLocaleString()} points earned!${streakText}`,
      targetUrl: `${APP_URL}/profile`,
      notificationId: `checkin-${fid}-${new Date().toISOString().split('T')[0]}`,
    });
  } catch (error) {
    console.error('[Notifications] Failed to send checkin notification:', error);
  }
}

/**
 * Send notification when user mints NFT
 */
export async function notifyNFTMint(
  fid: number,
  amount: number,
  pointsEarned: number
): Promise<void> {
  try {
    await sendNotification({
      fid,
      title: '🎨 NFT Minted!',
      body: `${amount} Visor NFT${amount > 1 ? 's' : ''} minted! +${pointsEarned.toLocaleString()} points`,
      targetUrl: `${APP_URL}/mint`,
      notificationId: `mint-${fid}-${Date.now()}`,
    });
  } catch (error) {
    console.error('[Notifications] Failed to send mint notification:', error);
  }
}

/**
 * Send daily reminder notification
 */
export async function notifyDailyReminder(fid: number): Promise<void> {
  try {
    await sendNotification({
      fid,
      title: '⏰ Daily Check-in',
      body: "Don't forget to check in today and earn points!",
      targetUrl: `${APP_URL}/profile`,
      notificationId: `reminder-${fid}-${new Date().toISOString().split('T')[0]}`,
    });
  } catch (error) {
    console.error('[Notifications] Failed to send reminder notification:', error);
  }
}
