# SearchFindr — Deep-Dive Rundown (for Gemini / onboarding)

**Use this doc to give Gemini (or any AI/team) a full picture of what SearchFindr is, what we offer, what we fix, how we fix it, and what we do.** Deep dependency and product context in one place.

---

## 1. What is SearchFindr?

- **One-liner:** SearchFindr is an AI-powered deal workflow platform for search fund operators and searchers. It reads CIMs (Confidential Information Memorandums) and deal materials so you can know if a deal is worth pursuing in **about 60 seconds** instead of hours.
- **Elevator pitch:** Your **“AI associate”** for small-business M&A. We automate screening, extraction, red flags, and pipeline management so searchers stop wasting 200+ hours on deals that should have been obvious passes. From sourcing → screening → pipeline → analysis—everything in one place. **“Your Search OS.”**
- **Audience:**  
  - **Primary:** Search fund operators and searchers (ETAs, aspiring acquirers) screening lower-middle-market deals (~$1M–$10M EBITDA, ~$5M–$30M purchase price).  
  - **Secondary:** Investors who back searchers and want visibility into multiple searchers’ pipelines and performance (Investor Portfolio).  
  - **Special:** Coalition leaders who run a branded group of searchers and use the Coalition Command Center for drift, benchmarking, and nudges.

---

## 2. What We Fix (the problem)

- Searchers spend **60+ hours a month** (15+ hours/week) reading CIMs; most deals are “dead on arrival” but that’s only clear after deep reading.
- **Opportunity cost:** Example—47 deals reviewed in a quarter, only 3 worth a call → ~88 hours wasted ≈ $22K at $250/hr.
- **Pain points we address:**
  - Manual Excel entry and scattered notes.
  - Red flags buried on page 42 of a 80-page CIM.
  - No clear verdict—just gut feeling.
  - Scattered pipeline and missed follow-ups.
  - Slow sourcing (finding listings manually).
  - No investor-ready output without manual memo writing.
  - We frame the “Searcher’s Grind” as **inefficiency to eliminate**, not a rite of passage.

---

## 3. How We Fix It (our approach)

| Problem | How we fix it |
|--------|----------------|
| **Hours per CIM** | Upload CIM → AI extracts financials, summary, red flags, tier (A/B/C), confidence, QoE red flags in ~60 seconds. |
| **No clear verdict** | Clear **Proceed / Park / Pass** with optional 1-sentence reason; data confidence (A/B/C); red flags and strengths surfaced up front. |
| **Scattered workflow** | One platform: **Dashboard → CIMs / On-Market / Off-Market / Financials / Documents / Brokers / Today**. Stages (New → Reviewing → Follow Up → IOI → LOI → DD → Passed) and bulk actions. |
| **Manual sourcing** | **Chrome extension** captures listings from allowlisted deal sites (BizBuySell, LoopNet, DealStream, Axial, Sunbelt, etc.); server validates URL and domain. |
| **No structure/bankability view** | **Deal structure calculator**, SBA 7(a) scenarios, seller note, earnouts, stress tests (e.g. revenue down 20%). **Scenario comparison** side-by-side. |
| **Investor asks for memos** | **One-click investment memo** (PDF), executive summary, financials, red flags, verdict. **Bulk export** to CSV. |
| **Lost follow-ups** | **Reminders / next-action dates**; **Today** view for what needs attention; **deal activities** timeline. |
| **Investors lack visibility** | **Investor Dashboard**: link searchers by Workspace ID → portfolio metrics, per-searcher performance, pipeline visibility, weekly/monthly reports, optional realtime updates. |
| **Coalition / group accountability** | **Coalition Command Center**: drift detector (no move in 14+ days), cohort benchmarking (CIM→LOI days), market heatmap, red-flag aggregate, leaderboard, broadcast nudge to searchers in “Reviewing.” |

---

## 4. What We Offer (product by area)

### 4.1 Deal intake & analysis

- **CIM upload & analysis**  
  PDF/DOCX CIMs; AI extracts financials, executive summary, red flags, tier (A/B/C), data confidence, quality-of-earnings (QoE) red flags. Usage metered by plan (e.g. 20 or 75 CIMs/month).
