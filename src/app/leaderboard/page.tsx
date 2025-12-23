'use client';

import { useAccount } from 'wagmi';
import { LeaderboardTable } from '@/components/features/leaderboard-table';
import { useLeaderboard } from '@/hooks/use-leaderboard';

export default function LeaderboardPage() {
  const { address } = useAccount();
  const { entries, isLoading, loadMore, hasMore, isLoadingMore } = useLeaderboard();

  return (
    <div className="p-4">
      <LeaderboardTable
        entries={entries}
        currentUserAddress={address}
        onLoadMore={loadMore}
        hasMore={hasMore}
        loading={isLoading}
        loadingMore={isLoadingMore}
      />
    </div>
  );
}
