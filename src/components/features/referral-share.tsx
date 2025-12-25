'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getReferralLink, formatNumber, formatRelativeTime } from '@/lib/utils';
import { openComposeCast } from '@/lib/farcaster-sdk';
import type { Referral } from '@/types/database';

interface ReferralShareProps {
  address: string;
  totalReferrals: number;
  pointsEarned: number;
  recentReferrals?: Referral[];
  loading?: boolean;
}

export function ReferralShare({
  address,
  totalReferrals,
  pointsEarned,
  recentReferrals = [],
  loading,
}: ReferralShareProps) {
  const [copied, setCopied] = useState(false);
  const referralLink = getReferralLink(address);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card variant="default">
        <Skeleton className="h-6 w-32 mb-4" />
        <Skeleton className="h-11 w-full mb-4" />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="h-11 w-full" />
      </Card>
    );
  }

  return (
    <Card variant="default">
      {/* Header */}
      <h3 className="text-lg font-semibold text-white mb-4">Invite Friends</h3>

      {/* Referral Link */}
      <div className="mb-4">
        <Input
          value={referralLink}
          readOnly
          copyable
          onCopy={handleCopy}
          className="font-mono text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#111111] rounded-xl p-3">
          <p className="text-2xl font-bold text-white tabular-nums">
            {totalReferrals}
          </p>
          <p className="text-xs text-[#666666]">Total Referrals</p>
        </div>
        <div className="bg-[#111111] rounded-xl p-3">
          <p className="text-2xl font-bold text-white tabular-nums">
            {formatNumber(pointsEarned)}
          </p>
          <p className="text-xs text-[#666666]">Points Earned</p>
        </div>
      </div>

      {/* Share Button */}
      <Button
        variant="primary"
        size="md"
        className="w-full mb-4"
        onClick={async () => {
          const text = `Join me on Visor - NFT points farming on Base! 🚀\n\nUse my referral link:`;
          // Use SDK composeCast with referral link as embed for better preview
          await openComposeCast(text, [referralLink]);
        }}
      >
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z" />
        </svg>
        Share on Farcaster
      </Button>

      {/* Recent Referrals */}
      {recentReferrals.length > 0 && (
        <div>
          <p className="text-sm text-[#666666] mb-2">Recent Referrals</p>
          <div className="space-y-2">
            {recentReferrals.slice(0, 5).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between py-2 border-b border-[#222222] last:border-0"
              >
                <span className="text-sm text-[#a0a0a0] font-mono">
                  {referral.referred_address.slice(0, 6)}...{referral.referred_address.slice(-4)}
                </span>
                <span className="text-xs text-[#666666]">
                  {formatRelativeTime(referral.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalReferrals === 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-[#666666]">
            Share your link to earn 1,000 points per referral!
          </p>
        </div>
      )}
    </Card>
  );
}
