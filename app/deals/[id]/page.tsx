'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../supabaseClient';

export default function DealDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id as string | undefined;

  const [deal, setDeal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const autoTriggeredRef = useRef(false);

  // Load the deal from Supabase
  useEffect(() => {
    if (!id) return;

    const loadDeal = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading deal:', error);
      } else {
        setDeal(data);
      }
      setLoading(false);
    };

    loadDeal();
  }, [id]);

  // Call AI route and then save all AI fields back to Supabase
  const runAnalysis = async () => {
    if (!id || !deal) return;

    if (!deal.raw_listing_text) {
      setAiError('This deal has no listing text stored yet.');
      return;
    }

    setAnalyzing(true);
    setAiError(null);

    try {
      const res = await fetch('/api/analyze-deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingText: deal.raw_listing_text,
          companyName: deal.company_name,
          city: deal.location_city,
          state: deal.location_state,
          sourceType: deal.source_type,
          listingUrl: deal.listing_url,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Failed to analyze deal.');
      }

      const {
        ai_summary,
        ai_red_flags,
        financials,
        scoring,
        criteria_match,
      } = json;

      const { error: updateError } = await supabase
        .from('companies')
        .update({
          ai_summary,
          ai_red_flags,
          ai_financials_json: financials,
          ai_scoring_json: scoring,
          criteria_match_json: criteria_match,
        })
        .eq('id', id);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        throw new Error('Failed to save AI result: ' + updateError.message);
      }

      setDeal((prev: any) =>
        prev
          ? {
              ...prev,
              ai_summary,
              ai_red_flags,
              ai_financials_json: financials,
              ai_scoring_json: scoring,
              criteria_match_json: criteria_match,
            }
          : prev
      );
    } catch (err: any) {
      console.error('runAnalysis error', err);
      setAiError(err.message || 'Something went wrong running AI.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Auto-run AI one time when we first load a deal with no summary
  useEffect(() => {
    if (deal && !deal.ai_summary && !autoTriggeredRef.current) {
      autoTriggeredRef.current = true;
      runAnalysis();
    }
  }, [deal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!id) {
    return (
      <main className="py-10 text-center">
        Loading deal…
      </main>
    );
  }

  if (loading) {
    return (
      <main className="py-10 text-center">
        Loading deal details…
      </main>
    );
  }

  if (!deal) {
    return (
      <main className="py-10 text-center text-red-600">
        Deal not found.
      </main>
    );
  }

  const scoring = deal.ai_scoring_json || {};
  const fin = deal.ai_financials_json || {};
  const criteria = deal.criteria_match_json || {};

  // --- Normalize red flags into a clean string array for display ---
  const normalizeRedFlags = (raw: any): string[] => {
    if (!raw) return [];

    // If already an array (preferred case)
    if (Array.isArray(raw)) {
      return raw
        .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
        .filter((item) => item.length > 0);
    }

    if (typeof raw === 'string') {
      const trimmed = raw.trim();

      // Try to parse JSON if it looks like an array string
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            return parsed
              .map((item) =>
                typeof item === 'string' ? item.trim() : String(item)
              )
              .filter((item) => item.length > 0);
          }
        } catch {
          // fall through to manual split
        }

        // Manual split for strings like [' x', ' y']
        const withoutBrackets = trimmed.replace(/^\[|\]$/g, '');
        return withoutBrackets
          .split(',')
          .map((item) =>
            item
              .replace(/^['"]|['"]$/g, '')
              .trim()
          )
          .filter((item) => item.length > 0);
      }

      // Fallback: just treat the whole string as a single red flag
      return [trimmed];
    }

    // Last resort: coerce to string
    return [String(raw)];
  };

  const redFlags: string[] = normalizeRedFlags(deal.ai_red_flags);

  return (
    <main className="min-h-screen">
      <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
        {/* Back to dashboard */}
        <button
          onClick={() => router.push('/dashboard')}
          className="text-xs underline"
        >
          ← Back to dashboard
        </button>

        {/* Header */}
        <section>
          <h1 className="text-3xl font-semibold mb-1">
            {deal.company_name || 'Untitled Company'}
          </h1>
          <p className="text-sm">
            {deal.location_city && `${deal.location_city}, `}
            {deal.location_state} • Source: {deal.source_type}
            {deal.listing_url && (
              <>
                {' • '}
                <a
                  href={deal.listing_url}
                  className="underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View listing
                </a>
              </>
            )}
          </p>
        </section>

        {/* AI Summary */}
        <section className="card-section">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">AI Summary</h2>

            <button
              onClick={runAnalysis}
              disabled={analyzing}
              className="text-xs px-2 py-1 border rounded"
            >
              {analyzing
                ? 'Analyzing…'
                : deal.ai_summary
                ? 'Re-run AI'
                : 'Run AI'}
            </button>
          </div>

          {aiError && (
            <p className="text-xs text-red-500 mb-1">{aiError}</p>
          )}

          <p className="whitespace-pre-line text-sm">
            {deal.ai_summary ||
              'No AI summary available yet. Click "Run AI" to generate one.'}
          </p>
        </section>

        {/* Financials */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Financials</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <p className="text-xs uppercase">Revenue</p>
              <p className="font-medium">
                {deal.revenue || fin.revenue || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase">EBITDA</p>
              <p className="font-medium">
                {deal.ebitda || fin.ebitda || '—'}
              </p>
            </div>

            {fin.margin && (
              <div>
                <p className="text-xs uppercase">Margin</p>
                <p className="font-medium">{fin.margin}</p>
              </div>
            )}

            {fin.customer_concentration && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase">Customer Concentration</p>
                <p className="font-medium">
                  {fin.customer_concentration}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Scoring Breakdown */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">Scoring Breakdown</h2>

          {Object.keys(scoring).length === 0 ? (
            <p className="text-sm">No scoring stored yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              {scoring.succession_risk && (
                <div>
                  <p className="font-semibold">Succession Risk</p>
                  <p>{scoring.succession_risk}</p>
                  <p className="text-xs">
                    {scoring.succession_risk_reason}
                  </p>
                </div>
              )}

              {scoring.industry_fit && (
                <div>
                  <p className="font-semibold">Industry Fit</p>
                  <p>{scoring.industry_fit}</p>
                  <p className="text-xs">
                    {scoring.industry_fit_reason}
                  </p>
                </div>
              )}

              {scoring.geography_fit && (
                <div>
                  <p className="font-semibold">Geography Fit</p>
                  <p>{scoring.geography_fit}</p>
                  <p className="text-xs">
                    {scoring.geography_fit_reason}
                  </p>
                </div>
              )}

              {scoring.final_tier && (
                <div className="md:col-span-2">
                  <p className="font-semibold">Final Tier</p>
                  <p>{scoring.final_tier}</p>
                  <p className="text-xs">
                    {scoring.final_tier_reason}
                  </p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Red Flags */}
        <section className="card-red">
          <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
          {redFlags.length === 0 ? (
            <p className="text-sm">No red flags detected.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm">
              {redFlags.map((flag, idx) => (
                <li key={idx}>{flag}</li>
              ))}
            </ul>
          )}
        </section>

        {/* Fit with Search Criteria */}
        <section className="card-section">
          <h2 className="text-lg font-semibold mb-3">
            Fit with Search Criteria
          </h2>

          {!criteria || Object.keys(criteria).length === 0 ? (
            <p className="text-sm">No criteria match analysis stored yet.</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold">Deal Size Fit</p>
                <p>{criteria.deal_size || '—'}</p>
              </div>

              <div>
                <p className="font-semibold">Business Model</p>
                <p>{criteria.business_model || '—'}</p>
              </div>

              <div>
                <p className="font-semibold">Owner Profile</p>
                <p>{criteria.owner_profile || '—'}</p>
              </div>

              <div>
                <p className="font-semibold">Notes for Searcher</p>
                <p>{criteria.notes_for_searcher || '—'}</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
