import React from 'react';
import { LucideIcon } from 'lucide-react';

export function StatCard({
  icon: Icon,
  value,
  label,
  color = 'blue',
  onClick,
  isActive = false,
}: {
  icon: LucideIcon;
  value: number | string;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  onClick?: () => void;
  isActive?: boolean;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };

  const baseClasses = `rounded-xl border p-6 transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''} ${isActive ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`;

  return (
    <div className={`${baseClasses} ${colorClasses[color]}`} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm font-medium mt-1 opacity-90">{label}</p>
        </div>
        <div className="opacity-60">
          <Icon className="h-8 w-8" />
        </div>
      </div>
    </div>
  );
}
