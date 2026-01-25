import { X } from 'lucide-react';

interface NotIncludedProps {
  text: string;
}

export function NotIncluded({ text }: NotIncludedProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-white/50">
      <X className="w-4 h-4 text-white/40" />
      <span>{text}</span>
    </div>
  );
}
