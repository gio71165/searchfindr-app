'use client';

import { AlertTriangle } from 'lucide-react';
import { JargonTooltip } from '@/components/ui/JargonTooltip';

type QoeRedFlag = {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  why_it_matters?: string;
  next_action?: string;
};

export function QoeRedFlagsPanel({ qoeRedFlags, embedded }: { qoeRedFlags: QoeRedFlag[]; embedded?: boolean }) {
  if (!qoeRedFlags || qoeRedFlags.length === 0) {
    return null;
  }

  const getSeverityBadge = (severity: string) => {
    const severityLower = severity.toLowerCase();
    if (severityLower === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30">
          High
        </span>
      );
    }
    if (severityLower === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          Medium
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-600/50 text-slate-300 border border-slate-500">
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

  const listContent = (
    <ul className="space-y-3">
      {qoeRedFlags.map((flag, idx) => (
        <li key={idx} className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0 mt-0.5">
            {getSeverityIcon(flag.severity)}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {getSeverityBadge(flag.severity)}
              <span className="text-xs font-medium text-slate-400 uppercase">
                {flag.type.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-slate-300 mb-2">{flag.description}</p>
            {flag.why_it_matters && (
              <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm">
                <p className="font-medium text-emerald-400 mb-1">Why This Matters:</p>
                <p className="text-slate-300">{flag.why_it_matters}</p>
              </div>
            )}
            {flag.next_action && (
              <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm">
                <p className="font-medium text-emerald-400 mb-1">Next Action:</p>
                <p className="text-slate-300">{flag.next_action}</p>
              </div>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">
          Quality of <JargonTooltip term="QoE">Earnings</JargonTooltip> Red Flags
        </h4>
        <p className="text-xs text-slate-400">Earnings quality issues that may overstate EBITDA or indicate accounting concerns.</p>
        {listContent}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border-2 border-amber-500/30 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-50">
            Quality of <JargonTooltip term="QoE">Earnings</JargonTooltip> Red Flags
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            Earnings quality issues that may overstate EBITDA or indicate accounting concerns
          </p>
        </div>
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
          {qoeRedFlags.length}
        </span>
      </div>
      {listContent}
    </div>
  );
}
