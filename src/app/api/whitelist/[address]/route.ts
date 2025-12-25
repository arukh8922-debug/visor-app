import { NextRequest, NextResponse } from 'next/server';
import { checkWhitelistStatus } from '@/lib/whitelist';
import { updateUserWhitelist, getUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

// Check if user has enabled notifications (has token in database)
async function hasEnabledNotifications(fid: number | undefined): Promise<boolean> {
  if (!fid) return false;
  
  const { data, error } = await supabase
    .from('notification_tokens')
    .select('id')
    .eq('fid', fid)
    .eq('enabled', true)
    .limit(1);
  
  if (error) {
    console.error('Failed to check notification status:', error);
    return false;
  }
  
  return (data?.length || 0) > 0;
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
    
    // Check if user has enabled notifications
    const hasNotifications = await hasEnabledNotifications(status.fid);

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
