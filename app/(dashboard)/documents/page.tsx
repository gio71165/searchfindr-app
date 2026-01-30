'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { BulkActionsBar } from '@/components/dashboard/BulkActionsBar';
import { DealCard } from '@/components/ui/DealCard';
import { FileText, Search, Filter, ChevronDown, ChevronRight, Plus, Folder, Upload } from 'lucide-react';
import Link from 'next/link';
import { showToast } from '@/components/ui/Toast';

interface DealDocument {
  id: string;
  filename: string;
  mime_type: string | null;
  document_type: 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other' | null;
  file_size: number | null;
  created_at: string;
  deal_id: string;
}

interface DealWithDocuments {
  id: string;
  company_name: string | null;
  source_type: string | null;
  stage: string | null;
  created_at: string;
  documents: DealDocument[];
  // Include other deal fields needed for DealCard
  location_city?: string | null;
  location_state?: string | null;
  industry?: string | null;
  final_tier?: string | null;
  verdict?: string | null;
  archived_at?: string | null;
}

const DOCUMENT_TYPE_LABELS = {
  cim: 'CIM',
  financials: 'Financials',
  loi: 'LOI',
  term_sheet: 'Term Sheet',
  other: 'Other',
};

const DOCUMENT_TYPE_ICONS = {
  cim: '📄',
  financials: '📊',
  loi: '📝',
  term_sheet: '📋',
  other: '📎',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, workspaceId, loading: authLoading } = useAuth();
  const [dealsWithDocs, setDealsWithDocs] = useState<DealWithDocuments[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<string>('all');
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());
  
  // Bulk selection
  const [selectedDealIds, setSelectedDealIds] = useState<Set<string>>(new Set());
  
  // Load all deals with their documents
  useEffect(() => {
    if (authLoading || !workspaceId) return;
    loadDealsWithDocuments();
  }, [workspaceId, authLoading]);

  async function loadDealsWithDocuments() {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Fetch all deals (excluding archived and passed)
      const { data: dealsData, error: dealsError } = await supabase
        .from('companies')
        .select('id, company_name, source_type, stage, created_at, location_city, location_state, industry, final_tier, verdict, archived_at')
        .eq('workspace_id', workspaceId)
        .is('archived_at', null)
        .is('passed_at', null)
        .order('created_at', { ascending: false });

      if (dealsError) throw dealsError;

      // Fetch all documents
      const { data: docsData, error: docsError } = await supabase
        .from('deal_documents')
        .select('id, filename, mime_type, document_type, file_size, created_at, deal_id')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      // Group documents by deal
      const docsByDeal: Record<string, DealDocument[]> = {};
      (docsData || []).forEach(doc => {
        if (!docsByDeal[doc.deal_id]) {
          docsByDeal[doc.deal_id] = [];
        }
        docsByDeal[doc.deal_id].push(doc);
      });

      // Combine deals with their documents
      const dealsWithDocuments: DealWithDocuments[] = (dealsData || []).map(deal => ({
        ...deal,
        documents: docsByDeal[deal.id] || [],
      }));

      // Only show deals that have documents OR allow showing all deals
      // For now, show all deals (they can add documents later)
      setDealsWithDocs(dealsWithDocuments);
    } catch (err: any) {
      console.error('Error loading deals with documents:', err);
      setError(err.message || 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }

  // Filter deals
  const filteredDeals = useMemo(() => {
    return dealsWithDocs.filter(deal => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = deal.company_name?.toLowerCase().includes(query);
        const matchesDoc = deal.documents.some(doc => 
          doc.filename?.toLowerCase().includes(query)
        );
        if (!matchesName && !matchesDoc) return false;
      }
      
      // Stage filter
      if (filterStage !== 'all' && (deal.stage || 'new') !== filterStage) return false;
      
      return true;
    });
  }, [dealsWithDocs, searchQuery, filterStage]);

  const toggleDealExpansion = (dealId: string) => {
    setExpandedDeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dealId)) {
        newSet.delete(dealId);
      } else {
        newSet.add(dealId);
      }
      return newSet;
    });
  };

  const handleToggleDealSelection = (dealId: string) => {
    setSelectedDealIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dealId)) {
        newSet.delete(dealId);
      } else {
        newSet.add(dealId);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedDealIds(new Set());
  };

  const handleAddNewDeal = () => {
    // Show modal to select deal type
    // For now, redirect to dashboard where they can upload
    showToast('Use the dashboard to upload CIM or Financials to create a new deal', 'info');
    router.push('/dashboard');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <ErrorState message={error} onRetry={loadDealsWithDocuments} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header with Add New Deal button */}
      <div className="mb-6 flex items-center justify-between">
        <ContentHeader
          title="Documents Library"
          description="All documents organized by deal"
        />
        <button
          onClick={handleAddNewDeal}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-all text-sm shadow-sm hover:shadow-md"
        >
          <Plus className="h-4 w-4" />
          Add New Deal
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search deals or documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Stages</option>
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="follow_up">Follow Up</option>
              <option value="ioi_sent">IOI Sent</option>
              <option value="loi">LOI</option>
              <option value="dd">Due Diligence</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedDealIds.size > 0 && (
        <BulkActionsBar
          selectedDealIds={selectedDealIds}
          onClearSelection={handleClearSelection}
          onRefresh={loadDealsWithDocuments}
        />
      )}

      {/* Deals List */}
      {filteredDeals.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <Folder className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No deals found</h3>
          <p className="text-slate-600 mb-6">
            {searchQuery || filterStage !== 'all'
              ? 'Try adjusting your filters'
              : 'Create a new deal and add documents to get started'}
          </p>
          <button
            onClick={handleAddNewDeal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-500 transition-all shadow-sm hover:shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add New Deal
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDeals.map((deal) => {
            const isExpanded = expandedDeals.has(deal.id);
            const hasDocuments = deal.documents.length > 0;

            return (
              <div
                key={deal.id}
                className={`bg-white rounded-lg border-2 transition-all ${
                  selectedDealIds.has(deal.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Deal Header */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Checkbox for bulk selection */}
                    <input
                      type="checkbox"
                      checked={selectedDealIds.has(deal.id)}
                      onChange={() => handleToggleDealSelection(deal.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleDealExpansion(deal.id)}
                      className="flex-shrink-0 mt-1 text-slate-400 hover:text-slate-600"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </button>

                    {/* Deal Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Folder className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <h3 className="font-semibold text-slate-900 truncate">
                              {deal.company_name || 'Unnamed Deal'}
                            </h3>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span>Stage: {deal.stage || 'new'}</span>
                            {hasDocuments && (
                              <span>{deal.documents.length} {deal.documents.length === 1 ? 'document' : 'documents'}</span>
                            )}
                            {!hasDocuments && (
                              <span className="text-amber-600">No documents yet</span>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2">
                          {hasDocuments && (
                            <Link
                              href={`/deals/${deal.id}#documents`}
                              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Add Document
                            </Link>
                          )}
                          <Link
                            href={`/deals/${deal.id}`}
                            className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm hover:shadow-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Deal
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Documents List (Expanded) */}
                {isExpanded && hasDocuments && (
                  <div className="border-t border-slate-200 divide-y divide-slate-200">
                    {deal.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-lg">{DOCUMENT_TYPE_ICONS[doc.document_type || 'other']}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{doc.filename}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="px-2 py-0.5 bg-slate-100 rounded">
                                {DOCUMENT_TYPE_LABELS[doc.document_type || 'other']}
                              </span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span>Uploaded {formatDate(doc.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Link
                            href={`/deals/${deal.id}/documents/${doc.id}/preview`}
                            className="px-3 py-1.5 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State for Deal with No Documents */}
                {isExpanded && !hasDocuments && (
                  <div className="border-t border-slate-200 px-4 py-6 text-center">
                    <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-4">No documents attached to this deal</p>
                    <Link
                      href={`/deals/${deal.id}#documents`}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm hover:shadow-md"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Upload className="h-4 w-4" />
                      Add Document
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}
