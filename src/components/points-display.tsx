'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getUserPoints } from '@/lib/points';

export function PointsDisplay() {
  const { address } = useAccount();
  const [points, setPoints] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    
    const fetch = async () => {
      setLoading(true);
      const userPoints = await getUserPoints(address);
      setPoints(userPoints);
      setLoading(false);
    };
    fetch();
  }, [address]);

  return (
    <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-4 border border-indigo-700/50">
      <h2 className="text-sm text-gray-400 mb-1">Your Points</h2>
      {loading ? (
        <div className="h-8 bg-gray-800 rounded w-24 animate-pulse"></div>
      ) : (
        <p className="text-3xl font-bold text-white">{points.toLocaleString()}</p>
      )}
      <p className="text-xs text-gray-500 mt-2">
        Earn points by minting NFTs and referring friends
      </p>
    </div>
  );
}
