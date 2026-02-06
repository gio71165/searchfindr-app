interface AttentionCardProps {
  title: string;
  count: number;
  variant: 'urgent' | 'warning' | 'info';
  icon: string;
  children: React.ReactNode;
}

export function AttentionCard({ 
  title, 
  count, 
  variant, 
  icon, 
  children 
}: AttentionCardProps) {
  const variantStyles = {
    urgent: 'border-red-500/30 bg-slate-800',
    warning: 'border-amber-500/30 bg-slate-800',
    info: 'border-blue-500/30 bg-slate-800'
  };

  const iconBgStyles = {
    urgent: 'bg-red-500/10',
    warning: 'bg-amber-500/10',
    info: 'bg-blue-500/10'
  };

  return (
    <div className={`border-2 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgStyles[variant]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
            <p className="text-sm text-slate-400">{count} {count === 1 ? 'deal' : 'deals'}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
