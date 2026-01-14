import { AlertTriangle } from 'lucide-react';

export function RedFlagsPanel({ redFlags }: { redFlags: string[] }) {
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500 dark:border-l-red-600 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Red Flags</h3>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {redFlags.length}
        </span>
      </div>
      {redFlags.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">No red flags detected yet.</p>
      ) : (
        <ul className="space-y-2">
          {redFlags.map((flag, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-700 dark:text-slate-300">{flag}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
