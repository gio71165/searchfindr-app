// app/deals/[id]/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useDealData } from './hooks/useDealData';
import { FinancialsDealView } from './views/FinancialsDealView';
import { CimDealView } from './views/CimDealView';
import { OffMarketDealView } from './views/OffMarketDealView';
import { OnMarketDealView } from './views/OnMarketDealView';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DealPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const id = (params?.id as string | undefined) ?? undefined;

  // support multiple query names
  const fromView = searchParams.get('from_view') || searchParams.get('from') || searchParams.get('view') || null;
  const backHref = fromView ? `/dashboard?view=${encodeURIComponent(fromView)}` : '/dashboard';

  const {
    deal,
    loading,
    analyzing,
    aiError,
    runningOffMarketDD,
    offMarketError,
    processingCim,
    cimError,
    cimSuccess,
    finLoading,
    finRunning,
    finError,
    finAnalysis,
    savingToggle,
    canToggleSave,
    toggleSaved,
    runOnMarketInitialDiligence,
    runOffMarketInitialDiligence,
    runCimAnalysis,
    runFinancialAnalysis,
    refreshDeal,
  } = useDealData(id);

  // Track CIM opened - MUST be before early returns (React hooks rule)
  useEffect(() => {
    if (deal?.source_type === 'cim_pdf') {
      window.dispatchEvent(new CustomEvent('onboarding:cim-opened'));
    }
  }, [deal?.source_type]);

  // Page states
  if (!id) {
    return (
      <main className="py-10 text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-slate-600">Loading deal…</p>
      </main>
    );
  }
  
  if (loading) {
    return (
      <main className="py-10 text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-slate-600">Loading deal details…</p>
      </main>
    );
  }
  
  if (!deal) {
    return (
      <main className="py-10 max-w-2xl mx-auto px-4">
        <ErrorState
          title="Deal not found"
          message="The deal you're looking for doesn't exist or you don't have access to it."
          onRetry={() => window.location.reload()}
          retryText="Reload page"
        />
      </main>
    );
  }

  // Branch: Financials vs CIM vs Off-market vs On-market
  if (deal.source_type === 'financials') {
    return (
      <FinancialsDealView
        deal={deal}
        dealId={id}
        onBack={() => router.push(backHref)}
        loadingAnalysis={finLoading}
        running={finRunning}
        analysis={finAnalysis}
        error={finError}
        onRun={runFinancialAnalysis}
        onRefresh={() => refreshDeal(id)}
      />
    );
  }

  if (deal.source_type === 'cim_pdf') {
    return (
      <CimDealView
        deal={deal}
        dealId={id}
        onBack={() => router.push(backHref)}
        processingCim={processingCim}
        cimError={cimError}
        cimSuccess={cimSuccess}
        onRunCim={runCimAnalysis}
        onRefresh={() => refreshDeal(id)}
      />
    );
  }

  if (deal.source_type === 'off_market') {
    return (
      <OffMarketDealView
        deal={deal}
        dealId={id}
        onBack={() => router.push(backHref)}
        running={runningOffMarketDD}
        error={offMarketError}
        onRunInitialDiligence={runOffMarketInitialDiligence}
        onRefresh={() => refreshDeal(id)}
      />
    );
  }

  return (
      <OnMarketDealView
        deal={deal}
        dealId={id}
        onBack={() => router.push(backHref)}
        analyzing={analyzing}
        aiError={aiError}
        onRunInitialDiligence={runOnMarketInitialDiligence}
        onRefresh={() => refreshDeal(id)}
      />
  );
}
