'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getReferralStats, ReferralStats } from '@/lib/referral';

export function ReferralSection() {
  const { address } = useAccount();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    
    const fetch = async () => {
      setLoading(true);
      const data = await getReferralStats(address);
      setStats(data);
      setLoading(false);
    };
    fetch();
  }, [address]);

  const referralLink = address 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://visor.app'}?ref=${address}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Referral Link */}
      <div className="bg-gray-900 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">🔗 Your Referral Link</h2>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono"
          />
          <button
            onClick={copyLink}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Earn 1,000 points for each successful referral
        </p>
      </div>

      {/* Stats */}
      <div className="bg-gray-900 rounded-xl p-4">
        <h2 className="text-lg font-semibold mb-3">📊 Referral Stats</h2>
        
        {loading ? (
          <div className="space-y-2">
            <div className="h-5 bg-gray-800 rounded w-1/2 animate-pulse"></div>
            <div className="h-5 bg-gray-800 rounded w-1/3 animate-pulse"></div>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Total Referrals</p>
              <p className="text-2xl font-bold">{stats.totalReferrals}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-gray-400 text-sm">Points Earned</p>
              <p className="text-2xl font-bold">{stats.pointsEarned.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500">No referral data yet</p>
        )}
      </div>

      {/* Recent Referrals */}
      {stats && stats.recentReferrals.length > 0 && (
        <div className="bg-gray-900 rounded-xl p-4">
          <h2 className="text-lg font-semibold mb-3">👥 Recent Referrals</h2>
          <div className="space-y-2">
            {stats.recentReferrals.map((ref, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-400 font-mono">
                  {ref.address.slice(0, 6)}...{ref.address.slice(-4)}
                </span>
                <span className="text-green-400">+1,000 pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
