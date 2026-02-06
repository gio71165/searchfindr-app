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
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-slate-700 rounded-lg">
          <FileText className="w-5 h-5 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-50">AI Investment Memo</h3>
      </div>
      <div className="flex-1">
        {hasContent ? (
          <div className="whitespace-pre-line text-sm leading-relaxed text-slate-300 bg-slate-900 rounded-lg p-4 border border-slate-700">
            {summary}
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            {emptyText || 'No diligence memo available yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
