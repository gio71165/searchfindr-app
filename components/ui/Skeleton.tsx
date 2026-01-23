import React from 'react';

type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  lines?: number;
};

export function Skeleton({ 
  className = '', 
  width, 
  height, 
  rounded = true,
  lines 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-emerald-100';
  const roundedClass = rounded ? 'rounded' : '';
  const widthStyle = width ? (typeof width === 'number' ? `${width}px` : width) : undefined;
  const heightStyle = height ? (typeof height === 'number' ? `${height}px` : height) : undefined;

  if (lines && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, idx) => (
          <div
            key={idx}
            className={`${baseClasses} ${roundedClass} mb-2`}
            style={{
              width: idx === lines - 1 ? '80%' : '100%',
              height: heightStyle || '1rem',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${roundedClass} ${className}`}
      style={{
        width: widthStyle || '100%',
        height: heightStyle || '1rem',
      }}
    />
  );
}
