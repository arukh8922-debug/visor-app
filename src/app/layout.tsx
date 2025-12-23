import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';

export const metadata: Metadata = {
  title: 'Visor - NFT Points Farming',
  description: 'Mint Visor NFT, earn points, and qualify for future airdrops on Base',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen">
        <Providers>
          <Header />
          <main className="pt-14 pb-20 min-h-screen">
            <div className="max-w-[430px] mx-auto">
              {children}
            </div>
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
