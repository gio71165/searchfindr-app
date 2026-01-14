import React from 'react';
import { FileText, Globe, Upload, DollarSign } from 'lucide-react';

export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;

  const config = {
    on_market: {
      label: 'On-market',
      icon: Globe,
      color: 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    },
    off_market: {
      label: 'Off-market',
      icon: Globe,
      color: 'bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    },
    cim_pdf: {
      label: 'CIM Upload',
      icon: FileText,
      color: 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    financials: {
      label: 'Financials',
      icon: DollarSign,
      color: 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    },
  };

  const conf = config[source as keyof typeof config] || {
    label: source,
    icon: Upload,
    color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  };

  const Icon = conf.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${conf.color}`}>
      <Icon className="h-3 w-3" />
      <span>{conf.label}</span>
    </span>
  );
}
