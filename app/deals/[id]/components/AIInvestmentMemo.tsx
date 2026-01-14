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
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">AI Investment Memo</h3>
      </div>
      {hasContent ? (
        <div className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {summary}
        </div>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {emptyText || 'No diligence memo available yet.'}
        </p>
      )}
    </div>
  );
}
