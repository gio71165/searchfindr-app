import type { Metadata } from 'next';
import './globals.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthProvider } from '@/lib/auth-context';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';

export const metadata: Metadata = {
  metadataBase: new URL('https://searchfindr-app.vercel.app'),
  title: {
    default: 'SearchFindr - AI Deal Analysis for Search Funds',
    template: '%s | SearchFindr'
  },
  description: 'AI-powered deal analysis and due diligence for search fund operators and SMB buyers. Analyze CIMs, financials, and off-market opportunities. Get instant red flags, deal tier, and verdict in 60 seconds.',
  keywords: [
    'search fund',
    'deal analysis',
    'due diligence',
    'AI analysis',
    'CIM analysis',
    'M&A software',
    'SMB acquisition',
    'search fund software',
    'deal screening',
    'confidential information memorandum',
    'quality of earnings',
    'SBA 7a loan calculator',
    'search fund operator',
    'ETA buyer',
    'lower middle market',
    'deal pipeline management',
    'broker deal tracking',
    'financial analysis',
    'red flags analysis',
    'deal memo generator'
  ],
  authors: [{ name: 'SearchFindr' }],
  creator: 'SearchFindr',
  publisher: 'SearchFindr',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://searchfindr-app.vercel.app',
    siteName: 'SearchFindr',
    title: 'SearchFindr - AI Deal Analysis for Search Funds',
    description: 'AI-powered deal analysis and due diligence for search fund operators. Analyze CIMs, financials, and off-market opportunities. Get instant red flags, deal tier, and verdict in 60 seconds.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SearchFindr - AI Deal Analysis for Search Funds',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SearchFindr - AI Deal Analysis for Search Funds',
    description: 'AI-powered deal analysis and due diligence for search fund operators. Analyze CIMs, financials, and off-market opportunities.',
    images: ['/og-image.png'],
    creator: '@searchfindr',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add Google Search Console verification if you have it
    // google: 'your-verification-code',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F9FAFB]">
        <ErrorBoundary>
          <ToastProvider>
            <AuthProvider>
              {children}
              <OnboardingChecklist />
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
