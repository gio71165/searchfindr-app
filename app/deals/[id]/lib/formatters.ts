export function formatMoney(v: number | null | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `$${Math.round(v).toLocaleString()}`;
  }
}

export function formatPct(v: number | null | undefined) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return `${v.toFixed(1)}%`;
}

export function sortYearsLikeHuman(a: string, b: string) {
  const an = parseInt(a, 10);
  const bn = parseInt(b, 10);
  const aOk = Number.isFinite(an) && String(an) === a.trim();
  const bOk = Number.isFinite(bn) && String(bn) === b.trim();
  if (aOk && bOk) return an - bn;
  return a.localeCompare(b);
}

export function safeDateLabel(d: string | null | undefined) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return null;
  }
}

export function firstSentence(text: string | null | undefined): string {
  const t = (text || '').trim();
  if (!t) return '';
  const idx = t.search(/[.!?]\s/);
  if (idx === -1) return t.slice(0, 180);
  return t.slice(0, idx + 1).trim();
}
