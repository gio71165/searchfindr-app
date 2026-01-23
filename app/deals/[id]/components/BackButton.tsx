'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const tabNames: Record<string, string> = {
  saved: 'Saved Deals',
  on_market: 'On-Market Deals',
  off_market: 'Off-Market Deals',
  cim_pdf: 'CIM Uploads',
  financials: 'Financials',
};

export function BackButton({ dealSourceType }: { dealSourceType?: string | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fromView = searchParams.get('from_view') || searchParams.get('from') || searchParams.get('view') || null;
  const tabName = fromView ? tabNames[fromView] || 'Dashboard' : (dealSourceType ? tabNames[dealSourceType] || 'Dashboard' : 'Dashboard');
  const backHref = fromView ? `/dashboard?view=${encodeURIComponent(fromView)}` : '/dashboard';

  return (
    <button
      onClick={() => router.push(backHref)}
      className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4 transition-colors min-h-[44px] px-2"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Back to {tabName}</span>
    </button>
  );
}
