import React, { useState, useEffect } from 'react';
import { LucideIcon } from 'lucide-react';

export function StatCard({
  icon: Icon,
  value,
  label,
  color = 'blue',
  onClick,
  isActive = false,
  delay = 0,
  change,
  trend,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  onClick?: () => void;
  isActive?: boolean;
  delay?: number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const iconColorClasses = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    yellow: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-violet-400',
  };

  const iconBgClasses = {
    blue: 'bg-blue-500/10',
    green: 'bg-emerald-500/10',
    yellow: 'bg-amber-500/10',
    red: 'bg-red-500/10',
    purple: 'bg-violet-500/10',
  };

  const iconColor = iconColorClasses[color];
  const iconBg = iconBgClasses[color];

  const baseClasses = `
    group bg-slate-800 border border-slate-700 rounded-xl p-6
    hover:shadow-lg hover:border-slate-600 transition-all duration-200
    ${onClick ? 'cursor-pointer' : ''}
    ${isActive ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-500 shadow-md' : ''}
    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
  `;

  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      {/* Header with Icon and Change */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2 ${iconBg} rounded-lg`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {change && (
          <span className={`text-sm font-medium ${trendColor}`}>
            {change}
          </span>
        )}
      </div>

      {/* Metric */}
      <div className="space-y-1">
        <p className="text-3xl font-bold font-mono text-slate-50">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </div>
  );
}
