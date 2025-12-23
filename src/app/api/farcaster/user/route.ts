import { NextRequest, NextResponse } from 'next/server';
import { getFarcasterUserByAddress } from '@/lib/farcaster';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    const user = await getFarcasterUserByAddress(address);

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Farcaster user fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Farcaster user' },
      { status: 500 }
    );
  }
}
