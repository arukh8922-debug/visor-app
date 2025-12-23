'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { checkWhitelistStatus, WhitelistRequirements } from '@/lib/whitelist';

export function WhitelistStatus() {
  const { address } = useAccount();
  const [status, setStatus] = useState<WhitelistRequirements | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;
    
    const check = async () => {
      setLoading(true);
      const result = await checkWhitelistStatus(address);
      setStatus(result);
      setLoading(false);
    };
    check();
  }, [address]);

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-800 rounded w-3/4"></div>
      </div>
    );
  }

  if (!status) return null;

  const isWhitelisted = status.followsCreator1 && status.followsCreator2 && status.hasCasted;

  return (
    <div className="bg-gray-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        {isWhitelisted ? '✅' : '📋'} Whitelist Status
      </h2>
      
      <div className="space-y-2">
        <StatusItem
          label="Follow @creator1"
          completed={status.followsCreator1}
          fid={process.env.NEXT_PUBLIC_CREATOR_FID_1}
        />
        <StatusItem
          label="Follow @creator2"
          completed={status.followsCreator2}
          fid={process.env.NEXT_PUBLIC_CREATOR_FID_2}
        />
        <StatusItem
          label="Cast about Visor"
          completed={status.hasCasted}
        />
      </div>

      {isWhitelisted ? (
        <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-400 text-sm">
          🎉 You&apos;re whitelisted! Mint NFT to start earning points.
        </div>
      ) : (
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg text-yellow-400 text-sm">
          Complete all tasks above to join the whitelist.
        </div>
      )}
    </div>
  );
}

function StatusItem({ label, completed, fid }: { label: string; completed: boolean; fid?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">{label}</span>
      <span className={completed ? 'text-green-400' : 'text-gray-500'}>
        {completed ? '✓' : '○'}
      </span>
    </div>
  );
}
