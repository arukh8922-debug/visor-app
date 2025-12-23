'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { truncateAddress, formatNumber } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { LeaderboardEntry } from '@/types/database';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentUserAddress?: string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  loadingMore?: boolean;
}

export function LeaderboardTable({
  entries,
  currentUserAddress,
  onLoadMore,
  hasMore,
  loading,
  loadingMore,
}: LeaderboardTableProps) {
  if (loading) {
    return (
      <Card variant="default" padding="none">
        <div className="p-4 border-b border-[#222222]">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="divide-y divide-[#222222]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <Card variant="default" className="text-center py-12">
        <div className="text-4xl mb-3">🏆</div>
        <p className="text-lg font-medium text-white mb-1">Be the first!</p>
        <p className="text-sm text-[#666666]">Mint NFTs to earn points and climb the leaderboard</p>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#222222]">
        <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
        <span className="text-sm text-[#666666]">{entries.length} users</span>
      </div>

      {/* Table */}
      <div className="divide-y divide-[#222222]">
        {entries.map((entry) => {
          const isCurrentUser = currentUserAddress?.toLowerCase() === entry.wallet_address.toLowerCase();
          const isTop3 = entry.rank <= 3;
          const hasFarcaster = entry.farcaster?.username;

          return (
            <div
              key={entry.wallet_address}
              className={cn(
                'flex items-center gap-3 p-4 transition-colors',
                isCurrentUser && 'bg-white/5'
              )}
            >
              {/* Rank */}
              <div className="w-8 flex justify-center flex-shrink-0">
                {isTop3 ? (
                  <RankBadge rank={entry.rank} />
                ) : (
                  <span className="text-sm font-medium text-[#666666]">
                    {entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar / PFP */}
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[#222222]">
                {entry.farcaster?.pfpUrl ? (
                  <img
                    src={entry.farcaster.pfpUrl}
                    alt={entry.farcaster.username}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#666666]">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Name & Address */}
              <div className="flex-1 min-w-0">
                {hasFarcaster ? (
                  <>
                    <p className={cn(
                      'text-sm font-medium truncate',
                      isCurrentUser ? 'text-white' : 'text-[#a0a0a0]'
                    )}>
                      {entry.farcaster!.displayName || entry.farcaster!.username}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-[#666666]">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-[#666666] truncate">
                      @{entry.farcaster!.username}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={cn(
                      'text-sm font-medium font-mono truncate',
                      isCurrentUser ? 'text-white' : 'text-[#a0a0a0]'
                    )}>
                      {truncateAddress(entry.wallet_address, 6)}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-[#666666] font-sans">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-[#666666]">
                      {entry.nft_count} NFT{entry.nft_count !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>

              {/* Points */}
              <div className="text-right flex-shrink-0">
                <p className={cn(
                  'text-sm font-semibold tabular-nums',
                  isTop3 ? 'text-white' : 'text-[#a0a0a0]'
                )}>
                  {formatNumber(entry.points)}
                </p>
                <p className="text-xs text-[#666666]">points</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="p-4 border-t border-[#222222]">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full py-2 text-sm text-[#a0a0a0] hover:text-white transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </Card>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const icons = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
  };

  return (
    <div className="w-8 h-8 flex items-center justify-center text-lg">
      {icons[rank as keyof typeof icons]}
    </div>
  );
}
