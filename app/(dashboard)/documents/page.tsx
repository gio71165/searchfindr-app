'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { FileText, Download, Eye, Search, Filter, ChevronDown, ChevronRight, Upload, Link2 } from 'lucide-react';
import Link from 'next/link';

interface DealDocument {
  id: string;
  filename: string;
  mime_type: string | null;
  document_type: 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other' | null;
  file_size: number | null;
  created_at: string;
  deal_id: string;
  deal?: {
    id: string;
    company_name: string | null;
    source_type: string | null;
  };
}

const DOCUMENT_TYPE_LABELS = {
  cim: 'CIM',
  financials: 'Financials',
  loi: 'LOI',
  term_sheet: 'Term Sheet',
  other: 'Other',
};

const DOCUMENT_TYPE_COLORS = {
  cim: 'bg-blue-100 text-blue-800',
  financials: 'bg-green-100 text-green-800',
  loi: 'bg-purple-100 text-purple-800',
  term_sheet: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, workspaceId, loading: authLoading } = useAuth();
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDeal, setFilterDeal] = useState<string>('all');
  const [expandedDeals, setExpandedDeals] = useState<Set<string>>(new Set());
  
  // Load all documents
  useEffect(() => {
    if (authLoading || !workspaceId) return;
    
    loadDocuments();
  }, [workspaceId, authLoading]);

  async function loadDocuments() {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Fetch all documents with deal information
      const { data, error: fetchError } = await supabase
        .from('deal_documents')
        .select(`
          *,
          deal:companies!deal_documents_deal_id_fkey (
            id,
            company_name,
            source_type
          )
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setDocuments(data || []);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }

  // Group documents by deal
  const documentsByDeal = useMemo(() => {
    const grouped: Record<string, DealDocument[]> = {};
    
    documents.forEach(doc => {
      const dealId = doc.deal_id;
      if (!grouped[dealId]) {
        grouped[dealId] = [];
      }
      grouped[dealId].push(doc);
    });
    
    return grouped;
  }, [documents]);

  // Get unique deals for filter
  const uniqueDeals = useMemo(() => {
    const deals = new Map<string, { id: string; name: string }>();
    documents.forEach(doc => {
      if (doc.deal && !deals.has(doc.deal_id)) {
        deals.set(doc.deal_id, {
          id: doc.deal_id,
          name: doc.deal.company_name || 'Unnamed Deal'
        });
      }
    });
    return Array.from(deals.values());
  }, [documents]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesFilename = doc.filename?.toLowerCase().includes(query);
        const matchesDealName = doc.deal?.company_name?.toLowerCase().includes(query);
        if (!matchesFilename && !matchesDealName) return false;
      }
      
      // Type filter
      if (filterType !== 'all' && doc.document_type !== filterType) return false;
      
      // Deal filter
      if (filterDeal !== 'all' && doc.deal_id !== filterDeal) return false;
      
      return true;
    });
  }, [documents, searchQuery, filterType, filterDeal]);

  // Group filtered documents by deal
  const filteredByDeal = useMemo(() => {
    const grouped: Record<string, DealDocument[]> = {};
    
    filteredDocuments.forEach(doc => {
      const dealId = doc.deal_id;
      if (!grouped[dealId]) {
        grouped[dealId] = [];
      }
      grouped[dealId].push(doc);
    });
    
    return grouped;
  }, [filteredDocuments]);

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

  const handlePreview = async (doc: DealDocument) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/deals/${doc.deal_id}/documents/${doc.id}/preview`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preview_url) {
          window.open(data.preview_url, '_blank');
        }
      } else {
        // Fallback to download
        handleDownload(doc);
      }
    } catch (err) {
      console.error('Preview error:', err);
      handleDownload(doc);
    }
  };

  const handleDownload = async (doc: DealDocument) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`/api/deals/${doc.deal_id}/documents/${doc.id}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto">
        <ErrorState message={error} onRetry={loadDocuments} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      <ContentHeader
        title="Documents"
        description="All documents across all deals in your workspace"
      />

      {/* Filters */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search documents by name or deal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="cim">CIM</option>
              <option value="financials">Financials</option>
              <option value="loi">LOI</option>
              <option value="term_sheet">Term Sheet</option>
              <option value="other">Other</option>
            </select>
          </div>

          <select
            value={filterDeal}
            onChange={(e) => setFilterDeal(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Deals</option>
            {uniqueDeals.map(deal => (
              <option key={deal.id} value={deal.id}>{deal.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
          <p className="text-gray-600 mb-6">
            {searchQuery || filterType !== 'all' || filterDeal !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload documents from deal pages to see them here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredByDeal).map(([dealId, dealDocs]) => {
            const deal = dealDocs[0]?.deal;
            const isExpanded = expandedDeals.has(dealId);
            const dealName = deal?.company_name || 'Unnamed Deal';

            return (
              <div key={dealId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Deal Header */}
                <button
                  onClick={() => toggleDealExpansion(dealId)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500" />
                    )}
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{dealName}</h3>
                      <p className="text-sm text-gray-500">
                        {dealDocs.length} {dealDocs.length === 1 ? 'document' : 'documents'}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/deals/${dealId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Deal
                    <Link2 className="h-4 w-4" />
                  </Link>
                </button>

                {/* Documents List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 divide-y divide-gray-200">
                    {dealDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  DOCUMENT_TYPE_COLORS[doc.document_type || 'other']
                                }`}
                              >
                                {DOCUMENT_TYPE_LABELS[doc.document_type || 'other']}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(doc.file_size)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handlePreview(doc)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
