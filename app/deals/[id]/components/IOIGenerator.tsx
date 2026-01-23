'use client';

import { useState, useEffect } from 'react';
import { FileText, Copy, CheckCircle2, Download, Eye, ArrowLeft } from 'lucide-react';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';
import type { Deal } from '@/lib/types/deal';
import type { IOIData } from '@/lib/types/deal-templates';
import { useAuth } from '@/lib/auth-context';
import { showToast } from '@/components/ui/Toast';
import { JargonTooltip } from '@/components/ui/JargonTooltip';

export function IOIGenerator({ deal }: { deal: Deal | null }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<IOIData>({
    companyName: deal?.company_name || '',
    industry: deal?.industry || '',
    location: deal?.location_city && deal?.location_state 
      ? `${deal.location_city}, ${deal.location_state}`
      : deal?.location_city || deal?.location_state || '',
    purchasePriceRange: { min: 0, max: 0 },
    structureType: 'asset',
    financingType: 'sba_7a',
    dueDiligencePeriod: 45,
    targetCloseDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    keyConditions: [
      'Financial statements and tax returns',
      'Customer contracts and relationships',
      'Employee agreements and benefits',
      'Real estate and lease agreements',
      'Intellectual property and licenses',
    ],
    exclusivityRequested: true,
    exclusivityPeriod: 30,
    buyerName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    buyerEntity: '',
    buyerEmail: user?.email || '',
    buyerPhone: '',
  });

  // Pre-fill purchase price from deal analysis
  useEffect(() => {
    if (deal) {
      const fin = deal.ai_financials_json || {};
      const finAny = fin as Record<string, unknown>;
      const estimatedPrice = (finAny.estimated_purchase_price as string | undefined) || 
        (finAny.purchase_price as string | undefined) || 
        deal?.asking_price_extracted || '';
      
      if (estimatedPrice) {
        const priceNum = parseFloat(String(estimatedPrice).replace(/[^0-9.]/g, ''));
        if (priceNum > 0) {
          // Set range as ±10% of estimated price
          setFormData(prev => ({
            ...prev,
            purchasePriceRange: {
              min: Math.round(priceNum * 0.9),
              max: Math.round(priceNum * 1.1),
            },
          }));
        }
      }
    }
  }, [deal]);

  const handleInputChange = (field: keyof IOIData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConditionAdd = () => {
    setFormData(prev => ({
      ...prev,
      keyConditions: [...prev.keyConditions, ''],
    }));
  };

  const handleConditionChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      keyConditions: prev.keyConditions.map((c, i) => i === index ? value : c),
    }));
  };

  const handleConditionRemove = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keyConditions: prev.keyConditions.filter((_, i) => i !== index),
    }));
  };

  const handleGenerate = async () => {
    if (!formData.companyName || !formData.buyerName || !formData.buyerEmail) {
      showToast('Please fill in required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await import('@/app/supabaseClient').then(m => m.supabase.auth.getSession());
      const token = session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const res = await fetch('/api/generate-ioi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to generate IOI' }));
        throw new Error(errorData.error || 'Failed to generate IOI');
      }

      const data = await res.json();
      setPreview(data.template);
      setShowPreview(true);
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error('Unknown error');
      showToast(error.message || 'Failed to generate IOI', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!preview) return;
    navigator.clipboard.writeText(preview).then(() => {
      setCopied(true);
      showToast('Copied to clipboard', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const handleDownload = () => {
    if (!preview) return;
    const blob = new Blob([preview], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IOI_${formData.companyName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Downloaded', 'success', 2000);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-slate-600" />
        <h3 className="text-xl font-semibold text-slate-900">
          <JargonTooltip term="IOI">IOI</JargonTooltip> Generator
        </h3>
      </div>

      {showPreview && preview ? (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 bg-slate-50 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono">
              {preview}
            </pre>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                setShowPreview(false);
                setPreview(null);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Edit
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 bg-white hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Download as TXT
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Company Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => handleInputChange('industry', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Purchase Price Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price ($)</label>
              <input
                type="number"
                value={formData.purchasePriceRange.min || ''}
                onChange={(e) => handleInputChange('purchasePriceRange', {
                  ...formData.purchasePriceRange,
                  min: parseFloat(e.target.value) || 0,
                })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price ($)</label>
              <input
                type="number"
                value={formData.purchasePriceRange.max || ''}
                onChange={(e) => handleInputChange('purchasePriceRange', {
                  ...formData.purchasePriceRange,
                  max: parseFloat(e.target.value) || 0,
                })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Structure & Financing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Structure Type</label>
              <select
                value={formData.structureType}
                onChange={(e) => handleInputChange('structureType', e.target.value as 'asset' | 'stock' | 'tbd')}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="asset">Asset Purchase</option>
                <option value="stock">Stock Purchase</option>
                <option value="tbd">To Be Determined</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financing Type</label>
              <select
                value={formData.financingType}
                onChange={(e) => handleInputChange('financingType', e.target.value as IOIData['financingType'])}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="sba_7a">SBA 7(a)</option>
                <option value="conventional">Conventional</option>
                <option value="seller_financing">Seller Financing</option>
                <option value="combination">Combination</option>
              </select>
            </div>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Diligence Period (days)</label>
              <input
                type="number"
                value={formData.dueDiligencePeriod}
                onChange={(e) => handleInputChange('dueDiligencePeriod', parseInt(e.target.value) || 0)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Close Date</label>
              <input
                type="date"
                value={formData.targetCloseDate}
                onChange={(e) => handleInputChange('targetCloseDate', e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* Key Conditions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Due Diligence Conditions</label>
            {formData.keyConditions.map((condition, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => handleConditionChange(index, e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2"
                  placeholder="e.g., Financial statements and tax returns"
                />
                <button
                  onClick={() => handleConditionRemove(index)}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={handleConditionAdd}
              className="text-sm text-blue-600 hover:text-blue-800 mt-2"
            >
              + Add Condition
            </button>
          </div>

          {/* Exclusivity */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.exclusivityRequested}
              onChange={(e) => handleInputChange('exclusivityRequested', e.target.checked)}
              className="rounded"
            />
            <label className="text-sm font-medium text-gray-700">Request Exclusivity</label>
            {formData.exclusivityRequested && (
              <input
                type="number"
                value={formData.exclusivityPeriod || 30}
                onChange={(e) => handleInputChange('exclusivityPeriod', parseInt(e.target.value) || 30)}
                className="w-20 border rounded-lg px-2 py-1 text-sm"
                placeholder="Days"
              />
            )}
          </div>

          {/* Buyer Info */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Buyer Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name *</label>
                <input
                  type="text"
                  value={formData.buyerName}
                  onChange={(e) => handleInputChange('buyerName', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Entity</label>
                <input
                  type="text"
                  value={formData.buyerEntity}
                  onChange={(e) => handleInputChange('buyerEntity', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="LLC, Inc., etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Email *</label>
                <input
                  type="email"
                  value={formData.buyerEmail}
                  onChange={(e) => handleInputChange('buyerEmail', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Phone</label>
                <input
                  type="tel"
                  value={formData.buyerPhone}
                  onChange={(e) => handleInputChange('buyerPhone', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
          </div>

          <AsyncButton
            onClick={handleGenerate}
            isLoading={loading}
            loadingText="Generating..."
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" />
            Preview IOI
          </AsyncButton>
        </div>
      )}
    </div>
  );
}
