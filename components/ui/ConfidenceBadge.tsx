import React from 'react';
import { AlertCircle, Circle, CheckCircle2 } from 'lucide-react';

export function ConfidenceBadge({
  level,
  analyzed = true,
  size = 'default',
}: {
  level?: 'low' | 'medium' | 'high' | null;
  analyzed?: boolean;
  size?: 'small' | 'default';
}) {
  if (!analyzed) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 text-slate-600 ${size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}>
        <Circle className="h-3 w-3" />
        <span>Not analyzed</span>
      </span>
    );
  }

  const config = {
    high: {
      icon: CheckCircle2,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      label: 'High confidence',
    },
    medium: {
      icon: Circle,
      color: 'text-yellow-700',
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      label: 'Medium confidence',
    },
    low: {
      icon: AlertCircle,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      label: 'Low confidence',
    },
  };

  const validLevels = ['high', 'medium', 'low'];
  const safeLevel = (level && validLevels.includes(level)) ? level : 'medium';
  const conf = config[safeLevel];
  const Icon = conf.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${conf.border} ${conf.bg} ${conf.color} ${size === 'small' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium'}`}>
      <Icon className="h-3 w-3" />
      <span>{conf.label}</span>
    </span>
  );
}
