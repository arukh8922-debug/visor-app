'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import * as mintclub from '@/lib/mintclub';
import { getNFTBalance } from '@/lib/nft';
import { formatEther } from 'viem';

export function useNFT() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  // NFT Balance - Use ERC-721 contract directly (new NFT collection)
  const { data: balance, refetch: refetchBalance } = useQuery({
    queryKey: ['nft-balance', address],
    queryFn: async () => {
      if (!address) return 0;
      return await getNFTBalance(address);
    },
    enabled: !!address && isConnected,
    staleTime: 10000,
  });

  // NFT Price
  const { data: price, refetch: refetchPrice } = useQuery({
    queryKey: ['nft-price'],
    queryFn: async () => {
      const priceWei = await mintclub.getPriceForNextMint();
      return {
        wei: priceWei.toString(),
        eth: formatEther(priceWei),
      };
    },
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 10000,
  });

  // NFT Supply
  const { data: supply } = useQuery({
    queryKey: ['nft-supply'],
    queryFn: async () => {
      const [total, max] = await Promise.all([
        mintclub.getTotalSupply(),
        mintclub.getMaxSupply(),
      ]);
      return {
        total: Number(total),
        max: Number(max),
      };
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Buy Estimation
  const getBuyEstimation = async (amount: number = 1) => {
    const estimation = await mintclub.getBuyEstimation(BigInt(amount));
    return {
      wei: estimation.toString(),
      eth: formatEther(estimation),
    };
  };

  // Sell Estimation
  const getSellEstimation = async (amount: number = 1) => {
    const estimation = await mintclub.getSellEstimation(BigInt(amount));
    return {
      wei: estimation.toString(),
      eth: formatEther(estimation),
    };
  };

  // Mint NFT
  const mintMutation = useMutation({
    mutationFn: async ({ quantity, slippage, callbacks }: { 
      quantity: number; 
      slippage: number;
      callbacks?: mintclub.TransactionCallbacks;
    }) => {
      if (!address) throw new Error('Wallet not connected');
      return await mintclub.buyNFT(BigInt(quantity), address, slippage, callbacks);
    },
    onSuccess: () => {
      refetchBalance();
      refetchPrice();
      queryClient.invalidateQueries({ queryKey: ['nft-supply'] });
      queryClient.invalidateQueries({ queryKey: ['user', address] });
    },
  });

  // Sell NFT
  const sellMutation = useMutation({
    mutationFn: async ({ quantity, slippage, callbacks }: { 
      quantity: number; 
      slippage: number;
      callbacks?: mintclub.TransactionCallbacks;
    }) => {
      if (!address) throw new Error('Wallet not connected');
      return await mintclub.sellNFT(BigInt(quantity), address, slippage, callbacks);
    },
    onSuccess: () => {
      refetchBalance();
      refetchPrice();
      queryClient.invalidateQueries({ queryKey: ['nft-supply'] });
    },
  });

  return {
    balance: balance ?? 0,
    price,
    supply,
    getBuyEstimation,
    getSellEstimation,
    mint: (params: { quantity: number; slippage: number; callbacks?: mintclub.TransactionCallbacks }) => 
      mintMutation.mutate({ quantity: params.quantity, slippage: params.slippage, callbacks: params.callbacks }),
    sell: (params: { quantity: number; slippage: number; callbacks?: mintclub.TransactionCallbacks }) => 
      sellMutation.mutate({ quantity: params.quantity, slippage: params.slippage, callbacks: params.callbacks }),
    isMinting: mintMutation.isPending,
    isSelling: sellMutation.isPending,
    mintError: mintMutation.error,
    sellError: sellMutation.error,
    refetchBalance,
    refetchPrice,
  };
}
