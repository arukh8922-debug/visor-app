import { NextRequest, NextResponse } from 'next/server';
import { checkWhitelistStatus } from '@/lib/whitelist';
import { updateUserWhitelist, getUser } from '@/lib/supabase';

// Check if user has enabled notifications (from database tracking)
async function hasEnabledNotifications(address: string): Promise<boolean> {
  const user = await getUser(address);
  return user?.has_enabled_notifications || false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const status = await checkWhitelistStatus(address);

    // Check if user has added mini app from database (tracked separately)
    const user = await getUser(address);
    const hasAddedMiniAppFromDb = user?.has_added_miniapp || false;
    
    // Combine API check with database check
    const hasAddedMiniApp = status.hasAddedMiniApp || hasAddedMiniAppFromDb;
    
    // Check if user has enabled notifications (from database)
    const hasNotifications = await hasEnabledNotifications(address);

    // Update user whitelist status in database
    // Now requires all 5 conditions: follow1, follow2, cast, mini app, and notifications
    const isWhitelisted = status.followsCreator1 && status.followsCreator2 && status.hasCasted && hasAddedMiniApp && hasNotifications;
    if (isWhitelisted) {
      try {
        await updateUserWhitelist(address, true);
      } catch (error) {
        console.error('Failed to update whitelist status:', error);
      }
    }

    return NextResponse.json({
      follows_creator1: status.followsCreator1,
      follows_creator2: status.followsCreator2,
      has_casted: status.hasCasted,
      has_added_miniapp: hasAddedMiniApp,
      has_notifications: hasNotifications,
      is_whitelisted: isWhitelisted,
      fid: status.fid,
    });
  } catch (error) {
    console.error('Whitelist check error:', error);
    return NextResponse.json(
      { error: 'Failed to check whitelist status' },
      { status: 500 }
    );
  }
}
