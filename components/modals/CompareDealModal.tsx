'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/supabaseClient';
import { ComparisonTable, type ComparisonDeal } from '@/app/deals/[id]/components/ComparisonTable';
import { X, Loader2 } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">
              Compare: {companyName}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Compare this deal against your recent deals
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading comparison data...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-red-600 mb-2">Error loading comparison data</div>
              <div className="text-sm text-gray-600">{error}</div>
            </div>
          ) : currentDeal ? (
            <ComparisonTable
              currentDeal={currentDeal}
              comparisonDeals={comparisonDeals}
              selectedDealIds={selectedDealIds}
              onSelectionChange={setSelectedDealIds}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No comparison data available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
