import React from 'react';
import { Search, X } from 'lucide-react';
import { IconButton } from './IconButton';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search deals...',
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      {value && onClear && (
        <IconButton
          onClick={onClear}
          icon={<X className="h-5 w-5" />}
          label="Clear search"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
        />
      )}
    </div>
  );
}