- **Financials upload**  
  PDF, CSV, XLSX for financial models (separate from CIM). Supports financial modeling and scenario comparison; metered (e.g. 10 or 50 models/month).
- **Chrome extension**  
  Capture on-market listings from supported deal sites only. Saves to SearchFindr via API key (Bearer); key stored in extension local storage. Server validates URL against allowlist and enforces rate limits.

### 4.2 Pipeline & workflow

- **Pipeline views:** Dashboard, CIMs, On-Market, Off-Market, Financials, Documents, Brokers, Today (attention/reminders).
- **Stages:** New → Reviewing → Follow Up → IOI Sent → LOI → Due Diligence → Passed. Stage playbooks and next actions.
- **Verdicts:** Proceed / Park / Pass. Filter and bulk actions by verdict.
- **Bulk actions:** Select multiple deals → Archive, Pass, Delete, Move stage, Export CSV. Compare (2–3 deals).
- **Reminders & Today:** Set next-action dates; Today view for what needs attention.

### 4.3 Deal-level tools (per deal)

- **AI deal chat** — Ask questions about the deal; AI has deal context and can suggest pipeline actions.
- **IOI generator** — Indication of Interest (usage limits by plan).
- **LOI generator** — Letter of Intent (usage limits by plan).
- **Deal structure calculator** — Scenarios, SBA eligibility, seller note, earnouts, stress tests.
- **Scenario comparison** — Compare financing/structure scenarios side-by-side.
- **Investment memo export** — One-click PDF (executive summary, financials, red flags, verdict).
- **Due diligence tracker & checklist** — Track DD progress and items.
- **Supporting analysis** — Industry benchmarks, working capital, owner interview questions, strengths/risks panels.

### 4.4 Comparison & reporting

- **Deal comparison** — Side-by-side 2–3 deals (metrics, financials, tier, risks/strengths); export CSV. From dashboard (select 2–3) or from deal page (compare with others).
- **Bulk export** — Export selected deals to CSV from dashboard.

### 4.5 For investors (Investor Portfolio)

- **Investor dashboard** — For users with `role = investor`. Multi-searcher tracking, pipeline visibility across **linked searchers** (via Workspace ID), performance views, weekly/monthly reports.
- **Link searcher** — Investor enters searcher’s Workspace ID (from Settings → Profile); optional capital committed, access level (Summary vs Full for company names/financials).
- **Searcher detail** — Per-searcher metrics (deals passed, CIM→IOI rate, pipeline value, red/green flags, conversion rates). Reports: weekly/monthly (single or bulk).
- **Realtime** — Optional updates when searchers add deals or change stages (Supabase Realtime on `companies` and `deal_activities`).
- **Pricing:** Custom; typically 5–10 seats, white-glove onboarding. “Book a Demo.”

### 4.6 Coalition (Command Center)

- **Who:** Users with `is_coalition_leader` or `is_admin` see `/coalition/dashboard`. **Coalition members** are searchers with `is_coalition_member = true` (same app, coalition badge in sidebar).
- **What:** Dashboard scoped **only** to coalition member workspaces:
  - **Drift detector** — Members with no stage move in >14 days.
  - **Cohort benchmarking** — Coalition avg days CIM→LOI; compare one searcher.
  - **Market heatmap** — Top industries in DD.
  - **Red flag aggregate** — Top red-flag phrases this week.
  - **Leaderboard** — Deal flow this month per member.
  - **Broadcast nudge** — Send message to all coalition members who have a deal in “Reviewing.”
- **No investor_searcher_links** — Coalition membership is `profiles.is_coalition_member`; leaders see only those workspaces.

### 4.7 Settings & compliance

- **Profile** — Email, Workspace ID (for investors to link).
- **Search criteria** — Industries, geography, deal size, revenue/EBITDA; used for filtering and AI context.
- **API keys** — Create/revoke keys for Chrome extension (and future API); named, max 5 active; bcrypt-hashed server-side.
- **Compliance (SBA)** — Optional flags (e.g. U.S. citizen, all investors SBA compliant) for deal modeling defaults.

