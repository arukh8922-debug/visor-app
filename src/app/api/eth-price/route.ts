import { NextResponse } from 'next/server';

// Cache ETH price on server-side
let cachedPrice: { price: number; timestamp: number } | null = null;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

export async function GET() {
  // Return cached price if still valid
  if (cachedPrice && Date.now() - cachedPrice.timestamp < CACHE_DURATION) {
    return NextResponse.json({ 
      price: cachedPrice.price, 
      cached: true,
      timestamp: cachedPrice.timestamp 
    });
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { 
        next: { revalidate: 60 },
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.ethereum?.usd;

    if (!price || typeof price !== 'number') {
      throw new Error('Invalid price data from CoinGecko');
    }

    // Cache the price
    cachedPrice = { price, timestamp: Date.now() };

    return NextResponse.json({ 
      price, 
      cached: false,
      timestamp: Date.now() 
    });
  } catch (error) {
    console.error('Failed to fetch ETH price:', error);
    
    // Return cached price if available, even if stale
    if (cachedPrice) {
      return NextResponse.json({ 
        price: cachedPrice.price, 
        cached: true,
        stale: true,
        timestamp: cachedPrice.timestamp 
      });
    }

    // Fallback price
    return NextResponse.json({ 
      price: 3500, 
      fallback: true,
      timestamp: Date.now() 
    });
  }
}
