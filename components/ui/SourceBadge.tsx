import React from 'react';
import { FileText, Globe, Upload, DollarSign } from 'lucide-react';

export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;

  const config = {
    on_market: {
      label: 'On-market',
      icon: Globe,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    off_market: {
      label: 'Off-market',
      icon: Globe,
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    },
    cim_pdf: {
      label: 'CIM Upload',
      icon: FileText,
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    financials: {
      label: 'Financials',
      icon: DollarSign,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
  };

  const conf = config[source as keyof typeof config] || {
    label: source,
    icon: Upload,
    color: 'bg-slate-700/50 text-slate-400 border-slate-600',
  };

  const Icon = conf.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${conf.color}`}>
      <Icon className="h-3 w-3" />
      <span>{conf.label}</span>
    </span>
  );
}