### 4.8 Marketing & free tools

- **SBA 7(a) loan calculator** — Public tool at `/tools/sba-calculator` (DSCR, eligibility, scenarios).
- **Blog/resources** — e.g. how to analyze a CIM, SBA calculator guide, search-fund deal-screening checklist.

---

## 5. What We Do (flows & mechanics)

### 5.1 CIM flow

1. User uploads CIM (PDF/DOCX) from Dashboard or CIMs view.
2. File stored in Supabase Storage; processing job triggered (`/api/process-cim`).
3. Server extracts text (unpdf/mammoth), truncates to token limit, sends to OpenAI for analysis (summary, financials, red flags, tier, confidence, QoE).
4. Deal created/updated in `companies` with `source_type = 'cim_pdf'`; usage (CIM count) incremented for workspace.
5. User sees deal in pipeline with executive summary, red flags, tier, financial snapshot; can Proceed/Park/Pass, run structure calculator, generate IOI/LOI, export memo.

### 5.2 On-market flow (extension)

1. User has API key in extension; on allowlisted listing page, clicks “Capture.”
2. Extension sends URL, title, and page text to `/api/capture-deal` with Bearer token (API key or session).
3. Server validates URL host against allowlist, rate limits, input length; creates deal as on-market (`source_type = 'on_market'`).
4. Deal appears in On-Market view; user can run initial diligence (AI), move to pipeline, set verdict.

### 5.3 Off-market & financials

- **Off-market:** Deals created from off-market source; can run off-market diligence (AI). Similar pipeline and verdict flow.
- **Financials:** User uploads financials file; processed separately (`/api/process-financials`); deal or linked analysis with financial modeling and scenario comparison.

### 5.4 Verdicts & training data

- **Proceed / Park / Pass** — User sets verdict; optional 1-sentence reason (and for Pass, optional broker feedback).
- **Training data (ML):** When user passes (or proceeds/parks with reason), we store in `training_data`: deal_id, workspace_id, user_id, verdict_type (pass/proceed/park), searcher_input_text, pass_reason_sentence (legacy), extracted_metrics, financial_delta, context_metadata, searcher_rating. Used for future ML fine-tuning (e.g. better tier/verdict suggestions). RLS: users can insert for their workspace only.

### 5.5 Investor flow

1. Searcher shares **Workspace ID** (Settings → Profile).
2. Investor goes to Investor Dashboard → Link Searcher → enters Workspace ID, optional capital, access level (Summary/Full).
3. Backend resolves workspace_id → searcher profile (`role = searcher`), creates `investor_searcher_links` row.
4. Investor sees overview (capital committed, active searchers, pipeline value, deals in pipeline), pipeline-by-stage funnel, searcher performance table, pipeline breakdown.
5. “View Details” → searcher detail page (metrics, red/green flags, conversion rates, weekly/monthly reports). Realtime optional.

### 5.6 Billing & access

- **Auth:** Supabase Auth (email/password); session in cookies for server, JWT for API.
- **Checkout:** User selects plan on pricing → checkout page; **server validates session** (cookie), uses authenticated user id/email only (no IDOR). Stripe Checkout Session created; trial eligibility via DB RPC.
- **Billing portal:** “Manage subscription” → **server validates session** → Stripe billing portal for that user’s customer id only.
- **Webhooks:** Stripe webhook verifies signature with `STRIPE_WEBHOOK_SECRET`; no internal error messages leaked.

---

