'use client';

import { ConnectButton } from '@/components/wallet/connect-button';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-black/90 backdrop-blur-md border-b border-[#222222] safe-top">
      <div className="flex items-center justify-between h-full px-4 max-w-[430px] mx-auto">
        {/* Logo */}
        <h1 className="text-xl font-bold text-white tracking-tight">VISOR</h1>

        {/* Wallet Button */}
        <ConnectButton />
      </div>
    </header>
  );
}
