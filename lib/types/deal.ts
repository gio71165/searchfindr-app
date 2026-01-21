/**
 * Deal-related TypeScript interfaces and types
 * This file defines all types used across the deal/company data structures
 */

/**
 * Source type for deals
 */
export type DealSourceType = 'on_market' | 'off_market' | 'cim_pdf' | 'financials';

/**
 * Final tier classification
 */
export type DealTier = 'A' | 'B' | 'C';

/**
 * Data confidence level (tier-based: A = high, B = medium, C = low)
 */
export type DataConfidence = 'A' | 'B' | 'C';

/**
 * Risk/Score level
 */
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Unknown';

/**
 * Financial metric entry
 */
export interface FinancialMetricEntry {
  year: string;
  value: number | null;
  unit: string;
  note: string;
}

/**
 * Margin entry
 */
export interface MarginEntry {
  type: string;
  year: string;
  value_pct: number | null;
  note: string;
}

/**
 * Financial table row structure
 */
export interface FinancialTableRow {
  account_name: string;
  account_category: string | null;
  values_by_year: Record<string, number | null>;
  unit: string;
  notes: string | null;
}

/**
 * Financial table structure
 */
export interface FinancialTable {
  table_name: string;
  table_type: 'income_statement' | 'balance_sheet' | 'cash_flow' | 'other';
  years: string[];
  rows: FinancialTableRow[];
}

/**
 * Financial metrics structure
 */
export interface FinancialMetrics {
  revenue?: FinancialMetricEntry[];
  ebitda?: FinancialMetricEntry[];
  net_income?: FinancialMetricEntry[];
  margins?: MarginEntry[];
  yoy_trends?: string[];
  revenue_band_est?: string;
  ebitda_band_est?: string;
  pricing_power?: string;
  customer_concentration_risk?: string;
  seasonality_risk?: string;
  evidence?: string[];
  customer_concentration?: string;
  margin?: string;
  financial_tables?: FinancialTable[];
  qoe_red_flags?: QoeRedFlag[];
  industry_benchmark?: Record<string, unknown>;
  owner_interview_questions?: OwnerInterviewQuestion[];
}

/**
 * Quality of Earnings (QoE) red flag
 */