## 6. Tech stack & implementation (for eng)

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind 4.
- **Backend:** Next.js API routes (Node runtime), Supabase (Auth, Postgres, Storage, Realtime).
- **Payments:** Stripe (Checkout, Customer Portal, webhooks); subscription and trial logic.
- **AI:** OpenAI (e.g. GPT-4o-mini) for CIM analysis, extraction, deal chat; prompts in `lib/prompts`.
- **Docs:** PDF extraction (unpdf), DOCX (mammoth); XLSX/CSV (xlsx). Investment memo: @react-pdf/renderer.
- **Security:** API routes use `authenticateRequest(req)` (JWT or sf_ API key) and workspace scoping; admin/coalition routes add role checks. Cron routes use `CRON_SECRET` / `ON_MARKET_CRON_SECRET` with constant-time compare. Checkout/portal use server session only (no body userId). Logger redacts secrets; storage path and URL validation (SSRF/path traversal).
- **Data:** Workspace-scoped repositories (e.g. `DealsRepository` with `ensureWorkspaceScope()`); RLS on key tables; service role only server-side after auth. Training data table for verdicts/ML.

---

## 7. Pricing (as of product copy)

- **7-day free trial,** $0 due today, cancel anytime. Card required.
- **Founding Member (first 50):** $79/mo (Starter) or $179/mo (Pro) forever. Standard $149 and $299. Offer expires March 1, 2026 or when 50 members reached.
- **Starter (Founding $79):** 20 CIM/mo, 10 financial models/mo, 5 IOI, 3 LOI, AI chat, pipeline, email support.
- **Pro (Founding $179):** 75 CIM, 50 financial models, 20 IOI, 10 LOI, priority support, 1-on-1 founder access.
- **Investor Portfolio:** Custom; book a demo.
- **Yearly:** Save 20%. **30-day money-back guarantee.**

---

## 8. Mission & positioning

- **Origin:** Built after watching a searcher drown in PDFs (60+ hours/month). Started as a tool for one person; grew into a product for the search community.
- **Philosophy:** Obsession with **time**. In M&A, time is the only non-renewable resource. Losing on speed = losing the deal. SearchFindr is the AI Associate so searchers never lose on speed.
- **Keywords:** Search fund, searcher, ETA, CIM, lower-middle-market, pipeline, Proceed/Park/Pass, IOI, LOI, due diligence, deal screening, SBA 7(a), deal structure, red flags, quality of earnings, investor-ready memos.

---

## 9. Quick reference — routes & roles

| Area | Route / API | Who |
|------|-------------|-----|
| Marketing | `/`, `/pricing`, `/mission`, `/tools`, `/blog/*` | Public / logged-in |
| Searcher app | `/dashboard`, `/cims`, `/on-market`, `/off-market`, `/financials`, `/documents`, `/brokers`, `/today` | Searcher (default role) |
| Deal page | `/deals/[id]` (CIM / OnMarket / OffMarket / Financials view by source) | Searcher |
| Compare | `/deals/compare?ids=...` | Searcher |
| Investor | `/investor`, `/investor/searchers/[id]?workspace=...` | `role = investor` |
| Coalition | `/coalition/dashboard` | `is_coalition_leader` or `is_admin` |
| Admin | `/admin` | `is_admin` |
| Auth | `/login`, `/signup`, `/reset-password`, `/auth/callback` | All |
| Settings | `/settings` (subscription, profile, search criteria, API keys, compliance, extensions) | Logged-in |
| Checkout | `/checkout` (redirect to Stripe) | Logged-in; server uses session only |

---

## 10. What’s “under the hood” (for completeness)

- **Deal sources:** `cim_pdf`, `on_market`, `off_market`, `financials`. UI and features vary by source (e.g. tier, AI summary, red flags).
- **Workspace:** One per searcher/team; all deals and data scoped by `workspace_id`. Investors link via Workspace ID.
- **API keys:** Prefix + bcrypt hash; used by extension and future API; rate limited and revoked/expiry supported.
- **Rate limits:** Capture-deal and extension verify-key have configurable limits; CIM/financial/IOI/LOI usage metered per plan.
- **Cron:** Reminders (deal next-action), trial reminders (email), on-market ingest (scheduled job); all protected by secrets.
- **Training data:** Every verdict (pass/proceed/park) with searcher input and metrics stored for future ML; RLS and workspace-scoped.

---

*End of deep rundown. Give this to Gemini (or any AI) to understand what SearchFindr has, what we fix, how we fix it, and what we do.*
