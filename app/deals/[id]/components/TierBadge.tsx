export function TierBadge({ tier }: { tier: string | null }) {
  if (!tier) return null;
  
  const tierColors = {
    A: 'bg-green-500/10 border-green-500/40 text-green-700 dark:bg-green-500/20 dark:border-green-500/50 dark:text-green-400',
    B: 'bg-yellow-500/10 border-yellow-500/40 text-yellow-700 dark:bg-yellow-500/20 dark:border-yellow-500/50 dark:text-yellow-400',
    C: 'bg-gray-500/10 border-gray-500/40 text-gray-700 dark:bg-gray-500/20 dark:border-gray-500/50 dark:text-gray-400',
  };
  
  const normalizedTier = tier.toUpperCase() as 'A' | 'B' | 'C';
  const colors = tierColors[normalizedTier] || tierColors.C;
  
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${colors}`}>
      Tier {tier}
    </span>
  );
}
