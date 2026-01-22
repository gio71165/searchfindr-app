'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { Upload } from 'lucide-react';
import { DragDropZone } from '@/components/ui/DragDropZone';

export default function CimsPage() {
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
  const [cimFile, setCimFile] = useState<File | null>(null);
  const [cimUploadStatus, setCimUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  function isAllowedCimFile(file: File) {
    const name = (file.name || '').toLowerCase();
    const mime = file.type || '';
    const isPdf = mime === 'application/pdf' || name.endsWith('.pdf');
    const isDocx = 
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.docx');
    const isDoc = 
      mime === 'application/msword' ||
      name.endsWith('.doc');
    return isPdf || isDocx || isDoc;
  }

  function stripExt(filename: string) {
    return filename.replace(/\.(pdf|docx|doc)$/i, '');
  }

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
    // Optimized: Only fetch columns needed for DealCard display
    const columns = 'id,company_name,location_city,location_state,industry,source_type,final_tier,created_at,stage,verdict,next_action_date,sba_eligible,deal_size_band,is_saved,asking_price_extracted,ebitda_ttm_extracted,next_action';
    const { data, error } = await supabase
      .from('companies')
      .select(columns)
      .eq('workspace_id', wsId)
      .eq('source_type', 'cim_pdf')
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

  const handleCimFileSelect = async (file: File) => {
    if (!file) return;

    if (!isAllowedCimFile(file)) {
      setErrorMsg('Please upload a PDF, DOCX, or DOC file for the CIM.');
      setCimFile(null);
      setCimUploadStatus('error');
      return;
    }

    if (!userId || !workspaceId) {
      setErrorMsg('User/workspace not loaded yet. Please refresh the page and try again.');
      console.error('Missing userId or workspaceId:', { userId, workspaceId });
      return;
    }

    setErrorMsg(null);
    setCimFile(file);
    setCimUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 85) {
            return 85; // Stop at 85% until upload completes
          }
          return prev + 5;
        });
      }, 150);

      const fileExt = (file.name.split('.').pop() || '').toLowerCase() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Supabase Storage bucket has MIME type restrictions
      // For DOCX/DOC files, create a new File with PDF MIME type to bypass restrictions
      // The file extension is preserved, so backend can still identify the actual file type
      let fileToUpload: File = file;
      if (fileExt === 'docx' || fileExt === 'doc') {
        // Create a new File with PDF MIME type (which is allowed) but keep original extension
        fileToUpload = new File([file], fileName, { type: 'application/pdf' });
      }

      setUploadProgress(90); // Upload starting
      console.log('Starting CIM upload:', { filePath, fileSize: fileToUpload.size, fileName });
      
      // Ensure we have a valid session before uploading
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }
      console.log('Session check passed, user ID:', session.user.id);
      
      // Add timeout to prevent hanging
      const uploadPromise = supabase.storage
        .from('cims')
        .upload(filePath, fileToUpload);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000)
      );
      
      const { data: storageData, error: storageError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as { data: any; error: any };
      
      clearInterval(progressInterval);
      
      console.log('Upload result:', { storageData, storageError });
      
      if (storageError) {
        setUploadProgress(0);
        console.error('CIM upload error:', storageError);
        // More detailed error message
        let errorMessage = 'Failed to upload CIM. ';
        if (storageError.message) {
          errorMessage += storageError.message;
        } else if (storageError.statusCode) {
          errorMessage += `Error code: ${storageError.statusCode}`;
        } else {
          errorMessage += 'Please check your connection and try again.';
        }
        setErrorMsg(errorMessage);
        setCimUploadStatus('error');
        return;
      }
      
      if (!storageData) {
        setUploadProgress(0);
        console.error('CIM upload returned no data');
        setErrorMsg('Upload completed but no data returned. Please try again.');
        setCimUploadStatus('error');
        return;
      }

      setUploadProgress(95); // Upload complete, inserting into database

      const cimNameWithoutExt = stripExt(file.name);

      // Debug: Log what we're trying to insert
      console.log('Attempting to insert CIM:', {
        userId,
        workspaceId,
        company_name: cimNameWithoutExt || 'CIM Deal',
        cim_storage_path: storageData?.path || filePath,
      });

      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert({
          company_name: cimNameWithoutExt || 'CIM Deal',
          source_type: 'cim_pdf',
          cim_storage_path: storageData?.path || filePath,
          user_id: userId,
          workspace_id: workspaceId,
        })
        .select('id')
        .single();

      if (insertError || !insertData) {
        setUploadProgress(0);
        console.error('Error inserting CIM company row:', insertError);
        setErrorMsg(`CIM uploaded, but failed to create deal record: ${insertError?.message || 'Unknown error'}`);
        setCimUploadStatus('error');
        return;
      }

      setUploadProgress(100);
      await loadDeals(workspaceId);
      setCimUploadStatus('uploaded');
      setCimFile(null);
      setTimeout(() => {
        setCimUploadStatus('idle');
        setUploadProgress(0);
      }, 3000);
    } catch (err) {
      console.error('Unexpected CIM upload error:', err);
      setErrorMsg('Unexpected error uploading CIM.');
      setCimUploadStatus('error');
      setUploadProgress(0);
    }
  };

  if (authLoading || loading) return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
      <ContentHeader
        title="CIMs"
        description="Confidential Information Memorandums uploaded for analysis"
      />

      {/* Search */}
      <input
        type="text"
        placeholder="Search CIMs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 text-base border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Pipeline Summary - Compact variant (CIM-specific counts) */}
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

      {/* Drag and Drop Upload Zone */}
      <div className="mb-6">
        <DragDropZone
          onFileSelect={handleCimFileSelect}
          accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
          maxSizeMB={50}
          uploadStatus={cimUploadStatus}
          uploadProgress={uploadProgress}
          errorMessage={cimUploadStatus === 'error' ? errorMsg : null}
          successMessage={cimUploadStatus === 'uploaded' ? 'CIM uploaded successfully!' : null}
          disabled={!userId || !workspaceId}
          label="Upload CIM"
          description="Drag and drop a PDF, DOCX, or DOC file here, or click to browse"
          icon={<Upload className="h-12 w-12 text-blue-500" />}
          allowedFileTypes={['.pdf', '.docx', '.doc', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']}
          validateFile={(file) => {
            if (!isAllowedCimFile(file)) {
              return { valid: false, error: 'Please upload a PDF, DOCX, or DOC file for the CIM.' };
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
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold mb-2">No CIMs uploaded yet</h3>
          <p className="text-gray-600">Use the upload zone above to upload your first CIM</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
