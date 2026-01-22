'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText, Upload, Download, Trash2, X, Plus, File, Link2, Eye, Search, Filter,
  Folder, Tag, History, User, Clock, CheckSquare, Square, FolderOpen, ChevronDown,
  ChevronRight, MoreVertical, Copy, ExternalLink
} from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';
import { useKeyboardShortcuts, createShortcut } from '@/lib/hooks/useKeyboardShortcuts';

interface DealDocument {
  id: string;
  filename: string;
  mime_type: string | null;
  document_type: 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other' | null;
  version: number;
  notes: string | null;
  folder: string | null;
  tags: string[] | null;
  file_size: number | null;
  parent_document_id: string | null;
  accessed_at: string | null;
  accessed_by: string | null;
  access_count: number;
  created_at: string;
  user_id: string | null;
}

interface UnattachedDocument {
  id: string;
  name: string;
  storage_path: string;
  filename?: string | null;
  type: 'cim' | 'financials';
  created_at: string;
}

interface DealDocumentsProps {
  dealId: string;
}

const DOCUMENT_TYPE_LABELS = {
  cim: 'CIM',
  financials: 'Financials',
  loi: 'LOI',
  term_sheet: 'Term Sheet',
  other: 'Other',
};

const FOLDER_OPTIONS = [
  'Due Diligence',
  'Legal',
  'Financials',
  'Marketing',
  'Operations',
  'Other',
];

const COMMON_TAGS = [
  'Final',
  'Draft',
  'Confidential',
  'Signed',
  'Reviewed',
  'Important',
];

