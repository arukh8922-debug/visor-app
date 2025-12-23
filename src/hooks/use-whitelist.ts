'use client';

import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type { WhitelistStatus } from '@/types/api';

export function useWhitelist() {
  const { address, isConnected } = useAccount();

  const { data, isLoading, error, refetch } = useQuery<WhitelistStatus>({
    queryKey: ['whitelist', address],
    queryFn: async () => {
      const res = await fetch(`/api/whitelist/${address}`);
      if (!res.ok) throw new Error('Failed to fetch whitelist status');
      return res.json();
    },
    enabled: !!address && isConnected,
    staleTime: 60000, // 1 minute
  });

  return {
    status: data,
    isWhitelisted: data?.is_whitelisted || false,
    isLoading,
    error,
    refetch,
  };
}
