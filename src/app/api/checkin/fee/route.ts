import { NextResponse } from 'next/server';

// Target fee in USD
const CHECKIN_FEE_USD = 0.04;

// Cache ETH price on server-side
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

async function getEthPrice(): Promise<number> {
  // Return cached price if still valid
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
    return cachedPrice.price;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { 
        next: { revalidate: 60 },
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.ethereum?.usd;

    if (!price || typeof price !== 'number') {
      throw new Error('Invalid price data');
    }

    cachedPrice = { price, timestamp: Date.now() };
    return price;
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    return cachedPrice?.price || 3500; // Fallback
  }
}

/**
 * GET /api/checkin/fee
 * Returns the current check-in fee calculation for debugging
 */
export async function GET() {
  try {
    const ethPrice = await getEthPrice();
    const ethAmount = CHECKIN_FEE_USD / ethPrice;
    const weiAmount = Math.ceil(ethAmount * 1e18);
    
    return NextResponse.json({
      targetUSD: CHECKIN_FEE_USD,
      ethPrice,
      ethAmount: ethAmount.toFixed(10),
      weiAmount: weiAmount.toString(),
      weiHex: `0x${weiAmount.toString(16)}`,
      ethFormatted: (weiAmount / 1e18).toFixed(8),
      usdFormatted: `$${CHECKIN_FEE_USD.toFixed(2)}`,
      timestamp: Date.now(),
      note: 'Fee should be approximately $0.04 USD in ETH',
    });
  } catch (error) {
    console.error('Fee calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate fee' },
      { status: 500 }
    );
  }
}
