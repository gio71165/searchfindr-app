import type { MetricRow, MarginRow, ConfidenceSignal } from './types';
import type { FinancialMetrics, DealScoring, CriteriaMatch } from '@/lib/types/deal';

// normalize JSON/string/array/object -> string[]
export function normalizeStringArray(raw: unknown): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((x) => (x == null ? '' : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof raw === 'object' && raw !== null) {
    const rawObj = raw as Record<string, unknown>;
    const maybe =
      rawObj?.items ??
      rawObj?.red_flags ??
      rawObj?.ai_red_flags ??
      rawObj?.flags ??
      null;

    if (maybe != null) return normalizeStringArray(maybe);

    try {
      const vals = Object.values(raw).map((v) => (v == null ? '' : String(v)));
      const cleaned = vals.map((s) => s.trim()).filter(Boolean);
      return cleaned;
    } catch {
      return [];
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];

    // JSON array string?
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('"[') && trimmed.endsWith(']"'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeStringArray(parsed);
      } catch {
        // fall through
      }
    }

    // Newlines / bullets / numbered lists
    return trimmed
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
      .filter(Boolean);
  }

  const asString = String(raw).trim();
  return asString ? [asString] : [];
}

export function normalizeRedFlags(raw: unknown): string[] {
  return normalizeStringArray(raw);
}

export function normalizeMetricRows(raw: unknown): MetricRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: unknown) => {
      const row = r as Record<string, unknown>;
      return {
        year: typeof row?.year === 'string' ? row.year : String(row?.year ?? '').trim(),
        value:
          typeof row?.value === 'number'
            ? row.value
            : row?.value === null
            ? null
            : Number.isFinite(Number(row?.value))
            ? Number(row?.value)
            : null,
        unit: typeof row?.unit === 'string' ? row.unit : null,
        note: typeof row?.note === 'string' ? row.note : null,
      };
    })
    .filter((r) => Boolean(r.year))
    .slice(0, 30);
}

export function normalizeMarginRows(raw: unknown): MarginRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: unknown) => {
      const row = r as Record<string, unknown>;
      return {
        type: typeof row?.type === 'string' ? row.type : null,
        year: typeof row?.year === 'string' ? row.year : String(row?.year ?? '').trim(),
        value_pct:
          typeof row?.value_pct === 'number'
            ? row.value_pct
            : row?.value_pct === null
            ? null
            : Number.isFinite(Number(row?.value_pct))
            ? Number(row?.value_pct)
            : null,
        note: typeof row?.note === 'string' ? row.note : null,
      };
    })
    .filter((r) => Boolean(r.year))
    .slice(0, 60);
}

export function parseSignalLine(line: string): ConfidenceSignal | null {
  const s = (line || '').trim();
  if (!s) return null;

  const idx = s.indexOf(':');
  if (idx > 0 && idx < s.length - 1) {
    const label = s.slice(0, idx).trim();
    const value = s.slice(idx + 1).trim();
    if (label && value) return { label, value };
  }

  const dash = s.split(/\s—\s|\s-\s/);
  if (dash.length >= 2) {
    const label = dash[0].trim();
    const value = dash.slice(1).join(' - ').trim();
    if (label && value) return { label, value };
  }

  return { label: 'Signal', value: s };
}

export function normalizeConfidenceSignals(raw: unknown): ConfidenceSignal[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    const out: ConfidenceSignal[] = [];
    for (const item of raw) {
      if (item && typeof item === 'object') {
        const itemObj = item as Record<string, unknown>;
        const label = String(itemObj.label ?? '').trim();
        const value = String(itemObj.value ?? '').trim();
        if (label && value) out.push({ label, value });
        continue;
      }
      const parsed = parseSignalLine(String(item ?? ''));
      if (parsed) out.push(parsed);
    }
    return out.slice(0, 12);
  }

  const bullets = normalizeStringArray(raw);
  return bullets.map((b) => parseSignalLine(b)).filter(Boolean).slice(0, 12) as ConfidenceSignal[];
}
