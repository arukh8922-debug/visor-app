'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import { useState, useEffect } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { ToastProvider } from '@/components/ui/toast';
import { validateEnv } from '@/lib/env-validation';

// Validate environment variables on module load (client-side only checks NEXT_PUBLIC_*)
if (typeof window !== 'undefined') {
  const envResult = validateEnv();
  if (!envResult.valid) {
    console.error('❌ Missing environment variables:', envResult.missing);
  }
}

// Wagmi config with multiple connectors for browser + Farcaster support
// Base Mainnet only - use reliable RPC
const BASE_RPC_URL = process.env.NEXT_PUBLIC_BASE_MAINNET_RPC || 'https://mainnet.base.org';

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
  connectors: [
    // Farcaster MiniApp connector (for Farcaster context)
    farcasterMiniApp(),
    // Injected wallets (MetaMask, etc.)
    injected({
      shimDisconnect: true,
    }),
    // Coinbase Wallet
    coinbaseWallet({
      appName: 'Visor',
      appLogoUrl: 'https://visor.app/logo.png',
    }),
  ],
});

// Offline Banner Component
function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Check initial state
    setIsOffline(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-[100] bg-red-500 text-white text-center py-2 text-sm"
      role="alert"
      aria-live="assertive"
    >
      ⚠️ You are offline. Some features may not work.
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30000,
        retry: 2,
      },
    },
  }));
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize Farcaster SDK
    const init = async () => {
      try {
        if (sdk && typeof sdk.actions?.ready === 'function') {
          await sdk.actions.ready();
        }
      } catch (e) {
        console.log('Not in Farcaster context');
      }
      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black" role="status" aria-label="Loading application">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" aria-hidden="true" />
          <p className="text-sm text-[#666666]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <OfflineBanner />
          {children}
        </ToastProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
