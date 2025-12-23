import { NextRequest, NextResponse } from 'next/server';
import { checkWhitelistStatus } from '@/lib/whitelist';
import { updateUserWhitelist } from '@/lib/supabase';

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

    // Update user whitelist status in database
    const isWhitelisted = status.followsCreator1 && status.followsCreator2 && status.hasCasted;
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
