/**
 * Seed data for industry benchmarks
 * These are initial values that can be updated as more data is collected
 */

export interface IndustryBenchmarkSeed {
  industry: string;
  naics_code?: string;
  revenue_median?: number;
  revenue_p25?: number;
  revenue_p75?: number;
  ebitda_margin_median?: number;
  ebitda_margin_p25?: number;
  ebitda_margin_p75?: number;
  valuation_multiple_median?: number;
  valuation_multiple_p25?: number;
  valuation_multiple_p75?: number;
  typical_deal_size_min?: number;
  typical_deal_size_max?: number;
  sba_commonality?: number;
  key_risks?: string[];
  key_value_drivers?: string[];
  data_source?: string;
}

export const INDUSTRY_BENCHMARKS_SEED: IndustryBenchmarkSeed[] = [
  {
    industry: 'Healthcare Services',
    naics_code: '621',
    revenue_median: 2000000,
    revenue_p25: 1200000,
    revenue_p75: 3500000,
    ebitda_margin_median: 18,
    ebitda_margin_p25: 12,
    ebitda_margin_p75: 25,
    valuation_multiple_median: 4.5,
    valuation_multiple_p25: 3.5,
    valuation_multiple_p75: 6.0,
    typical_deal_size_min: 500000,
    typical_deal_size_max: 5000000,
    sba_commonality: 75,
    key_risks: [
      'Regulatory changes',
      'Reimbursement rate compression',
      'Provider concentration',
      'Licensing requirements',
    ],
    key_value_drivers: [
      'Recurring patient base',
      'Insurance diversification',
      'Multiple locations',
      'Strong referral network',
    ],
    data_source: 'Industry research and transaction data',
  },
  {
    industry: 'Professional Services',
    naics_code: '541',
    revenue_median: 1500000,
    revenue_p25: 800000,
    revenue_p75: 3000000,
    ebitda_margin_median: 25,
    ebitda_margin_p25: 18,
    ebitda_margin_p75: 35,
    valuation_multiple_median: 3.5,
    valuation_multiple_p25: 2.5,
    valuation_multiple_p75: 5.0,
    typical_deal_size_min: 300000,
    typical_deal_size_max: 4000000,
    sba_commonality: 60,
    key_risks: [
      'Key person dependency',
      'Client concentration',
      'Competitive pressure',
      'Service commoditization',
    ],
    key_value_drivers: [
      'Recurring contracts',
      'Proprietary methodology',
      'Brand recognition',
      'Long-term client relationships',
    ],
    data_source: 'Industry research and transaction data',
  },
  {
    industry: 'HVAC',
    naics_code: '238220',
    revenue_median: 2500000,
    revenue_p25: 1500000,
    revenue_p75: 4500000,
    ebitda_margin_median: 20,
    ebitda_margin_p25: 15,
    ebitda_margin_p75: 28,
    valuation_multiple_median: 5.0,
    valuation_multiple_p25: 4.0,
    valuation_multiple_p75: 6.5,
    typical_deal_size_min: 500000,
    typical_deal_size_max: 6000000,
    sba_commonality: 70,
    key_risks: [
      'Seasonal revenue fluctuations',
      'Technician retention',
      'Equipment dependency',
      'Weather sensitivity',
    ],
    key_value_drivers: [
      'Service contract retention',
      'Technician utilization',
      'Emergency service mix',
      'Commercial vs residential balance',
    ],
    data_source: 'Industry research and transaction data',
  },
  {
    industry: 'Plumbing',
    naics_code: '238220',
    revenue_median: 2200000,
    revenue_p25: 1300000,
    revenue_p75: 4000000,
    ebitda_margin_median: 22,
    ebitda_margin_p25: 16,
    ebitda_margin_p75: 30,
    valuation_multiple_median: 5.5,
    valuation_multiple_p25: 4.5,
    valuation_multiple_p75: 7.0,
    typical_deal_size_min: 600000,
    typical_deal_size_max: 7000000,
    sba_commonality: 65,
    key_risks: [
      'Emergency call dependency',
      'Technician skill level',
      'Parts inventory management',
      'Competition from big box stores',
    ],
    key_value_drivers: [
      'Emergency call ratio',
      'Commercial vs residential mix',
      'Recurring maintenance contracts',
      'Geographic coverage',
    ],
    data_source: 'Industry research and transaction data',
  },
  {
    industry: 'Electrical Services',
    naics_code: '238210',
    revenue_median: 1800000,
    revenue_p25: 1000000,
    revenue_p75: 3200000,
    ebitda_margin_median: 19,
    ebitda_margin_p25: 14,
    ebitda_margin_p75: 26,
    valuation_multiple_median: 4.5,
    valuation_multiple_p25: 3.5,
    valuation_multiple_p75: 6.0,
    typical_deal_size_min: 400000,
    typical_deal_size_max: 5000000,
    sba_commonality: 68,
    key_risks: [
      'Licensing requirements',
      'Safety regulations',
      'Project-based revenue',
      'Material cost volatility',
    ],
    key_value_drivers: [
      'Repeat customer rate',
      'Project backlog',
      'Commercial focus',
      'Licensed technician count',
    ],
    data_source: 'Industry research and transaction data',
  },
  {
    industry: 'Manufacturing',
    naics_code: '31-33',
    revenue_median: 5000000,
    revenue_p25: 2500000,
    revenue_p75: 10000000,
    ebitda_margin_median: 15,
    ebitda_margin_p25: 10,
    ebitda_margin_p75: 22,
    valuation_multiple_median: 4.0,
    valuation_multiple_p25: 3.0,
    valuation_multiple_p75: 5.5,
    typical_deal_size_min: 1000000,
    typical_deal_size_max: 15000000,
    sba_commonality: 40,
    key_risks: [
      'Customer concentration',
      'Raw material price volatility',
      'Equipment maintenance',
      'Labor costs',
    ],
    key_value_drivers: [
      'Diversified customer base',
      'Proprietary processes',
      'Long-term contracts',
      'Equipment condition',
    ],
    data_source: 'Industry research and transaction data',
  },
  {
    industry: 'Distribution',
    naics_code: '42',
    revenue_median: 8000000,
    revenue_p25: 4000000,
    revenue_p75: 15000000,
    ebitda_margin_median: 8,
    ebitda_margin_p25: 5,
    ebitda_margin_p75: 12,
    valuation_multiple_median: 3.5,
    valuation_multiple_p25: 2.5,
    valuation_multiple_p75: 5.0,
    typical_deal_size_min: 2000000,
    typical_deal_size_max: 20000000,
    sba_commonality: 30,
    key_risks: [
      'Inventory management',
      'Supplier concentration',
      'Low margins',
      'Working capital requirements',
    ],
    key_value_drivers: [
      'Exclusive distribution rights',
      'Diversified supplier base',
      'Efficient logistics',
      'Value-added services',
    ],
    data_source: 'Industry research and transaction data',
  },
  {
    industry: 'Business Services',
    naics_code: '561',
    revenue_median: 1200000,
    revenue_p25: 600000,
    revenue_p75: 2500000,
    ebitda_margin_median: 22,
    ebitda_margin_p25: 15,
    ebitda_margin_p75: 30,
    valuation_multiple_median: 3.8,
    valuation_multiple_p25: 2.8,
    valuation_multiple_p75: 5.2,
    typical_deal_size_min: 300000,
    typical_deal_size_max: 3500000,
    sba_commonality: 65,
    key_risks: [
      'Client concentration',
      'Service commoditization',
      'Employee turnover',
      'Technology disruption',
    ],
    key_value_drivers: [
      'Recurring revenue model',
      'Long-term contracts',
      'Scalable processes',
      'Strong client relationships',
    ],
    data_source: 'Industry research and transaction data',
  },
];
