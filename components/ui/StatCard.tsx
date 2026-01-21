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
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  onClick?: () => void;
  isActive?: boolean;
  delay?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-600',
      hover: 'hover:bg-blue-100 hover:border-blue-300',
      shadow: 'shadow-blue-200',
    },
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
      hover: 'hover:bg-emerald-100 hover:border-emerald-300',
      shadow: 'shadow-emerald-200',
    },
    yellow: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-700',
      icon: 'text-amber-600',
      hover: 'hover:bg-amber-100 hover:border-amber-300',
      shadow: 'shadow-amber-200',
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: 'text-red-600',
      hover: 'hover:bg-red-100 hover:border-red-300',
      shadow: 'shadow-red-200',
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      icon: 'text-purple-600',
      hover: 'hover:bg-purple-100 hover:border-purple-300',
      shadow: 'shadow-purple-200',
    },
  };

  const colors = colorClasses[color];
  const baseClasses = `
    rounded-xl border-2 p-6 transition-all duration-200
    ${colors.bg} ${colors.border} ${colors.text}
    ${onClick ? `cursor-pointer ${colors.hover} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]` : ''}
    ${isActive ? `ring-2 ring-offset-2 ring-${color}-600 shadow-lg ${colors.shadow}` : ''}
    ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
  `;

  return (
    <div
      className={baseClasses}
      onClick={onClick}
      style={{
        transitionDelay: `${delay}ms`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-3xl font-bold mb-1">{value}</p>
          <p className="text-sm font-semibold opacity-90">{label}</p>
        </div>
        <div className={`opacity-70 ${colors.icon}`}>
          <Icon className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}
