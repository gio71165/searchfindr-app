// app/deals/[id]/page.tsx
'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useDealData } from './hooks/useDealData';
import { FinancialsDealView } from './views/FinancialsDealView';
import { CimDealView } from './views/CimDealView';
import { OffMarketDealView } from './views/OffMarketDealView';
import { OnMarketDealView } from './views/OnMarketDealView';

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
  } = useDealData(id);

  // Page states
  if (!id) return <main className="py-10 text-center">Loading deal…</main>;
  if (loading) return <main className="py-10 text-center">Loading deal details…</main>;
  if (!deal) return <main className="py-10 text-center text-red-600">Deal not found.</main>;

  // Branch: Financials vs CIM vs Off-market vs On-market
  if (deal.source_type === 'financials') {
    return (
      <FinancialsDealView
        deal={deal}
        onBack={() => router.push(backHref)}
        loadingAnalysis={finLoading}
        running={finRunning}
        analysis={finAnalysis}
        error={finError}
        onRun={runFinancialAnalysis}
        canToggleSave={canToggleSave}
        savingToggle={savingToggle}
        onToggleSave={toggleSaved}
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
        canToggleSave={canToggleSave}
        savingToggle={savingToggle}
        onToggleSave={toggleSaved}
      />
    );
  }

  if (deal.source_type === 'off_market') {
    return (
      <OffMarketDealView
        deal={deal}
        onBack={() => router.push(backHref)}
        running={runningOffMarketDD}
        error={offMarketError}
        onRunInitialDiligence={runOffMarketInitialDiligence}
        canToggleSave={canToggleSave}
        savingToggle={savingToggle}
        onToggleSave={toggleSaved}
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
      canToggleSave={canToggleSave}
      savingToggle={savingToggle}
      onToggleSave={toggleSaved}
    />
  );
}
