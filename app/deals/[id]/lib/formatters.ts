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

/**
 * Parse a currency string from CIM/deal (e.g. "$495k", "8M", "412,000") to a number in full dollars.
 */
export function parseCurrencyToNumber(
  v: string | number | null | undefined
): number {
  if (v == null) return 0;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim().toLowerCase();
  const numPart = s.replace(/[^0-9.]/g, '');
  const num = parseFloat(numPart) || 0;
  if (s.endsWith('m') || s.includes('million')) return num * 1_000_000;
  if (s.endsWith('k') || s.includes('thousand')) return num * 1_000;
  return num;
}

/**
 * Format a number as currency for scenario/modeling: show actual magnitude (e.g. $495,000 or $495k or $1.25M).
 */
export function formatCurrencyDisplay(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value).toLocaleString()}`;
  return `$${Math.round(value).toLocaleString()}`;
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
