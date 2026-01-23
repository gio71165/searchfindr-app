import React, { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label: string; // Required for accessibility
  showTooltip?: boolean;
}

export function IconButton({ 
  icon, 
  label, 
  showTooltip = true,
  className = '',
  ...props 
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      title={showTooltip ? label : undefined}
      className={`touch-target inline-flex items-center justify-center rounded-lg transition-colors ${className}`}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
}
