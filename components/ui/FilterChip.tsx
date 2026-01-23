import React from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';

export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 text-sm font-medium">
      <span>{label}</span>
      <IconButton
        onClick={onRemove}
        icon={<X className="h-3 w-3" />}
        label={`Remove ${label} filter`}
        className="hover:bg-blue-100 rounded-full p-2"
      />
    </span>
  );
}
