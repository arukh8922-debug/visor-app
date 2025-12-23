'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { truncateAddress } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { CHAIN_ID } from '@/lib/config';
import { getFarcasterUserByAddress, type FarcasterUser } from '@/lib/farcaster';

// Wallet icons
const WalletIcons: Record<string, string> = {
  'MetaMask': '🦊',
  'Coinbase Wallet': '🔵',
  'Farcaster': '🟣',
  'Injected': '💉',
  'Browser Wallet': '🌐',
};

function getWalletIcon(name: string): string {
  return WalletIcons[name] || '👛';
}

function getWalletDisplayName(id: string, name: string): string {
  if (id === 'farcasterMiniApp') return 'Farcaster';
  if (id === 'injected') return 'Browser Wallet';
  if (id === 'coinbaseWalletSDK') return 'Coinbase Wallet';
  return name;
}

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(null);

  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;

  // Fetch Farcaster user data when connected
  useEffect(() => {
    if (address) {
      getFarcasterUserByAddress(address).then(setFarcasterUser);
    } else {
      setFarcasterUser(null);
    }
  }, [address]);

  if (isConnected && address) {
    // Wrong network warning
    if (isWrongNetwork) {
      return (
        <button
          onClick={() => switchChain({ chainId: CHAIN_ID })}
          className={cn(
            'flex items-center gap-2 px-3 py-2',
            'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50',
            'rounded-xl text-sm font-medium transition-colors'
          )}
        >
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400">Switch to Base</span>
        </button>
      );
    }

    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={cn(
            'flex items-center gap-2 px-3 py-2',
            'bg-[#111111] hover:bg-[#1a1a1a] border border-[#333333]',
            'rounded-xl text-sm font-medium transition-colors'
          )}
        >
          {/* PFP or green dot */}
          {farcasterUser?.pfpUrl ? (
            <img 
              src={farcasterUser.pfpUrl} 
              alt={farcasterUser.username}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-2 h-2 rounded-full bg-green-500" />
          )}
          {/* Username or address */}
          <span className="text-white">
            {farcasterUser?.username ? `@${farcasterUser.username}` : truncateAddress(address)}
          </span>
        </button>

        {showDropdown && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowDropdown(false)}
            />
            <div className="absolute right-0 top-full mt-2 w-64 z-50 bg-[#111111] border border-[#333333] rounded-xl shadow-lg overflow-hidden animate-scaleIn">
              {/* User Info */}
              <div className="p-4 border-b border-[#333333]">
                {farcasterUser ? (
                  <div className="flex items-center gap-3">
                    {farcasterUser.pfpUrl && (
                      <img 
                        src={farcasterUser.pfpUrl} 
                        alt={farcasterUser.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{farcasterUser.displayName}</p>
                      <p className="text-xs text-[#666666]">@{farcasterUser.username}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-[#666666] mb-1">Connected Wallet</p>
                    <p className="text-sm text-white font-mono break-all">{address}</p>
                  </>
                )}
              </div>

              {/* Address (if Farcaster user) */}
              {farcasterUser && (
                <div className="px-4 py-3 border-b border-[#333333]">
                  <p className="text-xs text-[#666666] mb-1">Wallet</p>
                  <p className="text-xs text-white font-mono">{truncateAddress(address, 8)}</p>
                </div>
              )}

              {/* Balance */}
              {balance && (
                <div className="px-4 py-3 border-b border-[#333333]">
                  <p className="text-xs text-[#666666] mb-1">Balance</p>
                  <p className="text-sm text-white">
                    {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-[#a0a0a0] hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Address
                </button>
                <button
                  onClick={() => {
                    disconnect();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Disconnect
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowWalletModal(true)}
        disabled={isPending}
        className={cn(
          'px-4 py-2 bg-white text-black hover:bg-gray-200',
          'rounded-xl text-sm font-medium transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isPending ? 'Connecting...' : 'Connect'}
      </button>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowWalletModal(false)}
          />
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto bg-[#111111] border border-[#333333] rounded-2xl shadow-xl animate-scaleIn">
            <div className="p-4 border-b border-[#333333]">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
                <button
                  onClick={() => setShowWalletModal(false)}
                  className="p-1 text-[#666666] hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-[#666666] mt-1">Choose your preferred wallet</p>
            </div>

            <div className="p-3 space-y-2">
              {connectors.map((connector) => {
                const displayName = getWalletDisplayName(connector.id, connector.name);
                const icon = getWalletIcon(displayName);
                
                return (
                  <button
                    key={connector.uid}
                    onClick={() => {
                      connect({ connector });
                      setShowWalletModal(false);
                    }}
                    disabled={isPending}
                    className={cn(
                      'w-full flex items-center gap-3 p-3',
                      'bg-[#1a1a1a] hover:bg-[#222222] border border-[#333333]',
                      'rounded-xl text-left transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <span className="text-2xl">{icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{displayName}</p>
                      {connector.id === 'injected' && (
                        <p className="text-xs text-[#666666]">MetaMask, Rabby, etc.</p>
                      )}
                      {connector.id === 'farcasterMiniApp' && (
                        <p className="text-xs text-[#666666]">For Farcaster MiniApp</p>
                      )}
                      {connector.id === 'coinbaseWalletSDK' && (
                        <p className="text-xs text-[#666666]">Coinbase Wallet app</p>
                      )}
                    </div>
                    <svg className="w-4 h-4 text-[#666666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-[#333333]">
              <p className="text-xs text-[#666666] text-center">
                By connecting, you agree to our Terms of Service
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
