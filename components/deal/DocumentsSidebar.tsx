'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, ChevronRight, ChevronLeft, GitCompare } from 'lucide-react';
import { DealDocuments } from './DealDocuments';
import { supabase } from '@/app/supabaseClient';
import type { Deal } from '@/lib/types/deal';

interface DealDocument {
  id: string;
  filename: string;
  mime_type: string | null;
  document_type: 'cim' | 'financials' | 'loi' | 'term_sheet' | 'other' | null;
}

interface DocumentsSidebarProps {
  deal: Deal;
  dealId: string;
}

export function DocumentsSidebar({ deal, dealId }: DocumentsSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [comparisonDocs, setComparisonDocs] = useState<DealDocument[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Load comparison documents when entering comparison mode
  useEffect(() => {
    if (comparisonMode && selectedDocs.size >= 2) {
      // Fetch document details for comparison
      const loadComparisonDocs = async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (!token) return;

          // Fetch all documents and filter by selected IDs
          const response = await fetch(`/api/deals/${dealId}/documents`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            const allDocs = data.documents || [];
            const selected = allDocs.filter((doc: DealDocument) => selectedDocs.has(doc.id));
            setComparisonDocs(selected);
          }
        } catch (error) {
          console.error('Error loading comparison documents:', error);
        }
      };

      loadComparisonDocs();
    } else {
      setComparisonDocs([]);
    }
  }, [comparisonMode, selectedDocs, dealId]);

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleToggleComparison = () => {
    if (selectedDocs.size < 2) {
      alert('Please select at least 2 documents to compare');
      return;
    }
    setComparisonMode(!comparisonMode);
  };

  const handleDocSelect = (docId: string) => {
    setSelectedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      // Exit comparison mode if less than 2 docs selected
      if (newSet.size < 2 && comparisonMode) {
        setComparisonMode(false);
      }
      return newSet;
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 lg:right-[400px] top-1/2 -translate-y-1/2 z-30 bg-blue-600 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition-colors"
        title="Open Documents"
      >
        <FileText className="h-5 w-5" />
      </button>
    );
  }

  return (
    <>
      {/* Sidebar - Positioned to the right, accounting for chat panel on desktop */}
      <div
        ref={sidebarRef}
        className={`
          fixed top-0 h-screen bg-white border-l border-slate-200 shadow-xl z-50
          flex flex-col transition-all duration-300 ease-in-out
          ${isCollapsed 
            ? 'w-16 right-0 lg:right-[400px]' 
            : 'w-96 right-0 lg:right-[400px]'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleToggleCollapse}
              className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              title="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden flex flex-col">
            {comparisonMode && comparisonDocs.length >= 2 ? (
              <ComparisonView
                documents={comparisonDocs}
                onClose={() => {
                  setComparisonMode(false);
                  setSelectedDocs(new Set());
                }}
                dealId={dealId}
              />
            ) : (
              <div className="flex-1 overflow-y-auto">
                <DealDocuments
                  dealId={dealId}
                  onDocumentSelect={handleDocSelect}
                  selectedDocuments={selectedDocs}
                />
                {selectedDocs.size >= 2 && (
                  <div className="sticky bottom-0 p-4 bg-blue-50 border-t border-blue-200">
                    <button
                      onClick={handleToggleComparison}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <GitCompare className="h-4 w-4" />
                      Compare {selectedDocs.size} Documents
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
}

// Comparison View Component
function ComparisonView({
  documents,
  onClose,
  dealId,
}: {
  documents: DealDocument[];
  onClose: () => void;
  dealId: string;
}) {
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadPreviews = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) return;

        const urls: Record<string, string> = {};
        for (const doc of documents) {
          if (doc.mime_type?.includes('pdf')) {
            try {
              const res = await fetch(`/api/deals/${dealId}/documents/${doc.id}/preview`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                urls[doc.id] = data.preview_url;
              }
            } catch (error) {
              console.error(`Error loading preview for ${doc.id}:`, error);
            }
          }
        }
        setPreviewUrls(urls);
      } catch (error) {
        console.error('Error loading previews:', error);
      }
    };

    if (documents.length > 0) {
      loadPreviews();
    }
  }, [documents, dealId]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 bg-blue-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-slate-900">Comparing {documents.length} Documents</h3>
          <button
            onClick={onClose}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Exit Comparison
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {documents.map((doc, idx) => (
            <div
              key={doc.id}
              className="px-2 py-1 bg-white border border-blue-200 rounded text-xs text-slate-700"
            >
              {idx + 1}. {doc.filename}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {documents.map((doc) => (
          <div key={doc.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
            <div className="p-2 bg-slate-50 border-b border-slate-200">
              <p className="text-xs font-medium text-slate-700 truncate">{doc.filename}</p>
              <p className="text-xs text-slate-500">
                {doc.document_type ? doc.document_type.toUpperCase() : 'Document'}
              </p>
            </div>
            <div className="h-96 overflow-auto">
              {previewUrls[doc.id] ? (
                <iframe
                  src={previewUrls[doc.id]}
                  className="w-full h-full"
                  title={`Preview: ${doc.filename}`}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Preview not available</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {doc.mime_type?.includes('pdf') ? 'Loading...' : 'PDF preview only'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
