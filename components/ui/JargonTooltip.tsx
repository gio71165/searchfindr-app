'use client';

import { useState, useRef, useEffect } from 'react';
import { getJargonDefinition } from '@/lib/jargon-definitions';

interface JargonTooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
}

export function JargonTooltip({ term, children, className = '' }: JargonTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'top' | 'bottom'>('top');
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const definition = getJargonDefinition(term);

  // If no definition exists, just render children or term
  if (!definition) {
    return <span className={className}>{children || term}</span>;
  }

  // Handle positioning
  useEffect(() => {
    if (isOpen && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      // Check if tooltip would overflow bottom
      if (triggerRect.bottom + tooltipRect.height + 8 > viewportHeight) {
        setPosition('bottom');
      } else {
        setPosition('top');
      }
    }
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    // Small delay to allow moving to tooltip
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 100);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const displayText = children || term;

  return (
    <span className={`relative inline-block ${className}`}>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        className="cursor-help underline decoration-dotted decoration-gray-400 underline-offset-2 hover:decoration-gray-600"
      >
        {displayText}
      </span>
      
      {isOpen && (
        <div
          ref={tooltipRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute z-50 w-64 p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg pointer-events-auto ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-1/2 -translate-x-1/2`}
          role="tooltip"
        >
          <div className="font-semibold text-gray-900 mb-1">{term}</div>
          <div className="text-gray-600 leading-relaxed">{definition}</div>
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${
              position === 'top'
                ? 'top-full left-1/2 -translate-x-1/2 border-t-gray-200'
                : 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-200'
            }`}
          />
        </div>
      )}
    </span>
  );
}
