/**
 * Industry Benchmarks for SMB Acquisitions
 * Used to compare deal metrics against typical industry standards
 * Now uses database-backed benchmarks with fallback to legacy data
 */

import { createClient } from '@/lib/supabase/server';

export type IndustryBenchmark = {
  id?: string;
  industry: string;
  naics_code?: string | null;
  revenue_p25?: number | null;
  revenue_median?: number | null;
  revenue_p75?: number | null;
  ebitda_margin_p25?: number | null;
  ebitda_margin_median?: number | null;
  ebitda_margin_p75?: number | null;
  valuation_multiple_p25?: number | null;
  valuation_multiple_median?: number | null;
  valuation_multiple_p75?: number | null;
  typical_deal_size_min?: number | null;
  typical_deal_size_max?: number | null;
  sba_commonality?: number | null;
  key_risks?: string[] | null;
  key_value_drivers?: string[] | null;
  data_source?: string | null;
};

// Legacy fallback data (for backward compatibility)
const LEGACY_BENCHMARKS: Record<string, {
  typical_multiple_min: number;
  typical_multiple_max: number;
  typical_margin_min: number;
  typical_margin_max: number;
  typical_growth: number;
  key_metrics: string[];
}> = {
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

// Legacy type for backward compatibility
export type LegacyBenchmark = {
  typical_multiple_min: number;
  typical_multiple_max: number;
  typical_margin_min: number;
  typical_margin_max: number;
  typical_growth: number;
  key_metrics: string[];
};

/**
 * Gets benchmark from database (async)
 */
export async function getBenchmarkFromDB(
  industry: string | null | undefined
): Promise<IndustryBenchmark | null> {
  if (!industry) return null;
  
  const supabase = await createClient();
  
  // Try exact match first
  const { data: exact } = await supabase
    .from('industry_benchmarks')
    .select('*')
    .eq('industry', industry)
    .maybeSingle();
  
  if (exact) return exact;
  
  // Try case-insensitive match
  const { data: caseInsensitive } = await supabase
    .from('industry_benchmarks')
    .select('*')
    .ilike('industry', industry)
    .maybeSingle();
  
  return caseInsensitive;
}

/**
 * Gets benchmark comparison for a deal
 * @param industry - Industry name (case-insensitive)
 * @param revenue - Annual revenue (optional)
 * @param ebitda - Annual EBITDA (optional)
 * @returns Benchmark comparison with notes
 */
export async function getBenchmarkForDeal(
  industry: string | null | undefined,
  revenue?: number | null,
  ebitda?: number | null
): Promise<BenchmarkComparison> {
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

  // Try to get from database first
  const dbBenchmark = await getBenchmarkFromDB(industry);
  
  // Fallback to legacy data if not in database
  const industryKey = dbBenchmark 
    ? dbBenchmark.industry
    : Object.keys(LEGACY_BENCHMARKS).find(
        (key) => key.toLowerCase() === industry.toLowerCase()
      );

  if (!dbBenchmark && !industryKey) {
    return {
      industry: industry,
      benchmark: null,
      revenue_comparison: "unknown",
      margin_comparison: "unknown",
      multiple_range: null,
      notes: [`No benchmark data available for industry: ${industry}`],
    };
  }

  const notes: string[] = [];
  let revenue_comparison: "below" | "typical" | "above" | "unknown" = "unknown";
  let margin_comparison: "below" | "typical" | "above" | "unknown" = "unknown";
  let multiple_range: { min: number; max: number } | null = null;

  if (dbBenchmark) {
    // Use database benchmark
    if (revenue && ebitda && revenue > 0 && dbBenchmark.ebitda_margin_median) {
      const margin = (ebitda / revenue) * 100;
      if (dbBenchmark.ebitda_margin_p25 && margin < dbBenchmark.ebitda_margin_p25) {
        margin_comparison = "below";
        notes.push(`EBITDA margin (${margin.toFixed(1)}%) is below 25th percentile (${dbBenchmark.ebitda_margin_p25}%)`);
      } else if (dbBenchmark.ebitda_margin_p75 && margin > dbBenchmark.ebitda_margin_p75) {
        margin_comparison = "above";
        notes.push(`EBITDA margin (${margin.toFixed(1)}%) is above 75th percentile (${dbBenchmark.ebitda_margin_p75}%)`);
      } else {
        margin_comparison = "typical";
        notes.push(`EBITDA margin (${margin.toFixed(1)}%) is near industry median (${dbBenchmark.ebitda_margin_median}%)`);
      }
    }

    if (dbBenchmark.valuation_multiple_p25 && dbBenchmark.valuation_multiple_p75) {
      multiple_range = {
        min: dbBenchmark.valuation_multiple_p25,
        max: dbBenchmark.valuation_multiple_p75,
      };
    }

    if (revenue && dbBenchmark.revenue_median) {
      notes.push(`Revenue: $${(revenue / 1000000).toFixed(1)}M (Industry median: $${(dbBenchmark.revenue_median / 1000000).toFixed(1)}M)`);
    }
  } else if (industryKey) {
    // Use legacy benchmark
    const benchmark = LEGACY_BENCHMARKS[industryKey];
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
    multiple_range = {
      min: benchmark.typical_multiple_min,
      max: benchmark.typical_multiple_max,
    };
    if (revenue) {
      notes.push(`Revenue: $${(revenue / 1000000).toFixed(1)}M`);
    }
  }

  return {
    industry: dbBenchmark?.industry || industryKey || industry,
    benchmark: dbBenchmark || null,
    revenue_comparison,
    margin_comparison,
    multiple_range,
    notes,
  };
}
