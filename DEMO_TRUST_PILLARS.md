# Demo Trust Pillars — Script for Andrew

Use these three answers when stress-testing or presenting to Andrew (or any investor).

---

## A. The "Citations" Check

**When you show a CIM analysis, show how the AI cites its sources.**

- **What we have:** Every red flag can include a **citation** (e.g. "Page 15, Addback Schedule"). The UI shows it in parentheses next to the flag in the Red Flags panel.
- **What we added:** A **"View CIM PDF"** button on the deal header (for CIM-sourced deals). Click it to open the source PDF in a new tab. You can then say: *"The AI says EBITDA is $1.2M and cites Page 12 — here’s the CIM; you can open it and go to that page to verify."*
- **Demo move:** Open a CIM deal → point to a red flag’s citation (e.g. "Page 15, Addback Schedule") → click **View CIM PDF** → go to page 15 in the PDF. You’ve shown citeability and verifiability.

---

## B. The "Privacy" Guardrail

**Andrew will ask: "Does Searcher A see Searcher B's deals?"**

**Your answer:**

> "No. Every workspace is logically siloed by `workspace_id`. Deal data is always scoped to the authenticated user’s workspace. Coalition leaders only see aggregate metrics and anonymized red flags (e.g. leaderboard as ‘Searcher #1’, no company names) unless a searcher explicitly grants **Full Access**. Investors see only linked searchers’ data, and with **Summary** access we redact company names and can hide financials/AI analysis per deal. Migration 038 and our access-level logic support this."

**Backing in code:**
- All deal queries use `ensureWorkspaceScope()` (workspace_id filter).
- Investor deals: `getSearcherDeals()` applies `access_level` (summary vs full) and `deal_investor_visibility` (visible_to_investors, show_company_name, show_financials, show_ai_analysis).
- Coalition dashboard: only `profiles.is_coalition_member` workspaces; leaderboard uses anonymized labels; no cross-workspace deal access.

---

## C. The "Latency" Story

**Make sure the "60-second" claim is defensible, or reframe.**

- **What we have:** The CIM processing API now returns **`analysis_time_seconds`** and the UI shows a success toast: *"Analysis complete in 52s"* (or whatever the actual time was).
- **If the demo runs in ~60 seconds:** Say *"We aim for about 60 seconds — you just saw it."*
- **If it takes 2–3 minutes:** Say *"The AI is doing a deeper forensic audit than a human could do in 3 hours — red flags, QoE, SBA eligibility, and citations — so a couple of minutes is still a massive time savings."*

No new features; just use the actual number from the toast and frame it accordingly.
