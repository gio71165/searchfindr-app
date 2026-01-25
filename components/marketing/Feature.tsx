import { ReactNode } from 'react';

interface FeatureProps {
  icon: ReactNode;
  text: string;
  subtext?: string;
  highlight?: boolean;
}

export function Feature({ icon, text, subtext, highlight = false }: FeatureProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="flex-1">
        <p className={`font-medium ${highlight ? 'text-emerald-400' : 'text-white'}`}>
          {text}
        </p>
        {subtext && (
          <p className="text-sm text-white/60 mt-0.5">{subtext}</p>
        )}
      </div>
    </div>
  );
}
