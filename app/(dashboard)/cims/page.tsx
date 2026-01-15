'use client';

import { useState, useEffect, useMemo, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import { DealCard } from '@/components/ui/DealCard';
import { ContentHeader } from '@/components/dashboard/ContentHeader';
import { PipelineSummary } from '@/components/dashboard/PipelineSummary';
import { VerdictFilters } from '@/components/dashboard/VerdictFilters';
import { Upload } from 'lucide-react';

export default function CimsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter states
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedVerdict, setSelectedVerdict] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload state
  const [cimFile, setCimFile] = useState<File | null>(null);
  const cimInputRef = useRef<HTMLInputElement | null>(null);
  const [cimUploadStatus, setCimUploadStatus] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/');
          return;
        }

        setUserId(user.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('id', user.id)
          .single();

        if (!profile?.workspace_id) {
          setLoading(false);
          return;
        }

        setWorkspaceId(profile.workspace_id);
        await loadDeals(profile.workspace_id);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  async function loadDeals(wsId: string) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('workspace_id', wsId)
      .eq('source_type', 'cim_pdf')
      .is('passed_at', null)
      .order('created_at', { ascending: false });

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

  const handleCimButtonClick = () => cimInputRef.current?.click();

  const handleCimFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setErrorMsg('Please upload a PDF file for the CIM.');
      setCimFile(null);
      setCimUploadStatus('error');
      return;
    }

    if (!userId || !workspaceId) {
      setErrorMsg('User/workspace not loaded yet. Please try again.');
      return;
    }

    setErrorMsg(null);
    setCimFile(file);
    setCimUploadStatus('uploading');

    try {
      const fileExt = file.name.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: storageData, error: storageError } = await supabase.storage.from('cims').upload(filePath, file);
      if (storageError) {
        console.error('CIM upload error:', storageError);
        setErrorMsg('Failed to upload CIM. Please try again.');
        setCimUploadStatus('error');
        return;
      }

      const cimNameWithoutExt = file.name.replace(/\.pdf$/i, '');

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
        console.error('Error inserting CIM company row:', insertError);
        setErrorMsg('CIM uploaded, but failed to create deal record.');
        setCimUploadStatus('error');
        return;
      }

      await loadDeals(workspaceId);
      setCimUploadStatus('uploaded');
      setCimFile(null);
      setTimeout(() => setCimUploadStatus('idle'), 3000);
    } catch (err) {
      console.error('Unexpected CIM upload error:', err);
      setErrorMsg('Unexpected error uploading CIM.');
      setCimUploadStatus('error');
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
        className="w-full px-4 py-3 border rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Action Button */}
      <div className="mb-6">
        <button
          onClick={handleCimButtonClick}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Upload CIM
        </button>
      </div>

      {/* Hidden file input */}
      <input ref={cimInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleCimFileChange} />

      {/* Upload Status Messages */}
      {cimUploadStatus !== 'idle' && (
        <div
          className={`rounded-xl border p-4 mb-4 ${
            cimUploadStatus === 'uploaded'
              ? 'bg-green-50 border-green-200 text-green-700'
              : cimUploadStatus === 'error'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}
        >
          <div className="font-semibold">
            {cimUploadStatus === 'uploading' && 'Uploading CIM…'}
            {cimUploadStatus === 'uploaded' && 'CIM uploaded successfully!'}
            {cimUploadStatus === 'error' && 'CIM upload failed'}
          </div>
          {cimFile && <div className="text-sm mt-1">File: {cimFile.name}</div>}
        </div>
      )}

      {/* Results */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredDeals.length} of {deals.length} deals
      </div>

      {/* Deal Cards */}
      {filteredDeals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold mb-2">No CIMs uploaded yet</h3>
          <p className="text-gray-600 mb-6">Upload a CIM to get AI-powered analysis with QoE red flags</p>
          <button
            onClick={handleCimButtonClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Upload Your First CIM
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
