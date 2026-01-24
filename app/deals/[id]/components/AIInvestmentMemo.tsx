import { FileText } from 'lucide-react';

export function AIInvestmentMemo({ 
  summary, 
  emptyText 
}: { 
  summary: string | null | undefined;
  emptyText?: string;
}) {
  const hasContent = Boolean(summary);
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-blue-900 text-lg mb-3">AI Investment Memo</h3>
          {hasContent ? (
            <div className="whitespace-pre-line text-sm leading-relaxed text-blue-900 bg-white/60 rounded-lg p-4 border border-blue-200">
              {summary}
            </div>
          ) : (
            <p className="text-sm text-blue-700">
              {emptyText || 'No diligence memo available yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
