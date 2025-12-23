import { NextResponse } from 'next/server';
import { getNFTInfo } from '@/lib/mintclub';

export async function GET() {
  try {
    const info = await getNFTInfo();

    return NextResponse.json({
      price_wei: info.priceWei,
      price_eth: info.priceEth,
      total_supply: info.totalSupply,
      max_supply: info.maxSupply,
    });
  } catch (error) {
    console.error('NFT price error:', error);
    return NextResponse.json(
      { error: 'Failed to get NFT price' },
      { status: 500 }
    );
  }
}
