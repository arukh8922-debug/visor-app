'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getNFTBalance, getTotalSupply, VISOR_OPENSEA_URL } from '@/lib/nft';

export function MintSection() {
  const { address } = useAccount();
  const [nftBalance, setNftBalance] = useState<number>(0);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    
    const fetch = async () => {
      setLoading(true);
      try {
        const [balance, supply] = await Promise.all([
          getNFTBalance(address),
          getTotalSupply(),
        ]);
        setNftBalance(balance);
        setTotalSupply(supply);
      } catch (e) {
        console.error('Failed to fetch NFT info:', e);
      }
      setLoading(false);
    };
    fetch();
  }, [address]);

  const handleMintOnOpenSea = () => {
    window.open(VISOR_OPENSEA_URL, '_blank');
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
          <span className="text-gray-400">Total Minted</span>
          <span className="text-white font-medium">{loading ? '...' : totalSupply}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Mint on OpenSea to get VIP status
        </p>
      </div>

      <button
        onClick={handleMintOnOpenSea}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
      >
        Mint on OpenSea
      </button>

      <a
        href={VISOR_OPENSEA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center text-sm text-indigo-400 hover:text-indigo-300 mt-3"
      >
        View Collection on OpenSea →
      </a>
    </div>
  );
}
