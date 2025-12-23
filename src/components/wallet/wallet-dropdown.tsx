'use client';

import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { truncateAddress } from '@/lib/utils';
import { getExplorerLink } from '@/lib/config';
import { cn } from '@/lib/utils';

interface WalletDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletDropdown({ isOpen, onClose }: WalletDropdownProps) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  if (!isOpen || !address) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    onClose();
  };

  const handleViewExplorer = () => {
    window.open(getExplorerLink('address', address), '_blank');
    onClose();
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dropdown */}
      <div 
        className="absolute right-0 top-full mt-2 w-72 z-50 bg-[#111111] border border-[#333333] rounded-xl shadow-lg overflow-hidden animate-scaleIn"
        role="menu"
        aria-orientation="vertical"
      >
        {/* Address Section */}
        <div className="p-4 border-b border-[#333333]">
          <p className="text-xs text-[#666666] mb-1">Connected Wallet</p>
          <p className="text-sm text-white font-mono break-all">{address}</p>
          <p className="text-xs text-[#a0a0a0] mt-1">
            {truncateAddress(address, 6)}
          </p>
        </div>

        {/* Balance Section */}
        {balance && (
          <div className="p-4 border-b border-[#333333]">
            <p className="text-xs text-[#666666] mb-1">Balance</p>
            <p className="text-lg font-semibold text-white tabular-nums">
              {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="p-2">
          <button
            onClick={handleCopy}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5',
              'text-sm text-[#a0a0a0] hover:text-white hover:bg-white/5',
              'rounded-lg transition-colors'
            )}
            role="menuitem"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy Address
          </button>
          
          <button
            onClick={handleViewExplorer}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5',
              'text-sm text-[#a0a0a0] hover:text-white hover:bg-white/5',
              'rounded-lg transition-colors'
            )}
            role="menuitem"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Explorer
          </button>
          
          <div className="my-1 border-t border-[#222222]" />
          
          <button
            onClick={handleDisconnect}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5',
              'text-sm text-red-500 hover:bg-red-500/10',
              'rounded-lg transition-colors'
            )}
            role="menuitem"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect
          </button>
        </div>
      </div>
    </>
  );
}
