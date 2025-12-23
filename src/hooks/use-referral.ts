'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import type { GetReferralsResponse, ProcessReferralResponse } from '@/types/api';

export function useReferral() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<GetReferralsResponse>({
    queryKey: ['referrals', address],
    queryFn: async () => {
      const res = await fetch(`/api/referral/${address}`);
      if (!res.ok) throw new Error('Failed to fetch referrals');
      return res.json();
    },
    enabled: !!address && isConnected,
    staleTime: 30000,
  });

  const processMutation = useMutation<ProcessReferralResponse, Error, { referrerAddress: string }>({
    mutationFn: async ({ referrerAddress }) => {
      const res = await fetch('/api/referral/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referrer_address: referrerAddress,
          referred_address: address,
        }),
      });
      if (!res.ok) throw new Error('Failed to process referral');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals', address] });
    },
  });

  return {
    totalReferrals: data?.total_referrals || 0,
    pointsEarned: data?.points_earned || 0,
    recentReferrals: data?.recent || [],
    isLoading,
    error,
    refetch,
    processReferral: processMutation.mutate,
    isProcessing: processMutation.isPending,
  };
}
