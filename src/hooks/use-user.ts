'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type { User } from '@/types/database';
import type { GetUserResponse, RegisterUserResponse } from '@/types/api';

export function useUser() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<GetUserResponse>({
    queryKey: ['user', address],
    queryFn: async () => {
      const res = await fetch(`/api/user/${address}`);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch user');
      }
      return res.json();
    },
    enabled: !!address && isConnected,
    staleTime: 30000, // 30 seconds
  });

  const registerMutation = useMutation<RegisterUserResponse, Error, { referrer?: string; fid?: number }>({
    mutationFn: async ({ referrer, fid }) => {
      const res = await fetch('/api/user/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          referrer,
          fid,
        }),
      });
      if (!res.ok) throw new Error('Failed to register user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', address] });
    },
  });

  return {
    user: data?.user as User | undefined,
    rank: data?.rank || 0,
    isLoading,
    error,
    refetch,
    register: registerMutation.mutate,
    isRegistering: registerMutation.isPending,
  };
}
