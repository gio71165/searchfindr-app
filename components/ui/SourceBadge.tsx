import React from 'react';
import { FileText, Globe, Upload, DollarSign } from 'lucide-react';

export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;

  const config = {
    on_market: {
      label: 'On-market',
      icon: Globe,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    off_market: {
      label: 'Off-market',
      icon: Globe,
      color: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    cim_pdf: {
      label: 'CIM Upload',
      icon: FileText,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    financials: {
      label: 'Financials',
      icon: DollarSign,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
  };

  const conf = config[source as keyof typeof config] || {
    label: source,
    icon: Upload,
    color: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  const Icon = conf.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${conf.color}`}>
      <Icon className="h-3 w-3" />
      <span>{conf.label}</span>
    </span>
  );
}
