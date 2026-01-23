# SearchFindr AI Prompts Documentation

## Overview

This directory contains all AI prompts used throughout SearchFindr. All prompts have been optimized to A+ quality with search fund expertise, SMB M&A best practices, and professional-grade outputs.

**Last Review Date:** January 23, 2026

## Quality Standards

All prompts meet the following A+ criteria:

### 1. Role Definition (Mandatory)
- ✅ "You are an experienced search fund operator with 15+ years in small business M&A"
- ✅ "You specialize in analyzing businesses with $1M-$10M EBITDA"
- ✅ "You have closed 50+ deals and know exactly what red flags to look for"

### 2. Context Specificity
- ✅ Mention search fund context (not PE, not VC)
- ✅ Reference SBA 7(a) loan requirements when relevant
- ✅ Use search fund terminology: LOI, IOI, QoE, deal fatigue, broker relationships
- ✅ Reference typical deal sizes ($2M-$10M purchase price)

### 3. Output Quality Requirements
- ✅ Specify output format (bullet points, paragraphs, sections)
- ✅ Require specific, actionable insights (not generic advice)
- ✅ Request quantification where possible (percentages, dollar amounts)
- ✅ Demand evidence-based reasoning (cite specific data from CIM)

### 4. Skepticism & Rigor
- ✅ Prompts instruct AI to be skeptical of seller claims
- ✅ Treat CIM as a sales document, not objective truth
- ✅ Look for what's NOT said (omissions are red flags)
- ✅ Question aggressive assumptions (revenue projections, addbacks, etc.)

### 5. SMB M&A Best Practices
- ✅ Reference industry-standard metrics (3-5x EBITDA multiples)
- ✅ Know common seller tricks (customer concentration, family payroll, aggressive addbacks)
- ✅ Understand search fund economics (need cash flow for debt service)
- ✅ Recognize SBA eligibility criteria (size standards, real estate, passive income limits)

### 6. Tone & Language
- ✅ Professional but direct
- ✅ No fluff or platitudes
- ✅ Concise but comprehensive
- ✅ Use industry terminology correctly

## Prompt Files

### 1. CIM Analysis (`cim-analysis.ts`)

**Purpose:** Analyze CIM PDFs for search fund buyers

**Key Features:**
- Forensic, skeptical analysis approach
- QoE (Quality of Earnings) analysis with addback classification
- SBA 7(a) eligibility assessment with 2026 rules
- Common seller tricks detection
- Specific, actionable due diligence checklist
- Search fund deal economics context

**Output Schema:**
- `deal_verdict`: One-sentence IC headline
- `ai_summary`: 2-3 paragraph narrative
- `ai_red_flags`: 3-10 specific red flags
- `qoe`: Normalized EBITDA analysis with addback classification
- `decision_framework`: PROCEED/PARK/PASS recommendation
- `deal_economics`: SBA eligibility, multiples, deal size

**Version:** v2.0 (updated 2026-01-23)

**Testing:**
- Test with sample CIM data from `/lib/sample-data/`
- Verify outputs are specific, quantified, and actionable
- Ensure SBA eligibility assessment uses 2026 rules

---

### 2. Financials Analysis (`financials-analysis.ts`)

**Purpose:** Analyze financial statements (PDF, CSV, XLSX) with QoE focus

**Key Features:**
- Document type recognition (P&L, Balance Sheet, Tax Return, Trial Balance)
- QoE red flag detection (customer concentration, revenue volatility, addbacks)
- Working capital trend analysis
- SBA 7(a) eligibility assessment
- Search fund financing constraints

**Output Schema:**
- `document_type`: Type of financial document
- `qoe_red_flags`: Array of QoE issues with severity
- `working_capital_trend`: Current ratio, trend, concerns
- `decision_framework`: PROCEED/PARK/PASS with valuation impact
- `deal_economics`: SBA eligibility, multiples

**Version:** v2.0 (updated 2026-01-23)

**Testing:**
- Test with various document types
- Verify QoE red flags are quantified
- Ensure SBA eligibility uses 2026 rules

---

### 3. Deal Chat (`deal-chat.ts`)

**Purpose:** AI-powered chat assistant on deal pages for context-aware Q&A

**Key Features:**
- Deal-locked responses (only uses provided context)
- Search fund valuation guidance
- SBA financing constraints
- Specific, actionable answers with citations

**Output:**
- Concise, practical answers
- Bullet points when helpful
- "Next checks" section
- References to specific deal data

**Version:** v2.0 (updated 2026-01-23)

**Testing:**
- Test with various deal types (CIM, on-market, off-market, financials)
- Verify responses are deal-specific, not generic
- Ensure valuation guidance references search fund context

---

### 4. Off-Market Diligence (`off-market-diligence.ts`)

**Purpose:** Initial diligence on off-market companies using website + Google listing data

