interface ContentHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function ContentHeader({ title, description, action }: ContentHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-600 mt-1">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
