'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type { LeaderboardResponse } from '@/types/api';

const LIMIT = 50;

export function useLeaderboard() {
  const { address } = useAccount();

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery<LeaderboardResponse>({
    queryKey: ['leaderboard'],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: LIMIT.toString(),
        offset: (pageParam as number).toString(),
        ...(address && { user: address }),
      });
      
      const res = await fetch(`/api/leaderboard?${params}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    },
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((acc, page) => acc + page.entries.length, 0);
      return totalFetched < lastPage.total ? totalFetched : undefined;
    },
    initialPageParam: 0,
    staleTime: 30000,
  });

  // Flatten entries from all pages
  const entries = data?.pages.flatMap((page) => page.entries) || [];
  const total = data?.pages[0]?.total || 0;
  const userRank = data?.pages[0]?.user_rank;

  return {
    entries,
    total,
    userRank,
    isLoading,
    error,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    refetch,
  };
}
