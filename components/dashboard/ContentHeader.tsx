interface ContentHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function ContentHeader({ title, description, action }: ContentHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        <p className="text-gray-600 mt-1">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
