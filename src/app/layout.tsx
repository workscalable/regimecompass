import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '@/components/Navigation';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RegimeCompass - Advanced Trading System',
  description: 'Professional trading system with advanced analytics, options trading, and portfolio management',
  keywords: 'trading, options, analytics, portfolio, risk management, market regime',
  authors: [{ name: 'RegimeCompass Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'RegimeCompass - Advanced Trading System',
    description: 'Professional trading system with advanced analytics, options trading, and portfolio management',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RegimeCompass - Advanced Trading System',
    description: 'Professional trading system with advanced analytics, options trading, and portfolio management',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white antialiased`}>
        <div className="min-h-screen flex">
          {/* Sidebar Navigation */}
          <div className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-gray-900 lg:border-r lg:border-gray-800 lg:sticky lg:top-0 lg:h-screen">
            <Navigation />
          </div>
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <main className="flex-1">
              {children}
            </main>
          </div>
        </div>
        
        {/* Mobile Navigation Overlay */}
        <div className="lg:hidden">
          <Navigation />
        </div>
        
        {/* Toast Notifications */}
        <Toaster 
          position="top-right"
          theme="dark"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}