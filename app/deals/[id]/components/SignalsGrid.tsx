import type { ConfidenceSignal } from '../lib/types';

export function SignalsGrid({ signals }: { signals: ConfidenceSignal[] }) {
  if (!signals || signals.length === 0) return null;

  return (
    <div className="mt-3">
      <p className="text-xs uppercase opacity-70 mb-2">Signals</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {signals.slice(0, 8).map((s, idx) => (
          <div key={idx} className="rounded-lg border px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide opacity-70">{s.label}</div>
            <div className="text-sm font-medium">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
