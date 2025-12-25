'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import { PointsCard } from '@/components/features/points-card';
import { WhitelistChecklist } from '@/components/features/whitelist-checklist';
import { useUser } from '@/hooks/use-user';
import { useWhitelist } from '@/hooks/use-whitelist';
import { storeReferrer, getStoredReferrer, clearStoredReferrer } from '@/lib/utils';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const searchParams = useSearchParams();
  const { user, rank, isLoading: userLoading, register, isRegistering } = useUser();
  const { status: whitelistStatus, isLoading: whitelistLoading, refetch: refetchWhitelist } = useWhitelist();

  // Handle referral from URL - store any ref value (username or address)
  useEffect(() => {
    const ref = searchParams.get('ref');
    // Store referrer (can be username or address), will be resolved in backend
    if (ref && ref.toLowerCase() !== address?.toLowerCase()) {
      storeReferrer(ref);
    }
  }, [searchParams, address]);

  // Register user on connect
  useEffect(() => {
    if (isConnected && address && !user && !userLoading && !isRegistering) {
      const referrer = getStoredReferrer();
      register({ referrer: referrer || undefined });
      if (referrer) {
        clearStoredReferrer();
      }
    }
  }, [isConnected, address, user, userLoading, isRegistering, register]);

  // Not connected state - show welcome screen, user can connect via header button
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-3 tracking-tight">VISOR</h1>
          <p className="text-[#a0a0a0]">NFT Points Earn on Base</p>
        </div>

        <p className="text-sm text-[#666666] mb-8">
          Connect your wallet to start earning points
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl mb-2">🎨</div>
            <p className="text-xs text-[#666666]">Mint NFTs</p>
          </div>
          <div>
            <div className="text-3xl mb-2">⭐</div>
            <p className="text-xs text-[#666666]">Earn Points</p>
          </div>
          <div>
            <div className="text-3xl mb-2">🎁</div>
            <p className="text-xs text-[#666666]">Get Rewards</p>
          </div>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="p-4 space-y-4">
      {/* Points Card */}
      <PointsCard
        points={user?.points || 0}
        rank={rank}
        isVip={user?.is_vip || false}
        breakdown={{
          nft: (user?.nft_count || 0) * 100000,
          referral: (user?.referral_count || 0) * 1000,
          daily: 0,
        }}
        loading={userLoading}
      />

      {/* Whitelist Checklist */}
      <WhitelistChecklist
        status={whitelistStatus}
        onRefresh={refetchWhitelist}
        loading={whitelistLoading}
      />
    </div>
  );
}
