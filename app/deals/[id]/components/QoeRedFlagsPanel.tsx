'use client';

import { AlertTriangle } from 'lucide-react';

type QoeRedFlag = {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
};

export function QoeRedFlagsPanel({ qoeRedFlags }: { qoeRedFlags: QoeRedFlag[] }) {
  if (!qoeRedFlags || qoeRedFlags.length === 0) {
    return null;
  }

  const getSeverityBadge = (severity: string) => {
    const severityLower = severity.toLowerCase();
    if (severityLower === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800">
          High
        </span>
      );
    }
    if (severityLower === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300 dark:bg-yellow-950/20 dark:text-yellow-300 dark:border-yellow-800">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
        Low
      </span>
    );
  };

  const getSeverityIcon = (severity: string) => {
    const severityLower = severity.toLowerCase();
    if (severityLower === 'high') return '❗';
    if (severityLower === 'medium') return '⚠️';
    return 'ℹ️';
  };

  return (
    <div className="rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500 dark:border-l-orange-600 p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          Quality of Earnings Analysis
        </h3>
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
          {qoeRedFlags.length}
        </span>
      </div>
      <ul className="space-y-3">
        {qoeRedFlags.map((flag, idx) => (
          <li key={idx} className="flex items-start gap-3">
            <span className="text-lg flex-shrink-0 mt-0.5">
              {getSeverityIcon(flag.severity)}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {getSeverityBadge(flag.severity)}
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
                  {flag.type.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{flag.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
