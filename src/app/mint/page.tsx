'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWhitelist } from '@/hooks/use-whitelist';
import { useToast } from '@/components/ui/toast';
import { getNFTBalance, getTotalSupply, VISOR_OPENSEA_URL } from '@/lib/nft';
import { NFT_OPENSEA_URL } from '@/lib/config';
import { fireSuccessConfetti } from '@/lib/confetti';
import Image from 'next/image';

// NFT Image URL from env or default
const NFT_IMAGE_URL = process.env.NEXT_PUBLIC_VISOR_NFT_IMAGE || '';

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { isWhitelisted, isLoading: whitelistLoading } = useWhitelist();
  const { showToast } = useToast();
  
  const [balance, setBalance] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fetch NFT data
  useEffect(() => {
    async function fetchData() {
      if (!address) return;
      
      setLoading(true);
      try {
        const [bal, supply] = await Promise.all([
          getNFTBalance(address),
          getTotalSupply(),
        ]);
        setBalance(bal);
        setTotalSupply(supply);
      } catch (error) {
        console.error('Failed to fetch NFT data:', error);
      }
      setLoading(false);
    }
    
    fetchData();
  }, [address]);

  const handleMintOnOpenSea = () => {
    if (!isWhitelisted) {
      showToast('Complete whitelist tasks first', 'warning');
      return;
    }
    
    // Open OpenSea collection page
    window.open(NFT_OPENSEA_URL || VISOR_OPENSEA_URL, '_blank');
  };

  // Sync NFT balance from blockchain and award points
  const handleSyncBalance = async () => {
    if (!address) return;
    
    setSyncing(true);
    try {
      const res = await fetch('/api/nft/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || 'Failed to sync', 'error');
        return;
      }
      
      // Update local balance
      setBalance(data.current_balance);
      
      if (data.new_mints > 0) {
        fireSuccessConfetti();
        showToast(
          `🎉 +${data.points_awarded.toLocaleString()} points! ${data.new_mints} NFT${data.new_mints > 1 ? 's' : ''} synced!`,
          'success'
        );
      } else {
        showToast('Balance synced! No new NFTs found.', 'info');
      }
    } catch (error) {
      console.error('Sync error:', error);
      showToast('Failed to sync balance', 'error');
    } finally {
      setSyncing(false);
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

  if (!isConnected) {
    return (
      <div className="p-4">
        <Card variant="default" className="text-center py-12">
          <div className="text-4xl mb-4">🎨</div>
          <p className="text-white font-medium mb-2">Connect to Mint NFTs</p>
          <p className="text-sm text-[#666666]">Connect your wallet to start minting</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Whitelist Warning */}
      {!whitelistLoading && !isWhitelisted && (
        <Card variant="outlined" className="border-yellow-500/30 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="text-sm font-medium text-white">Complete Whitelist Tasks</p>
              <p className="text-xs text-[#a0a0a0]">Go to Home tab to complete tasks before minting</p>
            </div>
          </div>
        </Card>
      )}

      {/* First NFT CTA */}
      {balance === 0 && isWhitelisted && (
        <Card variant="outlined" className="border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎉</div>
            <div>
              <p className="text-sm font-medium text-white">Ready to Mint!</p>
              <p className="text-xs text-[#a0a0a0]">Mint your first NFT and earn 100,000 points + VIP status</p>
            </div>
          </div>
        </Card>
      )}

      {/* NFT Card */}
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
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-[#222222] to-[#111111] flex items-center justify-center border border-[#333333]">
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
            
            {/* VIP Badge */}
            {balance > 0 && (
              <div className="absolute -bottom-2 -right-2 px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full">
                ⭐ VIP
              </div>
            )}
          </div>

          {/* Price */}
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-white">$1.00</p>
            <p className="text-sm text-[#666666]">Price per NFT</p>
          </div>

          {/* Supply Info */}
          <div className="w-full mb-4">
            <div className="flex justify-between text-xs text-[#a0a0a0] mb-1">
              <span>Total Minted</span>
              <span>{loading ? '...' : totalSupply.toLocaleString()}</span>
            </div>
          </div>

          {/* Mint Button - Opens OpenSea */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleMintOnOpenSea}
            disabled={!isWhitelisted}
          >
            Mint on OpenSea
          </Button>

          {/* Sync Balance Button */}
          <Button
            variant="secondary"
            size="lg"
            className="w-full mt-2"
            onClick={handleSyncBalance}
            loading={syncing}
            disabled={syncing}
          >
            {syncing ? 'Syncing...' : '🔄 Sync Balance & Claim Points'}
          </Button>

          {/* Disabled reason hint */}
          {!isWhitelisted && (
            <p className="text-xs text-yellow-500 text-center mt-2">
              Complete whitelist tasks to mint
            </p>
          )}

          {/* Points Info */}
          <div className="mt-4 p-3 bg-[#111111] rounded-lg w-full">
            <p className="text-xs text-[#a0a0a0] text-center">
              🎁 Mint NFT to earn <span className="text-white font-bold">100,000 points</span> + <span className="text-yellow-500 font-bold">VIP status</span>
            </p>
          </div>

          {/* OpenSea Link */}
          <a
            href={NFT_OPENSEA_URL || VISOR_OPENSEA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-400 hover:text-indigo-300 mt-3"
          >
            View Collection on OpenSea →
          </a>
        </div>
      </Card>

      {/* Info Card */}
      <Card variant="default" padding="sm">
        <div className="text-xs text-[#666666] space-y-2">
          <p>• NFT minting happens on OpenSea</p>
          <p>• After minting, click "Sync Balance" to claim your points</p>
          <p>• 100,000 points + VIP status per NFT minted</p>
        </div>
      </Card>
    </div>
  );
}
