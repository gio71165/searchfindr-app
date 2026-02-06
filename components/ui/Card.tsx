'use client';

import { ReactNode } from 'react';

/** Card variant: default, elevated, bordered, alert, highlight */
type CardVariant = 'default' | 'elevated' | 'bordered' | 'alert' | 'highlight';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: 'sm' | 'default' | 'lg' | 'none';
  className?: string;
  /** Use for semantic structure */
  as?: 'div' | 'section' | 'article';
}

const variantStyles: Record<CardVariant, string> = {
  default:
    'bg-slate-800 border border-slate-700 rounded-lg shadow-[var(--shadow-card)]',
  elevated:
    'bg-slate-800 border border-slate-700 rounded-lg shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow',
  bordered:
    'bg-slate-800/50 border-2 border-slate-700 rounded-xl',
  alert:
    'bg-red-500/10 border-2 border-red-500/30 rounded-xl',
  highlight:
    'bg-emerald-500/5 border-2 border-emerald-500/30 rounded-xl shadow-[var(--shadow-card)]',
};

const paddingStyles = {
  none: '',
  sm: 'p-4',
  default: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
};

export function Card({
  children,
  variant = 'default',
  padding = 'default',
  className = '',
  as: Component = 'div',
}: CardProps) {
  return (
    <Component
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`.trim()}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 last:mb-0 ${className}`}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3
      className={`text-base sm:text-lg font-semibold text-slate-50 ${className}`}
    >
      {children}
    </h3>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}
