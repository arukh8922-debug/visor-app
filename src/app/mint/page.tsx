'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { NFTMintCard } from '@/components/features/nft-mint-card';
import { TransactionStatus } from '@/components/features/transaction-status';
import { SlippageSettings } from '@/components/ui/slippage-settings';
import { useNFT } from '@/hooks/use-nft';
import { useWhitelist } from '@/hooks/use-whitelist';
import { useToast } from '@/components/ui/toast';
import { Card } from '@/components/ui/card';
import { fireConfetti } from '@/lib/confetti';
import { TX_CONFIG } from '@/lib/config';

type TxState = 'idle' | 'waiting' | 'pending' | 'success' | 'failed';

export default function MintPage() {
  const { address, isConnected } = useAccount();
  const { balance, price, supply, mint, sell, getBuyEstimation, getSellEstimation, isMinting, isSelling } = useNFT();
  const { isWhitelisted, isLoading: whitelistLoading } = useWhitelist();
  const { showToast } = useToast();

  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<string>();
  const [txMessage, setTxMessage] = useState<string>();
  const [slippage, setSlippage] = useState(TX_CONFIG.defaultSlippage);
  const [lastMintQuantity, setLastMintQuantity] = useState(1);

  const handleMint = (quantity: number) => {
    if (!isWhitelisted) {
      showToast('Complete whitelist tasks first', 'warning');
      return;
    }

    setLastMintQuantity(quantity);
    setTxState('waiting');
    setTxMessage('Please confirm in your wallet');

    mint({
      quantity,
      slippage,
      callbacks: {
        onSignatureRequest: () => {
          setTxState('waiting');
        },
        onSigned: (hash) => {
          setTxHash(hash);
          setTxState('pending');
          setTxMessage('Transaction is being processed...');
        },
        onSuccess: async () => {
          setTxState('success');
          const points = (100000 * quantity).toLocaleString();
          setTxMessage(`${quantity} NFT${quantity > 1 ? 's' : ''} minted successfully! +${points} points`);
          
          // Fire confetti!
          fireConfetti();
          
          // Record mint callback
          try {
            await fetch('/api/nft/mint-callback', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wallet_address: address,
                tx_hash: txHash,
                amount: quantity,
              }),
            });
          } catch (e) {
            console.error('Failed to record mint:', e);
          }
        },
        onError: (error) => {
          setTxState('failed');
          setTxMessage(error instanceof Error ? error.message : 'Transaction failed');
        },
      },
    });
  };

  const handleSell = (quantity: number) => {
    setTxState('waiting');
    setTxMessage('Please confirm in your wallet');

    sell({
      quantity,
      slippage,
      callbacks: {
        onSignatureRequest: () => {
          setTxState('waiting');
        },
        onSigned: (hash) => {
          setTxHash(hash);
          setTxState('pending');
          setTxMessage('Transaction is being processed...');
        },
        onSuccess: () => {
          setTxState('success');
          setTxMessage(`${quantity} NFT${quantity > 1 ? 's' : ''} sold successfully!`);
        },
        onError: (error) => {
          setTxState('failed');
          setTxMessage(error instanceof Error ? error.message : 'Transaction failed');
        },
      },
    });
  };

  const handleCloseTx = () => {
    setTxState('idle');
    setTxHash(undefined);
    setTxMessage(undefined);
  };

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
              <p className="text-xs text-[#a0a0a0]">Mint your first NFT and earn 100,000 points</p>
            </div>
          </div>
        </Card>
      )}

      {/* NFT Mint Card */}
      <NFTMintCard
        price={price?.eth}
        balance={balance}
        totalSupply={supply?.total || 0}
        maxSupply={supply?.max || 10000}
        onMint={handleMint}
        onSell={handleSell}
        getBuyEstimation={getBuyEstimation}
        getSellEstimation={getSellEstimation}
        minting={isMinting}
        selling={isSelling}
        disabled={!isWhitelisted}
      />

      {/* Transaction Settings */}
      <Card variant="default" padding="sm">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-[#666666]">Estimated Gas</span>
          <span className="text-[#a0a0a0]">~0.0001 ETH</span>
        </div>
        
        {/* Slippage Settings */}
        <SlippageSettings
          value={slippage}
          onChange={setSlippage}
        />
      </Card>

      {/* Transaction Status Modal */}
      <TransactionStatus
        state={txState}
        txHash={txHash}
        message={txMessage}
        onRetry={txState === 'failed' ? () => handleMint(lastMintQuantity) : undefined}
        onClose={handleCloseTx}
      />
    </div>
  );
}
