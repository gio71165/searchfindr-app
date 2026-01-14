import type { ConfidenceLevel } from '../lib/types';

export function ConfidencePill({
  icon,
  label,
  title,
  analyzed,
  level,
}: {
  icon: '⚠️' | '◑' | '●';
  label: string;
  title: string;
  analyzed?: boolean;
  level?: ConfidenceLevel;
}) {
  const base = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium';

  const cls =
    analyzed === false
      ? `${base} border-slate-500/30 bg-transparent text-slate-500`
      : icon === '⚠️' || level === 'low'
      ? `${base} border-red-500/40 bg-red-500/5 text-red-700`
      : icon === '●' || level === 'high'
      ? `${base} border-emerald-500/40 bg-emerald-500/5 text-emerald-700`
      : `${base} border-blue-500/40 bg-blue-500/5 text-blue-700`;

  return (
    <span className={cls} title={title}>
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
