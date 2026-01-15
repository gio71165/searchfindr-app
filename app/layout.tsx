import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: {
    default: 'SearchFindr - AI Deal Analysis for Search Funds',
    template: '%s | SearchFindr'
  },
  description: 'AI-powered deal analysis and due diligence for search fund operators and SMB buyers. Analyze CIMs, financials, and off-market opportunities.',
  keywords: ['search fund', 'deal analysis', 'due diligence', 'AI analysis', 'CIM', 'M&A', 'SMB acquisition'],
  authors: [{ name: 'SearchFindr' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://searchfindr-app.vercel.app',
    siteName: 'SearchFindr',
    title: 'SearchFindr - AI Deal Analysis',
    description: 'AI-powered deal analysis for search fund operators',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SearchFindr',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SearchFindr - AI Deal Analysis',
    description: 'AI-powered deal analysis for search fund operators',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9FAFB] dark:bg-slate-900">
        <ErrorBoundary>
          <Navigation />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