export interface QoeRedFlag {
  type: 'customer_concentration' | 'revenue_spike' | 'revenue_drop' | 'one_time_revenue' | 'working_capital' | 'addbacks' | 'inventory';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

/**
 * Owner interview question
 */
export interface OwnerInterviewQuestion {
  category: string;
  question: string;
}

/**
 * Confidence signal
 */
export interface ConfidenceSignal {
  label: string;
  value: string;
}

/**
 * Confidence JSON structure
 */
export interface ConfidenceJson {
  level: 'A' | 'B' | 'C';
  icon?: '⚠️' | '◑' | '●';
  label?: string;
  summary?: string;
  reason?: string;
  bullets?: string[];
  signals?: ConfidenceSignal[];
  source?: string;
  updated_at?: string;
}

/**
 * Scoring structure
 */
export interface DealScoring {
  succession_risk?: RiskLevel;
  succession_risk_reason?: string;
  industry_fit?: RiskLevel;
  industry_fit_reason?: string;
  geography_fit?: RiskLevel;
  geography_fit_reason?: string;
  operational_quality_signal?: RiskLevel;
  data_confidence?: DataConfidence;
  data_confidence_reason?: string;
  final_tier?: DealTier;
  final_tier_reason?: string;
  tier_basis?: string;
  overall_score_0_100?: number; // Deprecated: kept for backward compatibility, not used in UI
}

/**
 * Business model structure
 */
export interface BusinessModel {
  services?: string[];
  customer_types?: string[];
  delivery_model?: string;
  recurring_revenue_signals?: string[];
  differentiators?: string[];
  evidence?: string[];
}

/**
 * Owner profile structure
 */
export interface OwnerProfile {
  known?: boolean;
  owner_names?: string[];
  ownership_type?: 'Unknown' | 'Owner-operated' | 'Family-owned' | 'Partnership' | 'Other';
  evidence?: string[];
  assumptions?: string[];
}

/**
 * Notes for searcher structure
 */
export interface NotesForSearcher {
  what_to_verify_first?: string[];
  questions_to_ask_owner?: string[];
  deal_angle?: string[];
  notes_for_searcher?: string;
}

/**
 * Criteria match structure
 */
export interface CriteriaMatch {
  deal_size?: string;
  business_model?: string;
  owner_profile?: string;
  notes_for_searcher?: string;
  source_inputs?: Record<string, unknown>;
  // Verdict fields (may be stored here or as separate columns)
  verdict?: string;
  verdict_confidence?: string;
  primary_reason?: string;
  recommended_next_action?: string;
  // Economics fields
  asking_price?: string;
  asking_price_confidence?: string;
  ebitda_ttm?: string;
  sba_eligible?: boolean;
}

/**
 * Deal Analysis (AI analysis output)
 */
export interface DealAnalysis {
  summary: string;
  financials: FinancialMetrics;
  risks: string[];
  opportunities?: string[];
  recommendation?: string;
  confidence_score?: number; // Deprecated: kept for backward compatibility, not used in UI
  ai_summary?: string;
  ai_red_flags?: string | string[];
  scoring?: DealScoring;
  criteria_match?: CriteriaMatch;
  business_model?: BusinessModel;
  owner_profile?: OwnerProfile;
  notes_for_searcher?: NotesForSearcher;
}

/**
 * Main Deal interface (companies table)
 */
export interface Deal {
  id: string;
  workspace_id: string;
  company_name: string | null;
  source_type: DealSourceType | null;
  listing_url: string | null;
  external_id: string | null;
  external_source: string | null;
  location_city: string | null;
  location_state: string | null;
  industry: string | null;
  score: number | null;
  final_tier: DealTier | null;
  is_saved: boolean;
  ai_summary: string | null;
  ai_red_flags: string | null;
  ai_financials_json: FinancialMetrics | null;
  ai_scoring_json: DealScoring | null;
  criteria_match_json: CriteriaMatch | null;
  ai_confidence_json: ConfidenceJson | null;
  raw_listing_text: string | null;
  cim_storage_path: string | null;
  financials_storage_path: string | null;
  financials_filename: string | null;
  financials_mime: string | null;
  website: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  passed_at: string | null;
  // Verdict and analysis fields
  verdict?: string | null;
  verdict_confidence?: string | null;
  verdict_reason?: string | null;
  next_action?: string | null;
  // Deal economics
  asking_price_extracted?: string | null;
  ebitda_ttm_extracted?: string | null;
  sba_eligible?: boolean | null;
  // Stage tracking
  stage?: string | null;
  last_action_at?: string | null;
  // Reminder fields
  next_action_date?: string | null;
  reminded_at?: string | null;
  // Archive field
  archived_at?: string | null;
  // Pipeline date tracking
  ioi_date?: string | null;
  loi_date?: string | null;
  expected_close_date?: string | null;
  deal_value?: number | null;
  // User notes and tags
  user_notes?: string | null;
  tags?: string[] | null;
  // Broker relationship
  broker_id?: string | null;
}

/**
 * Company interface (alias for Deal, used in some contexts)
 */
export interface Company extends Deal {}

/**
 * Financial Analysis (financial_analyses table)
 */
export interface FinancialAnalysis {
  id?: string;
  user_id?: string;
  workspace_id?: string;
  deal_id: string;
  source_filename?: string;
  overall_confidence: string;
  extracted_metrics?: FinancialMetrics;
  red_flags: string[];
  green_flags: string[];
  missing_items: string[];
  diligence_notes: string[];
  qoe_red_flags?: QoeRedFlag[];
  confidence_json?: ConfidenceJson;
  created_at?: string;
  updated_at?: string;
}

/**
 * Chat message role
 */
export type ChatRole = 'user' | 'assistant' | 'system';

/**
 * Deal Chat Message
 */
export interface DealChatMessage {
  id?: string;
  workspace_id: string;
  deal_id: string;
  user_id: string;
  role: ChatRole;
  content: string;
  meta?: {
    sources_used?: string[];
    model?: string;
    tokens?: number;
    latency_ms?: number;
    [key: string]: unknown;
  };
  created_at?: string;
}

/**
 * Deal Activity (deal_activities table)
 */
export interface DealActivity {
  id?: string;
  workspace_id: string;
  deal_id: string;
  user_id: string;
  activity_type: string;
  description: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  company_name?: string; // Optional: populated when joining with companies table
}
