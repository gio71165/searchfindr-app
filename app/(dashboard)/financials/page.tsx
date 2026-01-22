'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { DollarSign } from 'lucide-react';
import { DragDropZone } from '@/components/ui/DragDropZone';

function isAllowedFinancialFile(file: File) {
  const name = (file.name || '').toLowerCase();
  const mime = file.type || '';
  const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
  const isCsv = mime === 'text/csv' || mime === 'application/csv' || name.endsWith('.csv');
  const isXlsx =
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mime === 'application/vnd.ms-excel' ||
    name.endsWith('.xlsx') ||
    name.endsWith('.xls');
  return isPdf || isCsv || isXlsx;
}

function stripExt(filename: string) {
  return filename.replace(/\.(pdf|csv|xlsx|xls)$/i, '');
}

export default function FinancialsPage() {
  const router = useRouter();
  const { user, workspaceId, loading: authLoading } = useAuth();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const userId = user?.id ?? null;

  // Filter states
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedVerdict, setSelectedVerdict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [finFile, setFinFile] = useState<File | null>(null);
  const [finUploadStatus, setFinUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [finUploadMsg, setFinUploadMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace('/');
      return;
    }
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    let ok = true;
    loadDeals(workspaceId).finally(() => {
      if (ok) setLoading(false);
    });
    return () => { ok = false; };
  }, [authLoading, user, workspaceId, router]);

  async function loadDeals(wsId: string) {
    // Optimize: Only select needed columns (SELECT * is slow)
    const columns = 'id,company_name,location_city,location_state,industry,source_type,score,final_tier,created_at,listing_url,is_saved,passed_at,ai_summary,ai_confidence_json,stage,verdict,next_action,next_action_date,sba_eligible,deal_size_band,archived_at,user_notes,asking_price_extracted,ebitda_ttm_extracted,criteria_match_json';
    const { data, error } = await supabase
      .from('companies')
      .select(columns)
      .eq('workspace_id', wsId)
      .eq('source_type', 'financials')
      .is('passed_at', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('loadDeals error:', error);
      setErrorMsg(`Failed to load deals: ${error.message || 'Unknown error'}`);
      return;
    }

    setDeals(data || []);
  }

  // Apply filters
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      if (selectedStage !== 'all') {
        if (selectedStage === 'passed') {
          if (!deal.passed_at && deal.stage !== 'passed') return false;
        } else {
          if ((deal.stage || 'new') !== selectedStage) return false;
        }
      }
      if (selectedVerdict !== 'all' && deal.verdict !== selectedVerdict) return false;
      if (searchQuery && !deal.company_name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [deals, selectedStage, selectedVerdict, searchQuery]);

  // Calculate stage counts
  const stageCounts = useMemo(() => {
    return {
      all: deals.length,
      new: deals.filter(d => (d.stage || 'new') === 'new').length,
      reviewing: deals.filter(d => d.stage === 'reviewing').length,
      follow_up: deals.filter(d => d.stage === 'follow_up').length,
      ioi_sent: deals.filter(d => d.stage === 'ioi_sent').length,
      loi: deals.filter(d => d.stage === 'loi').length,
      dd: deals.filter(d => d.stage === 'dd').length,
      passed: deals.filter(d => d.passed_at !== null || d.stage === 'passed').length
    };
  }, [deals]);

  const handleFinancialsButtonClick = () => {
    // Scroll to the upload zone
    const uploadZone = document.querySelector('[data-upload-zone]');
    if (uploadZone) {
      uploadZone.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleFinancialsFileSelect = async (file: File) => {
    if (!file) return;

    if (!isAllowedFinancialFile(file)) {
      setErrorMsg('Please upload a PDF, CSV, or Excel file for Financials.');
      setFinFile(null);
      setFinUploadStatus('error');
      setFinUploadMsg('Invalid file type.');
      return;
    }

    if (!userId || !workspaceId) {
      setErrorMsg('User/workspace not loaded yet. Please try again.');
      setFinUploadStatus('error');
      setFinUploadMsg('Missing user/workspace.');
      return;
    }

    setErrorMsg(null);
    setFinUploadMsg(null);
    setFinFile(file);
    setFinUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const fileExt = (file.name.split('.').pop() || '').toLowerCase() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('financials')
        .upload(filePath, file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (storageError) {
        console.error('Financials upload error:', storageError);
        setErrorMsg('Failed to upload Financials. Please try again.');
        setFinUploadStatus('error');
        setFinUploadMsg(storageError.message || 'Upload failed.');
        return;
      }

      const storedPath = storageData?.path || filePath;
      const baseName = stripExt(file.name || 'Financials');
      const dealName = baseName || 'Financials';

      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert({
          company_name: dealName,
          source_type: 'financials',
          financials_storage_path: storedPath,
          financials_filename: file.name || null,
          financials_mime: file.type || null,
          user_id: userId,
          workspace_id: workspaceId,
        })
        .select('id')
        .single();

      if (insertError || !insertData?.id) {
        console.error('Error inserting Financials company row:', insertError);
        setErrorMsg('Financials uploaded, but failed to create deal record.');
        setFinUploadStatus('error');
        setFinUploadMsg('Deal creation failed.');
        return;
      }

      await loadDeals(workspaceId);
      setFinUploadStatus('uploaded');
      setFinUploadMsg('Uploaded & deal created. Open the deal to run Financial Analysis.');
      setFinFile(null);
      setTimeout(() => {
        setFinUploadStatus('idle');
        setFinUploadMsg(null);
        setUploadProgress(0);
      }, 5000);
    } catch (err: any) {
      console.error('Unexpected financials upload error:', err);
      setFinUploadStatus('error');
      setFinUploadMsg(err?.message || 'Unexpected error uploading financials.');
      setUploadProgress(0);
    }
  };

  if (authLoading || loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ContentHeader
        title="Financials"
        description="Financial statements uploaded for analysis"
      />

      {/* Search */}
      <input
        type="text"
        placeholder="Search financials..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Verdict Filters */}
      <VerdictFilters
        selectedVerdict={selectedVerdict}
        setSelectedVerdict={setSelectedVerdict}
      />

      {/* Drag and Drop Upload Zone */}
      <div className="mb-6" data-upload-zone>
        <DragDropZone
          onFileSelect={handleFinancialsFileSelect}
          accept=".pdf,.csv,.xlsx,.xls,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          maxSizeMB={50}
          uploadStatus={finUploadStatus}
          uploadProgress={uploadProgress}
          errorMessage={finUploadStatus === 'error' ? (finUploadMsg || errorMsg) : null}
          successMessage={finUploadStatus === 'uploaded' ? finUploadMsg || 'Financials uploaded successfully!' : null}
          disabled={!userId || !workspaceId}
          label="Upload Financials"
          description="Drag and drop a PDF, CSV, or Excel file here, or click to browse"
          icon={<DollarSign className="h-12 w-12 text-green-500" />}
          allowedFileTypes={['.pdf', '.csv', '.xlsx', '.xls', 'application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']}
          validateFile={(file) => {
            if (!isAllowedFinancialFile(file)) {
              return { valid: false, error: 'Please upload a PDF, CSV, or Excel file for Financials.' };
            }
            return { valid: true };
          }}
        />
      </div>

      {/* Results */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredDeals.length} of {deals.length} deals
      </div>

      {/* Deal Cards */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-semibold mb-2">No financials uploaded yet</h3>
          <p className="text-gray-600 mb-6">Upload financial statements to get QoE-level analysis</p>
          <button
            onClick={handleFinancialsButtonClick}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Upload Financials
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 mt-4">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
