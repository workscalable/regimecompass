import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Regime Compass',
  description: 'Multi-Factor Market Navigation System',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-center">
              Regime Compass
            </h1>
            <p className="text-center text-gray-400 mt-2">
              Multi-Factor Market Navigation System
            </p>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}