import React from 'react';
import { LucideIcon } from 'lucide-react';

export function ActionButton({
  icon: Icon,
  label,
  description,
  onClick,
  variant = 'primary',
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  disabled?: boolean;
}) {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-ghost',
    success: 'bg-brand hover:bg-brand-dark text-white border-brand',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-start gap-2 rounded-xl border p-6 text-left transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${variantClasses[variant]}`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${variant === 'primary' || variant === 'success' ? 'bg-emerald-500/20' : 'bg-slate-100'}`}>
          <Icon className={`h-6 w-6 ${variant === 'primary' || variant === 'success' ? 'text-white' : 'text-slate-700'}`} />
        </div>
        <span className="text-lg font-semibold">{label}</span>
      </div>
      {description && <p className="text-sm opacity-80 ml-14">{description}</p>}
    </button>
  );
}
