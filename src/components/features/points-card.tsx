'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface PointsCardProps {
  points: number;
  rank: number;
  isVip?: boolean;
  breakdown?: {
    nft: number;
    referral: number;
    daily: number;
  };
  loading?: boolean;
}

export function PointsCard({ points, rank, isVip, breakdown, loading }: PointsCardProps) {
  const [displayPoints, setDisplayPoints] = useState(0);

  // Animated counter
  useEffect(() => {
    if (loading) return;
    
    const duration = 1000;
    const steps = 30;
    const increment = points / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= points) {
        setDisplayPoints(points);
        clearInterval(timer);
      } else {
        setDisplayPoints(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [points, loading]);

  if (loading) {
    return (
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
        <Skeleton className="h-12 w-40 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <p className="text-sm text-[#a0a0a0]">Total Points</p>
            {isVip && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full">
                <span className="text-xs">⭐</span>
                <span className="text-xs font-medium text-yellow-500">VIP</span>
              </div>
            )}
          </div>
          {rank > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg">
              <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-white">#{rank}</span>
            </div>
          )}
        </div>

        {/* Points Display */}
        <div className="mb-6">
          <p className={cn(
            'text-4xl font-bold text-white tabular-nums glow',
            'animate-countUp'
          )}>
            {formatNumber(displayPoints)}
          </p>
        </div>

        {/* Breakdown */}
        {breakdown && (
          <div className="grid grid-cols-3 gap-3">
            <BreakdownItem
              label="NFT Mints"
              value={breakdown.nft}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <BreakdownItem
              label="Referrals"
              value={breakdown.referral}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <BreakdownItem
              label="Daily"
              value={breakdown.daily}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>
        )}
      </div>
    </Card>
  );
}

function BreakdownItem({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-[#111111] rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[#666666] mb-1">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white tabular-nums">
        {formatNumber(value)}
      </p>
    </div>
  );
}
