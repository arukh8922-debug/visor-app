'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReferralShare } from '@/components/features/referral-share';
import { useUser } from '@/hooks/use-user';
import { useReferral } from '@/hooks/use-referral';
import { useNFT } from '@/hooks/use-nft';
import { useToast } from '@/components/ui/toast';
import { formatNumber, truncateAddress, getExplorerTxUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { fireStreakConfetti, fireSuccessConfetti } from '@/lib/confetti';
import { sendCheckinTransaction, waitForCheckinConfirmation, getPlatformShortName, detectPlatform } from '@/lib/checkin';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { user, rank, isLoading: userLoading, refetch: refetchUser } = useUser();
  const { totalReferrals, pointsEarned, recentReferrals, isLoading: referralLoading } = useReferral();
  const { balance } = useNFT();
  const { showToast } = useToast();
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkinStatus, setCheckinStatus] = useState<string>('');

  // Check if user can check in (last_checkin > 24 hours ago)
  const canCheckIn = () => {
    if (!user?.last_checkin) return true;
    const lastCheckin = new Date(user.last_checkin);
    const now = new Date();
    const hoursSince = (now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60);
    return hoursSince >= 24;
  };

  const handleDailyCheckin = async () => {
    if (!address || !walletClient || checkingIn) return;
    
    setCheckingIn(true);
    setCheckinStatus('Sending transaction...');
    
    try {
      // Step 1: Send onchain transaction (0 ETH to self)
      const { txHash, platform } = await sendCheckinTransaction(
        walletClient,
        address as `0x${string}`
      );
      
      setCheckinStatus('Waiting for confirmation...');
      
      // Step 2: Wait for confirmation
      const confirmed = await waitForCheckinConfirmation(txHash);
      
      if (!confirmed) {
        showToast('Transaction failed', 'error');
        setCheckinStatus('');
        return;
      }
      
      setCheckinStatus('Recording checkin...');
      
      // Step 3: Call API to record checkin
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          tx_hash: txHash,
          platform: getPlatformShortName(platform),
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.already_checked_in) {
          showToast('Already checked in today!', 'info');
        } else {
          showToast(data.error || 'Check-in failed', 'error');
        }
        return;
      }
      
      // Success with confetti
      if (data.bonus_awarded) {
        fireStreakConfetti();
        showToast(`🎉 +${data.points_awarded} points! 7-day streak bonus!`, 'success');
      } else {
        fireSuccessConfetti();
        showToast(`✅ +${data.points_awarded} points! Streak: ${data.streak} days`, 'success');
      }
      
      // Refresh user data
      refetchUser();
    } catch (error: any) {
      console.error('Checkin error:', error);
      if (error?.message?.includes('rejected')) {
        showToast('Transaction rejected', 'error');
      } else {
        showToast('Check-in failed', 'error');
      }
    } finally {
      setCheckingIn(false);
      setCheckinStatus('');
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="p-4">
        <Card variant="default" className="text-center py-12">
          <p className="text-[#a0a0a0]">Connect your wallet to view your profile</p>
        </Card>
      </div>
    );
  }

  const checkinAvailable = canCheckIn();

  return (
    <div className="p-4 space-y-4">
      {/* Profile Header */}
      <Card variant="elevated">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#333333] to-[#111111] flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <p className="text-lg font-semibold text-white font-mono">
              {truncateAddress(address, 6)}
            </p>
            {userLoading ? (
              <Skeleton className="h-4 w-24 mt-1" />
            ) : (
              <p className="text-sm text-[#666666]">
                Rank #{rank || '---'}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Points"
          value={user?.points || 0}
          loading={userLoading}
        />
        <StatCard
          label="NFTs"
          value={balance}
          loading={userLoading}
        />
        <StatCard
          label="Referrals"
          value={totalReferrals}
          loading={referralLoading}
        />
      </div>

      {/* Daily Check-in Card */}
      <Card variant="default">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-[#666666]">Daily Streak</p>
            <p className="text-xl font-bold text-white">
              {user?.streak_count || 0} days 🔥
            </p>
          </div>
          <Button
            variant={checkinAvailable ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleDailyCheckin}
            loading={checkingIn}
            disabled={!checkinAvailable || !walletClient}
          >
            {checkingIn ? 'Processing...' : checkinAvailable ? 'Check In' : 'Checked ✓'}
          </Button>
        </div>
        {checkinStatus && (
          <p className="text-xs text-blue-400 mb-2">{checkinStatus}</p>
        )}
        <p className="text-xs text-[#666666]">
          Check in daily to earn 100 points. 7-day streak = 500 bonus!
        </p>
        <p className="text-xs text-[#444444] mt-1">
          ⛽ Requires small gas fee (~$0.001)
        </p>
        {user?.last_checkin && (
          <p className="text-xs text-[#444444] mt-1">
            Last check-in: {new Date(user.last_checkin).toLocaleDateString()}
          </p>
        )}
      </Card>

      {/* Referral Section */}
      <ReferralShare
        address={address}
        totalReferrals={totalReferrals}
        pointsEarned={pointsEarned}
        recentReferrals={recentReferrals}
        loading={referralLoading}
      />
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number; loading?: boolean }) {
  return (
    <Card variant="default" padding="sm" className="text-center">
      {loading ? (
        <Skeleton className="h-6 w-12 mx-auto mb-1" />
      ) : (
        <p className="text-xl font-bold text-white tabular-nums">
          {formatNumber(value)}
        </p>
      )}
      <p className="text-xs text-[#666666]">{label}</p>
    </Card>
  );
}