**Key Features:**
- Evidence-based tiering (no A tier if owner unknown)
- Industry-specific signal detection (HVAC, professional services, manufacturing)
- Outreach priority assessment
- SBA eligibility preliminary assessment

**Output Schema:**
- `business_model`: Services, customer types, recurring revenue signals
- `owner_profile`: Known/unknown, ownership type, evidence
- `decision_framework`: PROCEED/PARK/PASS with outreach guidance
- `deal_economics`: SBA eligibility preliminary assessment

**Version:** v2.0 (updated 2026-01-23)

**Testing:**
- Test with various industries
- Verify tiering is evidence-based
- Ensure owner unknown caps tier at B

---

## Inline Prompts (API Routes)

### 5. Analyze Deal (`app/api/analyze-deal/route.ts`)

**Purpose:** Analyze on-market listing text

**Key Features:**
- Search fund context
- SBA 7(a) eligibility assessment
- Decision framework

**Version:** Updated 2026-01-23

---

### 6. Capture Deal (`app/api/capture-deal/route.ts`)

**Purpose:** Quick analysis of captured deal from extension

**Key Features:**
- Search fund context
- Strict A/B/C tiering
- Data confidence assessment

**Version:** Updated 2026-01-23

---

### 7. Off-Market Search (`app/api/off-market/search/route.ts`)

**Purpose:** AI screening of off-market candidates from Google Places

**Key Features:**
- Search fund fit assessment
- Tier assignment (A/B/C)
- Keep/reject decision

**Version:** Updated 2026-01-23

---

## SBA 7(a) Rules Reference (2026)

All prompts that assess SBA eligibility use these current rules:

- **Max loan:** $5M
- **Max SBA guarantee:** 85% up to $150K, 75% above $150K
- **Guarantee fee:** 2-3.75% based on loan size
- **Manufacturing fee waiver:** $0 fee for NAICS 31-33 up to $950K until Sept 30, 2026
- **Minimum DSCR:** 1.15x (lenders prefer 1.25x+)
- **Minimum equity:** 10% (lenders prefer 15%+ for deals >$1M)
- **Customer concentration:** >50% from single customer = likely ineligible
- **Passive income:** <50% of revenue from passive sources
- **Real estate:** <51% of loan proceeds for real estate
- **US ownership:** 100% US citizens or permanent residents required

## Common Seller Tricks (Detected by Prompts)

1. **Family payroll addbacks** - Often not discretionary
2. **Aggressive addbacks** - "One-time" expenses that are recurring
3. **Hidden customer concentration** - Claims of "no customer >20%" without proof
4. **Real estate not included** - Facility mentioned but ownership unclear
5. **Deferred maintenance** - Equipment/facility needs not mentioned
6. **AR aging issues** - Revenue shown but no AR detail
7. **Inventory obsolescence** - No inventory valuation detail
8. **Aggressive growth assumptions** - 20%+ growth with no evidence
9. **Owner salary normalization** - Addback without market rate comparison
10. **Pro forma synergies** - Cost savings not yet realized

## Search Fund Deal Economics

Typical search fund deal structure:
- **Purchase price:** 3-5x normalized EBITDA (varies by industry, quality, growth)
- **Financing:** 70-80% SBA 7(a) debt, 10-20% seller note, 10-20% equity
- **Seller note:** Typically 5-7% interest, 5-year term, 2-year standby period
- **Working capital:** Typically normalized to historical average (peg mechanism)
- **Earnout:** Common for growth businesses (20-30% of purchase price)

Typical multiples by industry (for reference):
- Service businesses: 3-5x EBITDA
- Manufacturing: 4-6x EBITDA
- Distribution: 3-4x EBITDA
- Professional services: 2-4x revenue (if margins >15%)
- SaaS/Software: 3-6x revenue (if recurring revenue >80%)

## Testing Procedure

When updating prompts:

1. **Test with sample data:**
   - Use existing sample CIM data from `/lib/sample-data/`
   - Compare old output vs new output
   - Verify new output is more specific, actionable, search fund relevant

2. **Check for consistency:**
   - All prompts use same role definition
   - All prompts reference search fund context
   - Tone is consistent across all outputs

3. **Verify technical accuracy:**
   - SBA rules are current (2026)
   - Financial calculations are correct
   - Industry terms are used properly

4. **TypeScript check:**
   ```bash
   npm run type-check
   # OR
   tsc --noEmit
   ```

## Future Improvements

- [ ] Add IOI/LOI generation prompts (currently template-based)
- [ ] Add Gut Check prompt (currently just UI component)
- [ ] Add broker feedback prompt (currently template-based)
- [ ] Add interview questions generation prompt (currently in CIM analysis)
- [ ] Add deal comparison prompt (currently just data matching)

## Maintenance

- **Review frequency:** Quarterly or when SBA rules change
- **Version tracking:** Update version number and description when making changes
- **Change log:** Document significant changes in this README

---

**Last Updated:** January 23, 2026
**Maintained by:** SearchFindr Development Team
