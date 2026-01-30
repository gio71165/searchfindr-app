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
    <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-100 rounded-lg">
          <FileText className="w-5 h-5 text-slate-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">AI Investment Memo</h3>
      </div>
      <div className="flex-1">
        {hasContent ? (
          <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 bg-white rounded-lg p-4 border border-slate-200">
            {summary}
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            {emptyText || 'No diligence memo available yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
