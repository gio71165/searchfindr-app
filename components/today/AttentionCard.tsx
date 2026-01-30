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
    urgent: 'border-red-200 bg-white',
    warning: 'border-amber-200 bg-white',
    info: 'border-blue-200 bg-white'
  };

  const iconBgStyles = {
    urgent: 'bg-red-50',
    warning: 'bg-amber-50',
    info: 'bg-blue-50'
  };

  return (
    <div className={`border-2 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgStyles[variant]}`}>
            <span className="text-2xl">{icon}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-600">{count} {count === 1 ? 'deal' : 'deals'}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
