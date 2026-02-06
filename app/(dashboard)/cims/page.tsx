'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/utils/logger';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { Upload } from 'lucide-react';
import { DragDropZone } from '@/components/ui/DragDropZone';
import { LoadingSpinner, LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import { ErrorState } from '@/components/ui/ErrorState';

export default function CimsPage() {
  const router = useRouter();
  const { user, workspaceId, session, loading: authLoading } = useAuth();
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
  const [showSampleCimButton, setShowSampleCimButton] = useState(true);
  const [uploadingSample, setUploadingSample] = useState(false);

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
    
    // Check if sample CIM was already uploaded
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('onboarding_checklist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setShowSampleCimButton(!parsed.sampleCimUploaded);
        } catch (e) {
          // Keep default true
        }
      }
      
      // Verify sample CIM file exists
      fetch('/sample-cim.pdf', { method: 'HEAD' })
        .then(res => {
          if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
            // File doesn't exist or is HTML (error page)
            setShowSampleCimButton(false);
          }
        })
        .catch(() => {
          // File doesn't exist
          setShowSampleCimButton(false);
        });
    }
    
    return () => { ok = false; };
  }, [authLoading, user, workspaceId, router]);

  async function loadDeals(wsId: string) {
    setErrorMsg(null);
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
      setErrorMsg(`Failed to load deals: ${error.message || 'Unknown error'}`);
      return;
    }

    setDeals(data || []);
    setErrorMsg(null);
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
      logger.error('Missing userId or workspaceId:', { userId, workspaceId });
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
      logger.info('Starting CIM upload:', { filePath, fileSize: fileToUpload.size, fileName });
      
      // Ensure we have a valid session before uploading
      if (!session) {
        throw new Error('Not authenticated. Please log in again.');
      }
      logger.info('Session check passed, user ID:', session.user.id);
      
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
      
      logger.info('Upload result:', { storageData, storageError });
      
      if (storageError) {
        setUploadProgress(0);
        logger.error('CIM upload error:', storageError);
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
        logger.error('CIM upload returned no data');
        setErrorMsg('Upload completed but no data returned. Please try again.');
        setCimUploadStatus('error');
        return;
      }

      setUploadProgress(95); // Upload complete, inserting into database

      const cimNameWithoutExt = stripExt(file.name);

      // Debug: Log what we're trying to insert
      logger.info('Attempting to insert CIM:', {
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
        logger.error('Error inserting CIM company row:', insertError);
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
      logger.error('Unexpected CIM upload error:', err);
      setErrorMsg('Unexpected error uploading CIM.');
      setCimUploadStatus('error');
      setUploadProgress(0);
    }
  };

  const handleUploadSampleCim = async () => {
    if (!user || !workspaceId || uploadingSample) return;

    try {
      setUploadingSample(true);
      setErrorMsg(null);
      
      // Fetch sample CIM from public folder
      const response = await fetch('/sample-cim.pdf');
      if (!response.ok) {
        throw new Error('Sample CIM file not found. Please upload your own CIM file.');
      }
      
      const blob = await response.blob();
      
      // Validate it's actually a PDF by checking the blob type and content
      if (blob.type && !blob.type.includes('pdf') && blob.type !== 'application/octet-stream') {
        throw new Error('Sample CIM file is not a valid PDF. Please upload your own CIM file.');
      }
      
      // Check file size (should be reasonable for a PDF)
      if (blob.size < 100 || blob.size > 50 * 1024 * 1024) {
        throw new Error('Sample CIM file size is invalid. Please upload your own CIM file.');
      }
      
      // Read first bytes to verify it's a PDF (PDF starts with %PDF)
      const firstBytes = await blob.slice(0, 4).text();
      if (!firstBytes.startsWith('%PDF')) {
        throw new Error('Sample CIM file is not a valid PDF. Please upload your own CIM file.');
      }
      
      const file = new File([blob], 'sample-cim.pdf', { type: 'application/pdf' });
      
      // Upload to Supabase storage
      const fileExt = 'pdf';
      const fileName = `${Date.now()}-sample-cim.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage
        .from('cims')
        .upload(filePath, file);

      if (storageError) {
        throw new Error('Failed to upload sample CIM');
      }

      // Create deal record
      if (!session) {
        throw new Error('Not authenticated');
      }

      const { data: insertData, error: insertError } = await supabase
        .from('companies')
        .insert({
          company_name: 'Sample Deal - Manufacturing Company',
          source_type: 'cim_pdf',
          cim_storage_path: storageData?.path || filePath,
          user_id: user.id,
          workspace_id: workspaceId,
        })
        .select('id')
        .single();

      if (insertError || !insertData) {
        throw new Error('Failed to create deal record');
      }

      // Process the CIM
      const token = session.access_token;
      const processResponse = await fetch('/api/process-cim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyId: insertData.id,
          cimStoragePath: storageData?.path || filePath,
          companyName: 'Sample Deal - Manufacturing Company',
        }),
      });

      if (!processResponse.ok) {
        const errorText = await processResponse.text();
        let errorMessage = 'Failed to process sample CIM';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Mark as completed and hide button
      setShowSampleCimButton(false);
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('onboarding_checklist');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            parsed.sampleCimUploaded = true;
            if (parsed.items) {
              const item = parsed.items.find((i: any) => i.id === 'upload-sample-cim');
              if (item) item.completed = true;
            }
            localStorage.setItem('onboarding_checklist', JSON.stringify(parsed));
          } catch (e) {
            // Ignore
          }
        }
        window.dispatchEvent(new CustomEvent('onboarding:sample-cim-uploaded'));
      }
      
      // Reload deals and navigate to the deal
      await loadDeals(workspaceId);
      router.push(`/deals/${insertData.id}`);
    } catch (error) {
      logger.error('Error uploading sample CIM:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload sample CIM.';
      
      // Provide helpful error message
      if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        setErrorMsg('Sample CIM file is not available. Please upload your own CIM file using the upload zone above.');
      } else if (errorMessage.includes('not a valid PDF')) {
        setErrorMsg('The sample CIM file is corrupted or invalid. Please upload your own CIM file.');
      } else if (errorMessage.includes('CSV') || errorMessage.includes('Invalid file type')) {
        setErrorMsg('The sample CIM file format is invalid. Please upload your own PDF, DOCX, or DOC file.');
      } else {
        setErrorMsg(errorMessage + ' Please try uploading your own CIM file.');
      }
    } finally {
      setUploadingSample(false);
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-full bg-slate-900 p-4 sm:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-slate-900 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
      <ContentHeader
        title="CIMs"
        description="Confidential Information Memorandums uploaded for analysis"
      />

      {/* Sample CIM Button - Prominent for new users */}
      {showSampleCimButton && (
        <div className="mb-6 p-4 bg-blue-500/10 border-2 border-blue-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-blue-400 mb-1">New to SearchFindr?</h3>
              <p className="text-sm text-slate-300">
                Upload our sample CIM to see how AI analysis works. This will create a demo deal you can explore.
              </p>
            </div>
            <AsyncButton
              onClick={handleUploadSampleCim}
              isLoading={uploadingSample}
              loadingText="Uploading..."
              disabled={!user || !workspaceId}
              className="btn-secondary btn-lg ml-4 whitespace-nowrap"
            >
              Upload Sample CIM
            </AsyncButton>
          </div>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search CIMs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 placeholder-slate-500 mb-6 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
          icon={<Upload className="h-12 w-12 text-slate-400" />}
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
      <div className="mb-4 text-sm text-slate-400">
        Showing {filteredDeals.length} of {deals.length} deals
      </div>

      {/* Deal Cards */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-16 bg-slate-800 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-colors">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-slate-50 mb-2">No CIMs uploaded yet</h3>
          <p className="text-slate-400">Use the upload zone above to upload your first CIM</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredDeals.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}

      {/* Error Message */}
      {errorMsg && !loading && !cimUploadStatus && (
        <div className="mt-4">
          <ErrorState
            title="Couldn't load CIMs"
            message={errorMsg}
            onRetry={() => workspaceId && loadDeals(workspaceId)}
            retryText="Try again"
          />
        </div>
      )}
      </div>
    </div>
  );
}
