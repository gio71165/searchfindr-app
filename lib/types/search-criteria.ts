export interface SearchCriteria {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  
  // Geography
  states: string[] | null;
  exclude_states: string[] | null;
  max_distance_from_home: number | null;
  
  // Financials
  revenue_min: number | null;
  revenue_max: number | null;
  ebitda_min: number | null;
  ebitda_max: number | null;
  margin_min: number | null; // percentage
  
  // Deal
  asking_price_max: number | null;
  multiple_max: number | null;
  sba_eligible_only: boolean;
  
  // Business
  industries: string[] | null;
  exclude_industries: string[] | null;
  b2b_only: boolean;
  recurring_revenue_min: number | null; // percentage
  customer_concentration_max: number | null; // percentage
  
  // Owner
  owner_willing_to_stay: boolean | null;
  max_owner_dependence: 'low' | 'medium' | 'high' | null;
  
  created_at: string;
  updated_at: string;
}

export interface CreateSearchCriteriaData {
  name: string;
  description?: string | null;
  is_active?: boolean;
  states?: string[] | null;
  exclude_states?: string[] | null;
  max_distance_from_home?: number | null;
  revenue_min?: number | null;
  revenue_max?: number | null;
  ebitda_min?: number | null;
  ebitda_max?: number | null;
  margin_min?: number | null;
  asking_price_max?: number | null;
  multiple_max?: number | null;
  sba_eligible_only?: boolean;
  industries?: string[] | null;
  exclude_industries?: string[] | null;
  b2b_only?: boolean;
  recurring_revenue_min?: number | null;
  customer_concentration_max?: number | null;
  owner_willing_to_stay?: boolean | null;
  max_owner_dependence?: 'low' | 'medium' | 'high' | null;
}
