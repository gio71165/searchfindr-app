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
    urgent: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20',
    warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
  };

  return (
    <div className={`border-2 rounded-xl p-6 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{count} {count === 1 ? 'deal' : 'deals'}</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
