import type { MetricRow, MarginRow, ConfidenceSignal } from './types';

// normalize JSON/string/array/object -> string[]
export function normalizeStringArray(raw: any): string[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((x) => (x == null ? '' : String(x)))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof raw === 'object') {
    const maybe =
      (raw as any)?.items ??
      (raw as any)?.red_flags ??
      (raw as any)?.ai_red_flags ??
      (raw as any)?.flags ??
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

export function normalizeRedFlags(raw: any): string[] {
  return normalizeStringArray(raw);
}

export function normalizeMetricRows(raw: any): MetricRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      year: typeof r?.year === 'string' ? r.year : String(r?.year ?? '').trim(),
      value:
        typeof r?.value === 'number'
          ? r.value
          : r?.value === null
          ? null
          : Number.isFinite(Number(r?.value))
          ? Number(r?.value)
          : null,
      unit: typeof r?.unit === 'string' ? r.unit : null,
      note: typeof r?.note === 'string' ? r.note : null,
    }))
    .filter((r) => Boolean(r.year))
    .slice(0, 30);
}

export function normalizeMarginRows(raw: any): MarginRow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r: any) => ({
      type: typeof r?.type === 'string' ? r.type : null,
      year: typeof r?.year === 'string' ? r.year : String(r?.year ?? '').trim(),
      value_pct:
        typeof r?.value_pct === 'number'
          ? r.value_pct
          : r?.value_pct === null
          ? null
          : Number.isFinite(Number(r?.value_pct))
          ? Number(r?.value_pct)
          : null,
      note: typeof r?.note === 'string' ? r.note : null,
    }))
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

export function normalizeConfidenceSignals(raw: any): ConfidenceSignal[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    const out: ConfidenceSignal[] = [];
    for (const item of raw) {
      if (item && typeof item === 'object') {
        const label = String((item as any).label ?? '').trim();
        const value = String((item as any).value ?? '').trim();
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
