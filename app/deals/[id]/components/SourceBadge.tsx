export function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;

  const label =
    source === 'on_market'
      ? 'On-market'
      : source === 'off_market'
      ? 'Off-market'
      : source === 'cim_pdf'
      ? 'CIM (PDF)'
      : source === 'financials'
      ? 'Financials'
      : source;

  const tone =
    source === 'on_market'
      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/40'
      : source === 'off_market'
      ? 'bg-sky-500/10 text-sky-600 border-sky-500/40'
      : source === 'financials'
      ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/40'
      : 'bg-purple-500/10 text-purple-600 border-purple-500/40';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  );
}
