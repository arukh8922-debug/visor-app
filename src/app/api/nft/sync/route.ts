import { NextRequest, NextResponse } from 'next/server';
import { getUser, syncNFTBalance } from '@/lib/supabase';
import { getNFTBalance } from '@/lib/nft';
import { rateLimitMiddleware } from '@/lib/rate-limit';

/**
 * Sync NFT balance from blockchain and award points for new mints
 * POST /api/nft/sync
 * Body: { wallet_address: string }
 */
export async function POST(request: NextRequest) {
  // Rate limiting - 10 per minute per IP
  const rateLimitResponse = rateLimitMiddleware(request, 10);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { wallet_address } = body;

    if (!wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // Get current onchain balance
    const onchainBalance = await getNFTBalance(wallet_address);
    
    // Get user from database
    const user = await getUser(wallet_address);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please connect wallet first.' },
        { status: 404 }
      );
    }

    const dbBalance = user.nft_count || 0;
    
    // Check if there are new NFTs
    if (onchainBalance > dbBalance) {
      const newMints = onchainBalance - dbBalance;
      
      // Sync balance and award points
      const result = await syncNFTBalance(wallet_address, onchainBalance, newMints);
      
      return NextResponse.json({
        success: true,
        previous_balance: dbBalance,
        current_balance: onchainBalance,
        new_mints: newMints,
        points_awarded: result.pointsAdded,
        is_vip: true,
      });
    }
    
    // No new NFTs
    return NextResponse.json({
      success: true,
      previous_balance: dbBalance,
      current_balance: onchainBalance,
      new_mints: 0,
      points_awarded: 0,
      is_vip: user.is_vip || false,
    });
  } catch (error) {
    console.error('NFT sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync NFT balance' },
      { status: 500 }
    );
  }
}
