import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MarketingNavigation } from '@/components/marketing/Navigation';
import { Footer } from '@/components/marketing/Footer';
import '../globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SearchFindr - AI Deal Screening for Search Funds',
    template: '%s | SearchFindr'
  },
  description: 'Find better deals faster. AI-powered deal screening for search fund operators. Analyze CIMs, track deals, and make faster acquisition decisions.',
  keywords: ['search fund', 'deal screening', 'CIM analysis', 'AI deal analysis', 'M&A', 'search fund software'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://searchfindr-app.vercel.app',
    siteName: 'SearchFindr',
    title: 'SearchFindr - AI Deal Screening for Search Funds',
    description: 'Find better deals faster. AI-powered deal screening for search fund operators.',
  },
};

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user is authenticated - redirect to dashboard if so
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white flex flex-col">
      {/* Subtle background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 right-1/3 h-96 w-[44rem] rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.03)_1px,transparent_0)] [background-size:32px_32px] opacity-40" />
      </div>

      <MarketingNavigation />
      <main className="flex-1 relative z-10">
        {children}
      </main>
      <Footer />
    </div>
  );
}
