-- Add SBA and deal size columns to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS sba_eligible BOOLEAN,
  ADD COLUMN IF NOT EXISTS deal_size_band TEXT CHECK (deal_size_band IN ('sub_1m', '1m_3m', '3m_5m', '5m_plus', null));
