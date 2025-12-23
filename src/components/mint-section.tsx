'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { mintclub } from 'mint.club-v2-sdk';
import { getNFTBalance, VISOR_NFT_ADDRESS } from '@/lib/nft';

export function MintSection() {
  const { address } = useAccount();
  const [nftBalance, setNftBalance] = useState<number>(0);
  const [mintPrice, setMintPrice] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);

  useEffect(() => {
    if (!address) return;
    
    const fetch = async () => {
      setLoading(true);
      try {
        const balance = await getNFTBalance(address);
        setNftBalance(balance);
        
        // Get current mint price from Mint.club bonding curve
        const nft = mintclub.network('base').nft(VISOR_NFT_ADDRESS);
        const priceInfo = await nft.getBuyEstimation(BigInt(1));
        setMintPrice((Number(priceInfo) / 1e18).toFixed(4));
      } catch (e) {
        console.error('Failed to fetch NFT info:', e);
      }
      setLoading(false);
    };
    fetch();
  }, [address]);

  const handleMint = async () => {
    if (!address) return;
    
    setMinting(true);
    try {
      const nft = mintclub.network('base').nft(VISOR_NFT_ADDRESS);
      
      // Mint 1 NFT
      await nft.buy({
        amount: BigInt(1),
        recipient: address,
        onSuccess: (txHash) => {
          console.log('Mint success:', txHash);
          // Refresh balance
          getNFTBalance(address).then(setNftBalance);
        },
        onError: (error) => {
          console.error('Mint failed:', error);
        },
      });
    } catch (e) {
      console.error('Mint error:', e);
    }
    setMinting(false);
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3">🎨 Visor NFT</h2>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="w-20 h-20 bg-gray-800 rounded-lg flex items-center justify-center text-3xl">
          🔭
        </div>
        <div>
          <p className="text-gray-400 text-sm">Your Balance</p>
          <p className="text-2xl font-bold">{loading ? '...' : nftBalance}</p>
          <p className="text-xs text-gray-500">+100,000 points per mint</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-3 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Current Price</span>
          <span className="text-white font-medium">{mintPrice} ETH</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Price increases with each mint (bonding curve)
        </p>
      </div>

      <button
        onClick={handleMint}
        disabled={minting || loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        {minting ? 'Minting...' : 'Mint NFT'}
      </button>

      <a
        href="https://mint.club/nft/base/VISOR"
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm text-indigo-400 hover:text-indigo-300 mt-3"
      >
        View on Mint.club →
      </a>
    </div>
  );
}
