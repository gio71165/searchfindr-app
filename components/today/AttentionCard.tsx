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
    urgent: 'border-red-200 bg-red-50',
    warning: 'border-yellow-200 bg-yellow-50',
    info: 'border-blue-200 bg-blue-50'
  };

  return (
    <div className={`border-2 rounded-xl p-6 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600">{count} {count === 1 ? 'deal' : 'deals'}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
