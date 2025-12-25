import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateUser, processReferral, supabase } from '@/lib/supabase';
import { validateBody, registerUserSchema } from '@/lib/validation';
import { rateLimitMiddleware } from '@/lib/rate-limit';
import { notifyNewReferral } from '@/lib/notifications';
import { isValidAddress } from '@/lib/utils';
import { getFarcasterUserByUsername } from '@/lib/farcaster';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = rateLimitMiddleware(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Validate request body
    const validation = await validateBody(request, registerUserSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { wallet_address, fid, referrer } = validation.data;

    // Create or get user
    const user = await getOrCreateUser(wallet_address, fid);

    // Process referral if present
    let referralProcessed = false;
    if (referrer && referrer !== wallet_address.toLowerCase()) {
      try {
        // Resolve referrer to wallet address
        let referrerWallet = referrer;
        
        if (!isValidAddress(referrer)) {
          // Referrer is a username, lookup wallet address from Farcaster
          console.log('[Register] Referrer is username, looking up wallet:', referrer);
          const { walletAddress } = await getFarcasterUserByUsername(referrer);
          
          if (walletAddress) {
            referrerWallet = walletAddress;
            console.log('[Register] Resolved username to wallet:', referrerWallet);
          } else {
            console.log('[Register] Could not resolve username to wallet, skipping referral');
            referrerWallet = '';
          }
        }
        
        if (referrerWallet && referrerWallet.toLowerCase() !== wallet_address.toLowerCase()) {
          const result = await processReferral(referrerWallet, wallet_address);
          referralProcessed = result.success;
          console.log('[Register] Referral processed:', { referrerWallet, success: result.success, points: result.pointsAwarded });
          
          // Send notification to referrer
          if (result.success && result.pointsAwarded > 0) {
            // Get referrer's FID for notification
            const { data: referrerUser } = await supabase
              .from('users')
              .select('fid')
              .eq('wallet_address', referrerWallet.toLowerCase())
              .single();
            if (referrerUser?.fid) {
              notifyNewReferral(referrerUser.fid, result.pointsAwarded).catch(console.error);
            }
          }
        }
      } catch (error) {
        console.error('Referral processing failed:', error);
      }
    }

    return NextResponse.json({
      success: true,
      user,
      referral_processed: referralProcessed,
    });
  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register user' },
      { status: 500 }
    );
  }
}