export function DealDocuments({ dealId }: DealDocumentsProps) {
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DealDocument | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'new' | 'attach'>('new');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [unattachedDocs, setUnattachedDocs] = useState<{
    cims: UnattachedDocument[];
    financials: UnattachedDocument[];
  }>({ cims: [], financials: [] });
  const [loadingUnattached, setLoadingUnattached] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showVersions, setShowVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<DealDocument[]>([]);
  const [showAttachToDealModal, setShowAttachToDealModal] = useState(false);
  const [attachToDealDoc, setAttachToDealDoc] = useState<DealDocument | null>(null);
  const [availableDeals, setAvailableDeals] = useState<Array<{ id: string; company_name: string | null }>>([]);
  const [attachingToDeal, setAttachingToDeal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    document_type: 'other' as 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other',
    notes: '',
    folder: '',
    tags: [] as string[],
  });

  useEffect(() => {
    loadDocuments();
  }, [dealId]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    [
      createShortcut('u', () => {
        setShowUploadModal(true);
        setUploadMode('new');
        loadUnattachedDocuments();
      }, 'Upload document', ['deal-detail']),
      createShortcut('a', () => {
        setShowUploadModal(true);
        setUploadMode('attach');
        loadUnattachedDocuments();
      }, 'Attach existing document', ['deal-detail']),
      createShortcut('/', () => {
        // Focus search
        const searchInput = document.querySelector('[data-document-search]') as HTMLInputElement;
        searchInput?.focus();
      }, 'Focus search', ['deal-detail']),
    ],
    true
  );

  const loadUnattachedDocuments = async () => {
    setLoadingUnattached(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const response = await fetch('/api/documents/unattached', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUnattachedDocs({
          cims: data.cims || [],
          financials: data.financials || [],
        });
      }
    } catch (error) {
      console.error('Error loading unattached documents:', error);
    } finally {
      setLoadingUnattached(false);
    }
  };

  const loadDocuments = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      let url = `/api/deals/${dealId}/documents`;
      const params = new URLSearchParams();
      if (searchQuery || filterType !== 'all' || filterFolder !== 'all') {
        if (searchQuery) params.append('q', searchQuery);
        if (filterType !== 'all') params.append('type', filterType);
        if (filterFolder !== 'all') params.append('folder', filterFolder);
        url = `/api/deals/${dealId}/documents/search?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [dealId, searchQuery, filterType, filterFolder]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Please log in', 'error');
        return;
      }

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('document_type', formData.document_type);
      uploadFormData.append('notes', formData.notes);
      if (formData.folder) uploadFormData.append('folder', formData.folder);
      if (formData.tags.length > 0) uploadFormData.append('tags', formData.tags.join(','));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch(`/api/deals/${dealId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      showToast('Document uploaded successfully', 'success');
      setShowUploadModal(false);
      setFormData({ document_type: 'other', notes: '', folder: '', tags: [] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast(error instanceof Error ? error.message : 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePreview = async (doc: DealDocument) => {
    if (!doc.mime_type?.includes('pdf')) {
      showToast('Preview only available for PDF files', 'info');
      return;
    }

    setPreviewDoc(doc);
    setShowPreviewModal(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/deals/${dealId}/documents/${doc.id}/preview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewUrl(data.preview_url);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      showToast('Failed to load preview', 'error');
    }
  };

  const handleDownload = async (doc: DealDocument) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Please log in', 'error');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/documents/${doc.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }

      const data = await response.json();
      window.open(data.download_url, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      showToast('Failed to download document', 'error');
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocs.size === 0) {
      showToast('Please select documents to download', 'info');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/deals/${dealId}/documents/bulk`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'download',
          documentIds: Array.from(selectedDocs),
        }),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          // JSZip not available - individual URLs returned
          const data = await response.json();
          if (data.urls) {
            data.urls.forEach((item: { url: string; filename: string }) => {
              window.open(item.url, '_blank');
            });
            showToast(`Downloading ${data.urls.length} documents`, 'success');
          }
        } else {
          // ZIP file
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `deal_documents_${Date.now()}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          showToast(`Downloaded ${selectedDocs.size} documents as ZIP`, 'success');
        }
        setSelectedDocs(new Set());
      }
    } catch (error) {
      console.error('Error bulk downloading:', error);
      showToast('Failed to download documents', 'error');
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Please log in', 'error');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/documents/${docId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      showToast('Document deleted', 'success');
      loadDocuments();
      setSelectedDocs(prev => {
        const newSet = new Set(prev);
        newSet.delete(docId);
        return newSet;
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      showToast('Failed to delete document', 'error');
    }
  };

  const handleAttachDocument = async (doc: UnattachedDocument) => {
    setAttaching(doc.id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Please log in', 'error');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/documents/attach`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storage_path: doc.storage_path,
          document_type: doc.type,
          bucket: doc.type === 'cim' ? 'cims' : 'financials',
          source_deal_id: doc.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to attach document');
      }

      showToast(`${doc.type === 'cim' ? 'CIM' : 'Financials'} attached successfully`, 'success');
      loadDocuments();
      loadUnattachedDocuments();
      setShowUploadModal(false);
    } catch (error) {
      console.error('Error attaching document:', error);
      showToast(error instanceof Error ? error.message : 'Failed to attach document', 'error');
    } finally {
      setAttaching(null);
    }
  };

  const handleLoadVersions = async (docId: string) => {
    if (showVersions === docId) {
      setShowVersions(null);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const response = await fetch(`/api/deals/${dealId}/documents/${docId}/versions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
        setShowVersions(docId);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const handleAttachToDeal = async (doc: DealDocument) => {
    setAttachToDealDoc(doc);
    setShowAttachToDealModal(true);

    // Load available deals
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      // Use user from session instead of calling getUser() again for better performance
      const user = sessionData?.session?.user;
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

      if (!profile?.workspace_id) return;

      const { data: deals } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('workspace_id', profile.workspace_id)
        .neq('id', dealId)
        .is('passed_at', null)
        .order('company_name', { ascending: true });

      setAvailableDeals(deals || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const handleConfirmAttachToDeal = async (targetDealId: string) => {
    if (!attachToDealDoc) return;

    setAttachingToDeal(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        showToast('Please log in', 'error');
        return;
      }

      const response = await fetch(`/api/deals/${dealId}/documents/${attachToDealDoc.id}/attach-to-deal`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetDealId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to attach document');
      }

      showToast('Document attached to deal successfully', 'success');
      setShowAttachToDealModal(false);
      setAttachToDealDoc(null);
    } catch (error) {
      console.error('Error attaching to deal:', error);
      showToast(error instanceof Error ? error.message : 'Failed to attach document', 'error');
    } finally {
      setAttachingToDeal(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null, documentType: string | null) => {
    if (documentType === 'cim') return <FileText className="h-4 w-4 text-blue-600" />;
    if (documentType === 'financials') return <FileText className="h-4 w-4 text-green-600" />;
    if (documentType === 'loi') return <FileText className="h-4 w-4 text-purple-600" />;
    if (documentType === 'term_sheet') return <FileText className="h-4 w-4 text-orange-600" />;
    if (mimeType?.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
    return <File className="h-4 w-4 text-slate-600" />;
  };

  // Group documents by folder
  const groupedDocuments = useMemo(() => {
    const grouped: Record<string, DealDocument[]> = {};
    const noFolder: DealDocument[] = [];

    documents.forEach(doc => {
      if (doc.folder) {
        if (!grouped[doc.folder]) grouped[doc.folder] = [];
        grouped[doc.folder].push(doc);
      } else {
        noFolder.push(doc);
      }
    });

    return { grouped, noFolder };
  }, [documents]);

  // Get unique folders and document types for filters
  const availableFolders = useMemo(() => {
    const folders = new Set<string>();
    documents.forEach(doc => {
      if (doc.folder) folders.add(doc.folder);
    });
    return Array.from(folders).sort();
  }, [documents]);

  const toggleSelect = (docId: string) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)));
    }
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 sm:p-6 mb-6 bg-white">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          <div className="h-20 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 sm:p-6 mb-6 bg-white">
      {/* Header with Search and Filters */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Documents</span>
            {documents.length > 0 && (
              <span className="text-xs text-slate-500">({documents.length})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedDocs.size > 0 && (
              <>
                <button
                  onClick={handleBulkDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Download ({selectedDocs.size})
                </button>
                <button
                  onClick={() => setSelectedDocs(new Set())}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadMode('new');
                loadUnattachedDocuments();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add Document
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              data-document-search
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="cim">CIM</option>
            <option value="financials">Financials</option>
            <option value="loi">LOI</option>
            <option value="term_sheet">Term Sheet</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filterFolder}
            onChange={(e) => setFilterFolder(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Folders</option>
            {availableFolders.map(folder => (
              <option key={folder} value={folder}>{folder}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No documents found</p>
          <p className="text-xs mt-1">
            {searchQuery || filterType !== 'all' || filterFolder !== 'all'
              ? 'Try adjusting your filters'
              : 'Upload CIMs, term sheets, LOIs, and other deal documents'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select All */}
          {documents.length > 0 && (
            <div className="flex items-center gap-2 p-2 border-b border-slate-200">
              <button
                onClick={toggleSelectAll}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                {selectedDocs.size === documents.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>
              <span className="text-xs text-slate-600">
                {selectedDocs.size > 0 ? `${selectedDocs.size} selected` : 'Select all'}
              </span>
            </div>
          )}

          {/* Grouped by Folder */}
          {Object.entries(groupedDocuments.grouped).map(([folder, folderDocs]) => (
            <div key={folder} className="space-y-1">
              <button
                onClick={() => {
                  setExpandedFolders(prev => {
                    const newSet = new Set(prev);
                    if (newSet.has(folder)) {
                      newSet.delete(folder);
                    } else {
                      newSet.add(folder);
                    }
                    return newSet;
                  });
                }}
                className="flex items-center gap-2 w-full p-2 hover:bg-slate-50 rounded-lg transition-colors"
              >
                {expandedFolders.has(folder) ? (
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-slate-500" />
                )}
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">{folder}</span>
                <span className="text-xs text-slate-500">({folderDocs.length})</span>
              </button>
              {expandedFolders.has(folder) && (
                <div className="ml-6 space-y-1">
                  {folderDocs.map((doc) => (
                    <DocumentRow
                      key={doc.id}
                      doc={doc}
                      isSelected={selectedDocs.has(doc.id)}
                      onSelect={() => toggleSelect(doc.id)}
                      onPreview={() => handlePreview(doc)}
                      onDownload={() => handleDownload(doc)}
                      onDelete={() => handleDelete(doc.id)}
                      onViewVersions={() => handleLoadVersions(doc.id)}
                      onAttachToDeal={() => handleAttachToDeal(doc)}
                      showVersions={showVersions === doc.id}
                      versions={showVersions === doc.id ? versions : []}
                      formatDate={formatDate}
                      formatFileSize={formatFileSize}
                      getFileIcon={getFileIcon}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Documents without folder */}
          {groupedDocuments.noFolder.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              isSelected={selectedDocs.has(doc.id)}
              onSelect={() => toggleSelect(doc.id)}
              onPreview={() => handlePreview(doc)}
              onDownload={() => handleDownload(doc)}
              onDelete={() => handleDelete(doc.id)}
              onViewVersions={() => handleLoadVersions(doc.id)}
              onAttachToDeal={() => handleAttachToDeal(doc)}
              showVersions={showVersions === doc.id}
              versions={showVersions === doc.id ? versions : []}
              formatDate={formatDate}
              formatFileSize={formatFileSize}
              getFileIcon={getFileIcon}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewDoc && previewUrl && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowPreviewModal(false)} />
          <div className="fixed inset-4 z-50 bg-white rounded-lg shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">{previewDoc.filename}</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={previewUrl}
                className="w-full h-full"
                title="Document Preview"
              />
            </div>
          </div>
        </>
      )}

      {/* Upload/Attach Modal - Keep existing modal code but enhance with folder/tags */}
      {showUploadModal && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowUploadModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-6 z-50 min-w-[500px] max-w-[600px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Add Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-4 border-b border-slate-200">
              <button
                onClick={() => setUploadMode('new')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  uploadMode === 'new'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upload New
              </button>
              <button
                onClick={() => {
                  setUploadMode('attach');
                  loadUnattachedDocuments();
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  uploadMode === 'attach'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Attach Existing
              </button>
            </div>

            {uploadMode === 'new' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value as any })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cim">CIM</option>
                    <option value="financials">Financials</option>
                    <option value="loi">LOI</option>
                    <option value="term_sheet">Term Sheet</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Folder (Optional)
                  </label>
                  <select
                    value={formData.folder}
                    onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Folder</option>
                    {FOLDER_OPTIONS.map(folder => (
                      <option key={folder} value={folder}>{folder}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tags (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_TAGS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            tags: prev.tags.includes(tag)
                              ? prev.tags.filter(t => t !== tag)
                              : [...prev.tags, tag],
                          }));
                        }}
                        className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                          formData.tags.includes(tag)
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {formData.tags.map(tag => (
                        <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                tags: prev.tags.filter(t => t !== tag),
                              }));
                            }}
                            className="ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    File <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.csv"
                  />
                  <button
                    onClick={handleFileSelect}
                    disabled={uploading}
                    className="w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <Upload className="h-5 w-5 mx-auto mb-2 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {uploading ? `Uploading... ${uploadProgress}%` : 'Click to select file'}
                    </span>
                    {uploading && (
                      <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Optional notes about this document..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {loadingUnattached ? (
                  <div className="text-center py-8 text-slate-500">
                    <div className="animate-pulse">Loading available documents...</div>
                  </div>
                ) : (
                  <>
                    {unattachedDocs.cims.length === 0 && unattachedDocs.financials.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No unattached documents available</p>
                        <p className="text-xs mt-1">Upload CIMs or financials from the dashboard to attach them here</p>
                      </div>
                    ) : (
                      <>
                        {unattachedDocs.cims.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Available CIMs</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {unattachedDocs.cims.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">
                                      {doc.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {formatDate(doc.created_at)}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleAttachDocument(doc)}
                                    disabled={attaching === doc.id}
                                    className="ml-3 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                  >
                                    {attaching === doc.id ? 'Attaching...' : 'Attach'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {unattachedDocs.financials.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-2">Available Financials</h4>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                              {unattachedDocs.financials.map((doc) => (
                                <div
                                  key={doc.id}
                                  className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-900 truncate">
                                      {doc.name}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {formatDate(doc.created_at)}
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleAttachDocument(doc)}
                                    disabled={attaching === doc.id}
                                    className="ml-3 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                  >
                                    {attaching === doc.id ? 'Attaching...' : 'Attach'}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading || attaching !== null}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Attach to Deal Modal */}
      {showAttachToDealModal && attachToDealDoc && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowAttachToDealModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-slate-200 rounded-lg shadow-lg p-6 z-50 min-w-[400px] max-w-[500px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Attach to Another Deal</h3>
              <button
                onClick={() => setShowAttachToDealModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-slate-600 mb-2">
                Attach <span className="font-medium">{attachToDealDoc.filename}</span> to:
              </p>
              <select
                id="targetDealSelect"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={attachingToDeal}
              >
                <option value="">Select a deal...</option>
                {availableDeals.map(deal => (
                  <option key={deal.id} value={deal.id}>
                    {deal.company_name || 'Untitled Deal'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAttachToDealModal(false)}
                disabled={attachingToDeal}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const select = document.getElementById('targetDealSelect') as HTMLSelectElement;
                  const targetDealId = select?.value;
                  if (targetDealId) {
                    handleConfirmAttachToDeal(targetDealId);
                  } else {
                    showToast('Please select a deal', 'info');
                  }
                }}
                disabled={attachingToDeal}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {attachingToDeal ? 'Attaching...' : 'Attach'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Document Row Component
function DocumentRow({
  doc,
  isSelected,
  onSelect,
  onPreview,
  onDownload,
  onDelete,
  onViewVersions,
  onAttachToDeal,
  showVersions,
  versions,
  formatDate,
  formatFileSize,
  getFileIcon,
}: {
  doc: DealDocument;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onViewVersions: () => void;
  onAttachToDeal: () => void;
  showVersions: boolean;
  versions: DealDocument[];
  formatDate: (date: string) => string;
  formatFileSize: (bytes: number | null | undefined) => string;
  getFileIcon: (mimeType: string | null, documentType: string | null) => React.ReactNode;
}) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };

    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMoreMenu]);
  return (
    <>
      <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onSelect} className="flex-shrink-0">
            {isSelected ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
          </button>
          <div className="flex-shrink-0 text-slate-600">
            {getFileIcon(doc.mime_type, doc.document_type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium text-slate-900 truncate">
                {doc.filename}
              </span>
              {doc.document_type && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">
                  {DOCUMENT_TYPE_LABELS[doc.document_type]}
                </span>
              )}
              {doc.version > 1 && (
                <span className="text-xs text-slate-500">v{doc.version}</span>
              )}
              {doc.tags && doc.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {doc.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span>{formatDate(doc.created_at)}</span>
              {doc.file_size && <span>{formatFileSize(doc.file_size)}</span>}
              {doc.access_count > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {doc.access_count}
                </span>
              )}
              {doc.notes && (
                <span className="truncate italic" title={doc.notes}>
                  {doc.notes}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {doc.mime_type?.includes('pdf') && (
            <button
              onClick={onPreview}
              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onDownload}
            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </button>
          {doc.parent_document_id && (
            <button
              onClick={onViewVersions}
              className="p-1.5 text-slate-400 hover:text-purple-600 transition-colors"
              title="View Versions"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[180px]">
                <button
                  onClick={() => {
                    onAttachToDeal();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  Attach to another deal
                </button>
                <button
                  onClick={() => {
                    onDelete();
                    setShowMoreMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {showVersions && versions.length > 0 && (
        <div className="ml-6 mt-2 space-y-1 border-l-2 border-slate-200 pl-4">
          <div className="text-xs font-semibold text-slate-600 mb-2">Version History:</div>
          {versions.map((version) => (
            <div key={version.id} className="text-xs text-slate-600 py-1">
              v{version.version} - {formatDate(version.created_at)}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
