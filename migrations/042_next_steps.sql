-- Next steps checklist: AI-generated, deal-specific actions (red flags, addbacks, missing data, etc.)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS next_steps JSONB;

COMMENT ON COLUMN companies.next_steps IS 'Generated next steps: { generated_at: string (ISO), steps: [{ id, title, description, priority, completed, completed_at }] }';
