import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';

const baseUrl = 'https://visor-app-opal.vercel.app';

export const metadata: Metadata = {
  title: 'Visor - NFT Points Earn',
  description: 'Mint Visor NFT, earn points through referrals and daily activity, and qualify for future airdrops on Base.',
  icons: {
    icon: `${baseUrl}/icon.jpg`,
    apple: `${baseUrl}/icon.jpg`,
  },
  openGraph: {
    title: 'Visor - NFT Points Earn',
    description: 'Mint Visor NFT, earn points, and qualify for future airdrops on Base.',
    url: baseUrl,
    siteName: 'Visor',
    images: [
      {
        url: `${baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Visor - NFT Points Earn on Base',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Visor - NFT Points Earn',
    description: 'Mint Visor NFT, earn points, and qualify for future airdrops on Base.',
    images: [`${baseUrl}/og-image.jpg`],
  },
  other: {
    // Farcaster MiniApp config for embed preview
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: `${baseUrl}/heroimage.jpg`,
      button: {
        title: '🔭 Open Visor',
        action: {
          type: 'launch_frame',
          name: 'Visor',
          url: baseUrl,
          splashImageUrl: `${baseUrl}/splash.jpg`,
          splashBackgroundColor: '#0a0a0a',
        },
      },
    }),
  },
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
