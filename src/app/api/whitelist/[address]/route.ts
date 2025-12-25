import { NextRequest, NextResponse } from 'next/server';
import { checkWhitelistStatus } from '@/lib/whitelist';
import { updateUserWhitelist, getUser, updateUser } from '@/lib/supabase';

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

    console.log(`[Whitelist API] Checking status for address: ${address}`);
    const status = await checkWhitelistStatus(address);
    console.log(`[Whitelist API] Status result:`, {
      fid: status.fid,
      followsCreator1: status.followsCreator1,
      followsCreator2: status.followsCreator2,
      hasCasted: status.hasCasted,
      hasAddedMiniApp: status.hasAddedMiniApp,
    });

    // Check if user has added mini app from database (tracked separately)
    const user = await getUser(address);
    const hasAddedMiniAppFromDb = user?.has_added_miniapp || false;
    
    // Check if user has casted from database (tracked when user clicks Cast button)
    // This is more reliable than Neynar API which requires paid plan
    const hasCastedFromDb = user?.has_casted || false;
    
    // If we found FID and user doesn't have it saved, update database
    if (status.fid && user && !user.fid) {
      console.log(`[Whitelist API] Saving FID ${status.fid} to database for ${address}`);
      await updateUser(address, { fid: status.fid });
    }
    
    // Combine API check with database check
    const hasAddedMiniApp = status.hasAddedMiniApp || hasAddedMiniAppFromDb;
    // Use database status for cast (Neynar API requires paid plan)
    const hasCasted = hasCastedFromDb || status.hasCasted;
    
    // Check if user has enabled notifications (from database)
    const hasNotifications = await hasEnabledNotifications(address);

    // Update user whitelist status in database
    // Now requires all 5 conditions: follow1, follow2, cast, mini app, and notifications
    const isWhitelisted = status.followsCreator1 && status.followsCreator2 && hasCasted && hasAddedMiniApp && hasNotifications;
    
    console.log(`[Whitelist API] Final status for ${address}:`, {
      hasCasted,
      hasAddedMiniApp,
      hasNotifications,
      isWhitelisted,
    });

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
      has_casted: hasCasted,
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
