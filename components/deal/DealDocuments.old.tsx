'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Download, Trash2, X, Plus, File, Link2 } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import { showToast } from '@/components/ui/Toast';

interface DealDocument {
  id: string;
  filename: string;
  mime_type: string | null;
  document_type: 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other' | null;
  version: number;
  notes: string | null;
  created_at: string;
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

export function DealDocuments({ dealId }: DealDocumentsProps) {
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'new' | 'attach'>('new');
  const [uploading, setUploading] = useState(false);
  const [attaching, setAttaching] = useState<string | null>(null);
  const [unattachedDocs, setUnattachedDocs] = useState<{
    cims: UnattachedDocument[];
    financials: UnattachedDocument[];
  }>({ cims: [], financials: [] });
  const [loadingUnattached, setLoadingUnattached] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    document_type: 'other' as 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other',
    notes: '',
  });

  useEffect(() => {
    loadDocuments();
  }, [dealId]);

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

      const response = await fetch(`/api/deals/${dealId}/documents`, {
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

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
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

      const response = await fetch(`/api/deals/${dealId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      showToast('Document uploaded successfully', 'success');
      setShowUploadModal(false);
      setFormData({ document_type: 'other', notes: '' });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      showToast(error instanceof Error ? error.message : 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-4 w-4" />;
    if (mimeType.includes('pdf')) return <FileText className="h-4 w-4" />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Documents</span>
          {documents.length > 0 && (
            <span className="text-xs text-slate-500">({documents.length})</span>
          )}
        </div>
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

      {documents.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No documents uploaded yet</p>
          <p className="text-xs mt-1">Upload CIMs, term sheets, LOIs, and other deal documents</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 text-slate-600">
                  {getFileIcon(doc.mime_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{formatDate(doc.created_at)}</span>
                    {doc.notes && (
                      <span className="truncate italic" title={doc.notes}>
                        {doc.notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(doc)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload/Attach Modal */}
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
                      {uploading ? 'Uploading...' : 'Click to select file'}
                    </span>
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
    </div>
  );
}
