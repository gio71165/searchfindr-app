import { Check } from 'lucide-react';
import { ReactNode } from 'react';

interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description?: string;
  features: string[];
  ctaText: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  highlight?: boolean;
  badge?: string;
  originalPrice?: string;
}

export function PricingCard({
  name,
  price,
  period,
  description,
  features,
  ctaText,
  ctaHref,
  ctaOnClick,
  highlight = false,
  badge,
  originalPrice,
}: PricingCardProps) {
  const CardContent = (
    <div
      className={`relative p-8 lg:p-10 rounded-2xl border-2 transition-all duration-300 ${
        highlight
          ? 'border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 scale-105 lg:scale-110'
          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8'
      }`}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <div className="px-4 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-semibold border-2 border-[#0a0e14]">
            {badge}
          </div>
        </div>
      )}

      {highlight && (
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-emerald-500/20 rounded-2xl blur-2xl opacity-50 -z-10" />
      )}

      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
        {description && (
          <p className="text-white/60 text-sm">{description}</p>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          {originalPrice && (
            <span className="text-lg text-white/40 line-through">
              {originalPrice}
            </span>
          )}
          <span className="text-4xl lg:text-5xl font-bold text-white">
            {price}
          </span>
          {period && (
            <span className="text-lg text-white/60">{period}</span>
          )}
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="h-3 w-3 text-white" />
            </div>
            <span className="text-white/80 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {ctaHref && ctaHref !== '#' ? (
        <a
          href={ctaHref}
          target={ctaHref.startsWith('http') ? '_blank' : undefined}
          rel={ctaHref.startsWith('http') ? 'noopener noreferrer' : undefined}
          className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all ${
            highlight
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105'
              : 'border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30'
          }`}
        >
          {ctaText}
        </a>
      ) : (
        <button
          onClick={ctaOnClick}
          disabled={ctaHref === '#'}
          className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all ${
            ctaHref === '#'
              ? 'border-2 border-white/10 bg-white/5 text-white/50 cursor-not-allowed'
              : highlight
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/40 hover:scale-105'
              : 'border-2 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:border-white/30'
          }`}
        >
          {ctaText}
        </button>
      )}
    </div>
  );

  return CardContent;
}
