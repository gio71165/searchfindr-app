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
    blue: 'text-blue-600',
    green: 'text-emerald-600',
    yellow: 'text-amber-600',
    red: 'text-red-600',
    purple: 'text-violet-600',
  };

  const iconBgClasses = {
    blue: 'bg-blue-50',
    green: 'bg-emerald-50',
    yellow: 'bg-amber-50',
    red: 'bg-red-50',
    purple: 'bg-violet-50',
  };

  const iconColor = iconColorClasses[color];
  const iconBg = iconBgClasses[color];

  const baseClasses = `
    group bg-white border border-slate-200 rounded-xl p-6
    hover:shadow-lg hover:border-slate-300 transition-all duration-200
    ${onClick ? 'cursor-pointer' : ''}
    ${isActive ? 'ring-2 ring-offset-2 ring-emerald-500 shadow-md' : ''}
    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
  `;

  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-600' : 'text-slate-600';

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
        <p className="text-3xl font-bold font-mono text-slate-900">{value}</p>
        <p className="text-sm text-slate-600">{label}</p>
      </div>
    </div>
  );
}
