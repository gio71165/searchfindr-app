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
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-slate-600" />
        <h3 className="text-xl font-semibold text-slate-900">AI Investment Memo</h3>
      </div>
      {hasContent ? (
        <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
          {summary}
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          {emptyText || 'No diligence memo available yet.'}
        </p>
      )}
    </div>
  );
}
