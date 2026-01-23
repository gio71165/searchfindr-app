'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { LoadingDots } from '@/components/ui/LoadingSpinner';
import { AsyncButton } from '@/components/ui/AsyncButton';

export default function GenerateMonthlyUpdateButton() {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const url = `/api/investor/monthly-update?month=${encodeURIComponent(month)}`;
      
      // Open in new window for printing/downloading
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error generating monthly update:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AsyncButton
      onClick={handleGenerate}
      isLoading={loading}
      loadingText="Generating..."
      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <FileDown className="h-4 w-4" />
      Generate Monthly Update
    </AsyncButton>
  );
}
