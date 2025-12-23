'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatEthValue } from '@/lib/utils';
import { cn } from '@/lib/utils';

// NFT Image URL from env or default
const NFT_IMAGE_URL = process.env.NEXT_PUBLIC_VISOR_NFT_IMAGE || '';

interface NFTMintCardProps {
  price?: string;
  balance: number;
  totalSupply: number;
  maxSupply: number;
  onMint: (quantity: number) => void;
  onSell: (quantity: number) => void;
  getBuyEstimation?: (amount: number) => Promise<{ eth: string }>;
  getSellEstimation?: (amount: number) => Promise<{ eth: string }>;
  loading?: boolean;
  minting?: boolean;
  selling?: boolean;
  disabled?: boolean;
}

export function NFTMintCard({
  price,
  balance,
  totalSupply,
  maxSupply,
  onMint,
  onSell,
  getBuyEstimation,
  getSellEstimation,
  loading,
  minting,
  selling,
  disabled,
}: NFTMintCardProps) {
  const [mintQuantity, setMintQuantity] = useState(1);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [totalMintPrice, setTotalMintPrice] = useState<string | null>(null);
  const [totalSellPrice, setTotalSellPrice] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const progress = maxSupply > 0 ? (totalSupply / maxSupply) * 100 : 0;
  const isSoldOut = totalSupply >= maxSupply;
  const remainingSupply = maxSupply - totalSupply;

  // Calculate total price for mint quantity
  useEffect(() => {
    if (getBuyEstimation && mintQuantity > 0) {
      getBuyEstimation(mintQuantity)
        .then((est) => setTotalMintPrice(est.eth))
        .catch(() => setTotalMintPrice(null));
    }
  }, [mintQuantity, getBuyEstimation]);

  // Calculate total price for sell quantity
  useEffect(() => {
    if (getSellEstimation && sellQuantity > 0 && balance > 0) {
      getSellEstimation(sellQuantity)
        .then((est) => setTotalSellPrice(est.eth))
        .catch(() => setTotalSellPrice(null));
    }
  }, [sellQuantity, getSellEstimation, balance]);

  // Reset sell quantity if balance changes
  useEffect(() => {
    if (sellQuantity > balance) {
      setSellQuantity(Math.max(1, balance));
    }
  }, [balance, sellQuantity]);

  const handleMintQuantityChange = (delta: number) => {
    const newQty = mintQuantity + delta;
    if (newQty >= 1 && newQty <= Math.min(10, remainingSupply)) {
      setMintQuantity(newQty);
    }
  };

  const handleSellQuantityChange = (delta: number) => {
    const newQty = sellQuantity + delta;
    if (newQty >= 1 && newQty <= balance) {
      setSellQuantity(newQty);
    }
  };

  // Convert IPFS URL to gateway URL
  const getImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('ipfs://')) {
      return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }
    return url;
  };

  const imageUrl = getImageUrl(NFT_IMAGE_URL);
  const showImage = imageUrl && !imageError;

  if (loading) {
    return (
      <Card variant="elevated">
        <div className="flex flex-col items-center">
          <Skeleton className="w-48 h-48 rounded-xl mb-4" />
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-4" />
          <Skeleton className="h-11 w-full mb-2" />
          <Skeleton className="h-4 w-40" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <div className="flex flex-col items-center">
        {/* NFT Artwork */}
        <div className="relative w-48 h-48 mb-4">
          {showImage ? (
            <Image
              src={imageUrl}
              alt="VISOR NFT"
              fill
              className="rounded-xl object-cover border border-[#333333]"
              onError={() => setImageError(true)}
              unoptimized={imageUrl.includes('ipfs.io')}
            />
          ) : (
            <div className={cn(
              'w-full h-full rounded-xl',
              'bg-gradient-to-br from-[#222222] to-[#111111]',
              'flex items-center justify-center',
              'border border-[#333333]'
            )}>
              <div className="text-center">
                <p className="text-4xl font-bold text-white mb-1">VISOR</p>
                <p className="text-xs text-[#666666]">NFT</p>
              </div>
            </div>
          )}
          
          {/* Balance Badge */}
          {balance > 0 && (
            <div className="absolute -top-2 -right-2 px-2 py-1 bg-white text-black text-xs font-bold rounded-full">
              Owned: {balance}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="text-center mb-4">
          <p className="text-2xl font-bold text-white">
            {price ? `${formatEthValue(price)} ETH` : '---'}
          </p>
          <p className="text-sm text-[#666666]">Price per NFT</p>
        </div>

        {/* Supply Progress */}
        <div className="w-full mb-4">
          <div className="flex justify-between text-xs text-[#a0a0a0] mb-1">
            <span>Supply</span>
            <span>{totalSupply.toLocaleString()} / {maxSupply.toLocaleString()}</span>
          </div>
          <div className="h-2 bg-[#222222] rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Mint Section */}
        <div className="w-full space-y-3 mb-4">
          {/* Quantity Selector for Mint - Always enabled for selection */}
          <div className="flex items-center justify-between bg-[#1a1a1a] rounded-xl p-3 border border-[#333333]">
            <span className="text-sm text-[#a0a0a0]">Mint Quantity</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleMintQuantityChange(-1)}
                disabled={mintQuantity <= 1 || isSoldOut}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  'bg-[#222222] border border-[#444444]',
                  'text-white font-bold text-lg',
                  'hover:bg-[#333333] active:bg-[#444444] transition-colors',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="text-xl font-bold text-white w-8 text-center">
                {mintQuantity}
              </span>
              <button
                type="button"
                onClick={() => handleMintQuantityChange(1)}
                disabled={mintQuantity >= Math.min(10, remainingSupply) || isSoldOut}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  'bg-[#222222] border border-[#444444]',
                  'text-white font-bold text-lg',
                  'hover:bg-[#333333] active:bg-[#444444] transition-colors',
                  'disabled:opacity-30 disabled:cursor-not-allowed'
                )}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Total Price Display */}
          {totalMintPrice && (
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-[#666666]">Total Cost ({mintQuantity} NFT{mintQuantity > 1 ? 's' : ''})</span>
              <span className="text-white font-medium">
                {formatEthValue(totalMintPrice)} ETH
              </span>
            </div>
          )}

          {/* Mint Button - This is what gets disabled */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => onMint(mintQuantity)}
            loading={minting}
            disabled={disabled || isSoldOut || minting || selling}
          >
            {isSoldOut ? 'Sold Out' : `Mint ${mintQuantity} NFT${mintQuantity > 1 ? 's' : ''}`}
          </Button>

          {/* Disabled reason hint */}
          {disabled && !isSoldOut && (
            <p className="text-xs text-yellow-500 text-center">
              Complete whitelist tasks to mint
            </p>
          )}
        </div>

        {/* Sell Section (only if user has NFTs) */}
        {balance > 0 && (
          <div className="w-full space-y-3 pt-3 border-t border-[#333333]">
            {/* Quantity Selector for Sell */}
            <div className="flex items-center justify-between bg-[#1a1a1a] rounded-xl p-3 border border-[#333333]">
              <span className="text-sm text-[#a0a0a0]">Sell Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleSellQuantityChange(-1)}
                  disabled={sellQuantity <= 1}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    'bg-[#222222] border border-[#444444]',
                    'text-white font-bold text-lg',
                    'hover:bg-[#333333] active:bg-[#444444] transition-colors',
                    'disabled:opacity-30 disabled:cursor-not-allowed'
                  )}
                  aria-label="Decrease sell quantity"
                >
                  −
                </button>
                <span className="text-xl font-bold text-white w-8 text-center">
                  {sellQuantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleSellQuantityChange(1)}
                  disabled={sellQuantity >= balance}
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    'bg-[#222222] border border-[#444444]',
                    'text-white font-bold text-lg',
                    'hover:bg-[#333333] active:bg-[#444444] transition-colors',
                    'disabled:opacity-30 disabled:cursor-not-allowed'
                  )}
                  aria-label="Increase sell quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Total Sell Price Display */}
            {totalSellPrice && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-[#666666]">You Receive</span>
                <span className="text-green-400 font-medium">
                  ~{formatEthValue(totalSellPrice)} ETH
                </span>
              </div>
            )}

            {/* Sell Button */}
            <Button
              variant="secondary"
              size="md"
              className="w-full"
              onClick={() => onSell(sellQuantity)}
              loading={selling}
              disabled={minting || selling}
            >
              Sell {sellQuantity} NFT{sellQuantity > 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {/* Points Info */}
        <p className="text-xs text-[#666666] mt-4">
          Earn {(100000 * mintQuantity).toLocaleString()} points for minting {mintQuantity} NFT{mintQuantity > 1 ? 's' : ''}
        </p>
      </div>
    </Card>
  );
}
