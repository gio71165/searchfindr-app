/**
 * Industry Benchmarks for SMB Acquisitions
 * Used to compare deal metrics against typical industry standards
 */

export type IndustryBenchmark = {
  typical_multiple_min: number;
  typical_multiple_max: number;
  typical_margin_min: number;
  typical_margin_max: number;
  typical_growth: number;
  key_metrics: string[];
};

export const INDUSTRY_BENCHMARKS: Record<string, IndustryBenchmark> = {
  HVAC: {
    typical_multiple_min: 4.0,
    typical_multiple_max: 6.0,
    typical_margin_min: 18,
    typical_margin_max: 25,
    typical_growth: 5,
    key_metrics: ["Service contract retention", "Technician utilization"],
  },
  Plumbing: {
    typical_multiple_min: 5.0,
    typical_multiple_max: 7.0,
    typical_margin_min: 20,
    typical_margin_max: 28,
    typical_growth: 6,
    key_metrics: ["Emergency call ratio", "Commercial vs residential mix"],
  },
  Electrical: {
    typical_multiple_min: 4.5,
    typical_multiple_max: 6.5,
    typical_margin_min: 19,
    typical_margin_max: 26,
    typical_growth: 5,
    key_metrics: ["Repeat customer rate", "Project backlog"],
  },
};

export type BenchmarkComparison = {
  industry: string;
  benchmark: IndustryBenchmark | null;
  revenue_comparison: "below" | "typical" | "above" | "unknown";
  margin_comparison: "below" | "typical" | "above" | "unknown";
  multiple_range: { min: number; max: number } | null;
  notes: string[];
};

/**
 * Gets benchmark comparison for a deal
 * @param industry - Industry name (case-insensitive)
 * @param revenue - Annual revenue (optional)
 * @param ebitda - Annual EBITDA (optional)
 * @returns Benchmark comparison with notes
 */
export function getBenchmarkForDeal(
  industry: string | null | undefined,
  revenue?: number | null,
  ebitda?: number | null
): BenchmarkComparison {
  if (!industry) {
    return {
      industry: "unknown",
      benchmark: null,
      revenue_comparison: "unknown",
      margin_comparison: "unknown",
      multiple_range: null,
      notes: ["Industry not specified"],
    };
  }

  const industryKey = Object.keys(INDUSTRY_BENCHMARKS).find(
    (key) => key.toLowerCase() === industry.toLowerCase()
  );

  if (!industryKey) {
    return {
      industry: industry,
      benchmark: null,
      revenue_comparison: "unknown",
      margin_comparison: "unknown",
      multiple_range: null,
      notes: [`No benchmark data available for industry: ${industry}`],
    };
  }

  const benchmark = INDUSTRY_BENCHMARKS[industryKey];
  const notes: string[] = [];
  let revenue_comparison: "below" | "typical" | "above" | "unknown" = "unknown";
  let margin_comparison: "below" | "typical" | "above" | "unknown" = "unknown";

  // Calculate margin if both revenue and EBITDA provided
  if (revenue && ebitda && revenue > 0) {
    const margin = (ebitda / revenue) * 100;
    if (margin < benchmark.typical_margin_min) {
      margin_comparison = "below";
      notes.push(`EBITDA margin (${margin.toFixed(1)}%) is below typical range (${benchmark.typical_margin_min}-${benchmark.typical_margin_max}%)`);
    } else if (margin > benchmark.typical_margin_max) {
      margin_comparison = "above";
      notes.push(`EBITDA margin (${margin.toFixed(1)}%) is above typical range (${benchmark.typical_margin_min}-${benchmark.typical_margin_max}%)`);
    } else {
      margin_comparison = "typical";
      notes.push(`EBITDA margin (${margin.toFixed(1)}%) is within typical range (${benchmark.typical_margin_min}-${benchmark.typical_margin_max}%)`);
    }
  }

  // Revenue comparison (if provided)
  if (revenue) {
    // For now, just note the revenue - could add size-based comparisons later
    notes.push(`Revenue: $${(revenue / 1000000).toFixed(1)}M`);
  }

  return {
    industry: industryKey,
    benchmark,
    revenue_comparison,
    margin_comparison,
    multiple_range: {
      min: benchmark.typical_multiple_min,
      max: benchmark.typical_multiple_max,
    },
    notes,
  };
}
