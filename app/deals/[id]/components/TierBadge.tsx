export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  
  const tierColors = {
    A: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      text: 'text-emerald-700',
      shadow: 'shadow-sm shadow-emerald-100'
    },
    B: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      shadow: 'shadow-sm shadow-amber-100'
    },
    C: {
      bg: 'bg-slate-100',
      border: 'border-slate-300',
      text: 'text-slate-700',
      shadow: 'shadow-sm shadow-slate-100'
    },
  };
  
  const normalizedTier = tier.toUpperCase() as 'A' | 'B' | 'C';
  const colors = tierColors[normalizedTier] || tierColors.C;
  
  return (
    <span className={`inline-flex items-center rounded-full border-2 px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.border} ${colors.text} ${colors.shadow}`}>
      Tier {tier}
    </span>
  );
}
