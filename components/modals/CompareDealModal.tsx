'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { ComparisonTable, type ComparisonDeal } from '@/app/deals/[id]/components/ComparisonTable';
import { X } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { IconButton } from '@/components/ui/IconButton';

interface CompareDealModalProps {
  dealId: string;
  companyName: string;
  onClose: () => void;
}

export function CompareDealModal({
  dealId,
  companyName,
  onClose,
}: CompareDealModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDeal, setCurrentDeal] = useState<ComparisonDeal | null>(null);
  const [comparisonDeals, setComparisonDeals] = useState<ComparisonDeal[]>([]);
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);

  useEffect(() => {
    const fetchComparisonData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          throw new Error('Not signed in.');
        }

        const res = await fetch(`/api/deals/${dealId}/compare`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || 'Failed to fetch comparison data');
        }

        const data = await res.json();
        setCurrentDeal(data.current_deal);
        setComparisonDeals(data.comparison_deals || []);

        // Default to selecting first 5 deals
        const defaultSelection = data.comparison_deals
          ?.slice(0, 5)
          .map((d: ComparisonDeal) => d.id) || [];
        setSelectedDealIds(defaultSelection);
      } catch (err) {
        console.error('Error fetching comparison data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [dealId]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col border border-slate-600">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600">
          <div>
            <h2 className="text-xl font-semibold text-slate-50">
              Compare: {companyName}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Compare this deal against your recent deals
            </p>
          </div>
          <IconButton
            onClick={onClose}
            icon={<X className="h-5 w-5 text-slate-400" />}
            label="Close modal"
            className="p-2 hover:bg-slate-700 text-slate-400"
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <LoadingSpinner size="lg" />
              <span className="text-slate-400">Loading comparison data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-400 mb-2">Error loading comparison data</div>
              <div className="text-sm text-slate-400">{error}</div>
            </div>
          ) : currentDeal ? (
            <ComparisonTable
              currentDeal={currentDeal}
              comparisonDeals={comparisonDeals}
              selectedDealIds={selectedDealIds}
              onSelectionChange={setSelectedDealIds}
            />
          ) : (
            <div className="text-center py-12 text-slate-500">
              No comparison data available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-600 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
