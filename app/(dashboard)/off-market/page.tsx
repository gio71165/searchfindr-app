'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';

const OFFMARKET_INDUSTRIES = [
  'HVAC',
  'Electrical',
  'Plumbing',
  'Roofing',
  'Landscaping',
  'Pest Control',
  'Commercial Cleaning',
  'Auto Repair',
  'Home Health',
  'Dental / Medical',
  'Logistics / Trucking',
  'Light Manufacturing',
  'Specialty Construction',
];

const US_STATES = [
  { abbr: 'AL', name: 'Alabama' },
  { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' },
  { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' },
  { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' },
  { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' },
  { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' },
  { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' },
  { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' },
  { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' },
  { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' },
  { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' },
  { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' },
  { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' },
  { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' },
  { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' },
  { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' },
  { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' },
  { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' },
  { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' },
  { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' },
  { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' },
  { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' },
  { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' },
  { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' },
  { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' },
  { abbr: 'WY', name: 'Wyoming' },
];

const ALLOWED_RADIUS = [5, 10, 15, 25, 50, 75, 100];

export default function OffMarketPage() {
  const router = useRouter();
  const { user, workspaceId, session, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);

  // Search form state
  const [industries, setIndustries] = useState<string[]>(['HVAC']);
  const [industryToAdd, setIndustryToAdd] = useState<string>('HVAC');
  const [city, setCity] = useState('');
  const [state, setState] = useState('TX');
  const [radius, setRadius] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter states
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedVerdict, setSelectedVerdict] = useState('all');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!workspaceId) {
      setErrorMsg('Missing workspace. Please contact support.');
      setLoading(false);
      return;
    }
    setErrorMsg(null);
    let ok = true;
    loadOffMarketDeals(workspaceId).finally(() => {
      if (ok) setLoading(false);
    });
    return () => { ok = false; };
  }, [authLoading, user, workspaceId, router]);

  async function loadOffMarketDeals(wsId: string) {
    // Optimized: Only fetch columns needed for DealCard display
    const columns = 'id,company_name,location_city,location_state,industry,source_type,final_tier,created_at,stage,verdict,next_action_date,sba_eligible,deal_size_band,is_saved,asking_price_extracted,ebitda_ttm_extracted,next_action';
    const { data, error } = await supabase
      .from('companies')
      .select(columns)
      .eq('workspace_id', wsId)
      .eq('source_type', 'off_market')
      .is('passed_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('loadOffMarketDeals error:', error);
      setErrorMsg(`Failed to load deals: ${error.message || 'Unknown error'}`);
      return;
    }

    setDeals((data ?? []) as any[]);
  }

  const addIndustry = () => {
    if (industryToAdd && !industries.includes(industryToAdd)) {
      setIndustries([...industries, industryToAdd]);
    }
  };

  const removeIndustry = (ind: string) => {
    setIndustries(industries.filter((i) => i !== ind));
  };

  async function handleSearch() {
    if (industries.length === 0) {
      setSearchStatus('Please add at least one industry.');
      return;
    }
    if (!city.trim()) {
      setSearchStatus('Please enter a city.');
      return;
    }
    if (!state || state.length !== 2) {
      setSearchStatus('Please select a state.');
      return;
    }
    if (!ALLOWED_RADIUS.includes(radius)) {
      setSearchStatus('Please select a valid radius.');
      return;
    }

    setSearching(true);
    setErrorMsg(null);
    setSearchStatus(null);

    try {
      const token = session?.access_token;

      if (!token) {
        setSearchStatus('Not signed in.');
        return;
      }

      const location = `${city.trim()}, ${state}`;

      const response = await fetch('/api/off-market/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          industries,
          location,
          radius_miles: radius,
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setSearchStatus(json.error || 'Search failed.');
        return;
      }

      const count = typeof json.count === 'number' ? json.count : 0;
      setSearchStatus(`${count} result(s) added to Off-market (not saved).`);

      // Reload deals
      if (workspaceId) {
        await loadOffMarketDeals(workspaceId);
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchStatus(error?.message || 'Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  }

  // Filter deals by filters and search query
  const filteredDeals = deals.filter((deal) => {
    // Stage filter
    if (selectedStage !== 'all') {
      if (selectedStage === 'passed') {
        if (!deal.passed_at && deal.stage !== 'passed') return false;
      } else {
        if ((deal.stage || 'new') !== selectedStage) return false;
      }
    }

    // Verdict filter
    if (selectedVerdict !== 'all' && deal.verdict !== selectedVerdict) return false;

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        deal.company_name?.toLowerCase().includes(query) ||
        deal.industry?.toLowerCase().includes(query) ||
        deal.location_city?.toLowerCase().includes(query) ||
        deal.location_state?.toLowerCase().includes(query) ||
        deal.ai_summary?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Calculate stage counts
  const stageCounts = {
    all: deals.length,
    new: deals.filter(d => (d.stage || 'new') === 'new').length,
    reviewing: deals.filter(d => d.stage === 'reviewing').length,
    follow_up: deals.filter(d => d.stage === 'follow_up').length,
    ioi_sent: deals.filter(d => d.stage === 'ioi_sent').length,
    loi: deals.filter(d => d.stage === 'loi').length,
    dd: deals.filter(d => d.stage === 'dd').length,
    passed: deals.filter(d => d.passed_at !== null || d.stage === 'passed').length
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-sm text-slate-600">Loading off-market deals...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
      <ContentHeader
        title="Off-Market Discovery"
        description="Find owner-operated businesses that aren't listed for sale"
      />

      {/* Search Form */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Search Parameters</h2>
        <p className="text-sm text-slate-600 mb-6">
          Add industries + enter city/state + radius. Results appear in Off-market as leads.
        </p>

        {/* Industries */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Industries</label>
          <div className="flex gap-2 mb-2">
            <select
              className="flex-1 border rounded-lg px-4 py-2"
              value={industryToAdd}
              onChange={(e) => setIndustryToAdd(e.target.value)}
            >
              {OFFMARKET_INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            <button
              onClick={addIndustry}
              disabled={industries.includes(industryToAdd)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Selected Industries */}
          {industries.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <span
                  key={ind}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                >
                  {ind}
                  <button
                    onClick={() => removeIndustry(ind)}
                    className="text-blue-600 hover:text-blue-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-red-600 mt-2">Add at least one industry to search.</p>
          )}
        </div>

        {/* Location */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Austin"
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {US_STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>
                  {s.abbr} — {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Radius (miles)</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ALLOWED_RADIUS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Status */}
        {searchStatus && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              searchStatus.includes('error') || searchStatus.includes('failed')
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {searchStatus}
          </div>
        )}

        {/* Search Button */}
        <AsyncButton
          onClick={handleSearch}
          isLoading={searching}
          loadingText="Searching..."
          disabled={industries.length === 0 || !city.trim()}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-500 transition-colors shadow-sm hover:shadow-md"
        >
          Search
        </AsyncButton>
      </div>

      {/* Off-Market Deals Section */}
      <div>
        <input
          type="text"
          placeholder="Search off-market deals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border rounded-lg px-4 py-3 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Pipeline Summary - Compact variant */}
        <PipelineSummary
          selectedStage={selectedStage}
          setSelectedStage={setSelectedStage}
          stageCounts={stageCounts}
          variant="compact"
        />

        {/* Verdict Filters */}
        <VerdictFilters
          selectedVerdict={selectedVerdict}
          setSelectedVerdict={setSelectedVerdict}
        />

        {/* Results */}
        <div className="mb-4 text-sm text-slate-600">
          Showing {filteredDeals.length} of {deals.length} deals
        </div>

        {filteredDeals.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">Find owner-operated businesses</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              Use the search above to discover local SMBs by industry and location. We'll pull business info and generate
              initial analysis.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium transition-colors shadow-sm hover:shadow-md"
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDeals.map((deal) => (
              <DealCard key={deal.id} deal={deal} />
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMsg}</div>
      )}
      </div>
    </div>
  );
}
