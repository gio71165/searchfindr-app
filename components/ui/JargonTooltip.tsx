'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getJargonDefinition } from '@/lib/jargon-definitions';

interface JargonTooltipProps {
  term: string;
  children?: React.ReactNode;
  className?: string;
}

const TOOLTIP_OFFSET = 8;
const TOOLTIP_WIDTH = 256; // w-64

export function JargonTooltip({ term, children, className = '' }: JargonTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const definition = getJargonDefinition(term);

  // If no definition exists, just render children or term
  if (!definition) {
    return <span className={className}>{children || term}</span>;
  }

  // Position tooltip (runs when open); tooltip is portaled so we use fixed positioning
  useEffect(() => {
    if (!isOpen || !triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;

    const left = triggerRect.left + triggerRect.width / 2 - TOOLTIP_WIDTH / 2;
    const leftClamped = Math.max(8, Math.min(left, (typeof window !== 'undefined' ? window.innerWidth : 0) - TOOLTIP_WIDTH - 8));

    let top: number;
    if (triggerRect.bottom + tooltipRect.height + TOOLTIP_OFFSET > viewportHeight && triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET >= 0) {
      top = triggerRect.top - tooltipRect.height - TOOLTIP_OFFSET;
    } else {
      top = triggerRect.bottom + TOOLTIP_OFFSET;
    }

    setTooltipStyle({ top, left: leftClamped });
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

  const tooltipContent =
    isOpen && typeof document !== 'undefined' ? (
      <div
        ref={tooltipRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={
          tooltipStyle
            ? { position: 'fixed' as const, top: tooltipStyle.top, left: tooltipStyle.left, width: TOOLTIP_WIDTH }
            : { position: 'fixed' as const, top: -9999, left: 0, width: TOOLTIP_WIDTH, visibility: 'hidden' as const }
        }
        className="z-[10000] p-3 text-sm text-slate-300 bg-slate-800 border border-slate-700 rounded-lg shadow-lg pointer-events-auto"
        role="tooltip"
      >
        <div className="font-semibold text-slate-50 mb-1">{term}</div>
        <div className="text-slate-400 leading-relaxed">{definition}</div>
      </div>
    ) : null;

  return (
    <>
      <span className={`relative inline-block ${className}`}>
        <span
          ref={triggerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          className="cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2 hover:decoration-slate-600"
        >
          {displayText}
        </span>
      </span>
      {typeof document !== 'undefined' && tooltipContent
        ? createPortal(tooltipContent, document.body)
        : null}
    </>
  );
}
