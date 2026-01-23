/**
 * Stage-specific playbooks for deal management
 * Provides tactical guidance for the next 48 hours at each deal stage
 */

export type DealStage = 'new' | 'reviewing' | 'follow_up' | 'ioi_sent' | 'loi' | 'dd' | 'passed' | 'closed_won' | 'closed_lost';

export interface StagePlaybookTask {
  timeframe: string;  // "Tomorrow 10 AM", "Within 24 hours", etc.
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StagePlaybook {
  title: string;
  description: string;
  tasks: StagePlaybookTask[];
  tips: string[];
}

export const STAGE_PLAYBOOKS: Record<DealStage, StagePlaybook> = {
  new: {
    title: "New Deal — Initial Review",
    description: "Review the AI analysis and make your first decision",
    tasks: [
      { timeframe: "Next 30 mins", action: "Read Executive Summary and Red Flags", priority: "high" },
      { timeframe: "Within 24 hours", action: "Make Proceed/Park/Pass decision", priority: "high" },
      { timeframe: "If Proceed", action: "Run SBA calculator in Modeling tab", priority: "medium" }
    ],
    tips: [
      "Trust your gut — if something feels off, it probably is",
      "Most deals are a Pass. Don't fall in love too early."
    ]
  },
  reviewing: {
    title: "Reviewing — Deep Dive",
    description: "You're actively evaluating this deal. Focus on key decision factors.",
    tasks: [
      { timeframe: "Today", action: "Review financial metrics and trends", priority: "high" },
      { timeframe: "Within 48 hours", action: "Check industry benchmarks in Analysis tab", priority: "medium" },
      { timeframe: "Before decision", action: "Run scenario analysis in Modeling tab", priority: "high" }
    ],
    tips: [
      "Compare against your search criteria — does it really fit?",
      "If you're still reviewing after 3 days, it's probably a Park or Pass."
    ]
  },
  follow_up: {
    title: "Follow-up — Active Engagement",
    description: "You've expressed interest. Time to move quickly.",
    tasks: [
      { timeframe: "Today", action: "Schedule call with broker or seller", priority: "high" },
      { timeframe: "Within 24 hours", action: "Prepare specific questions based on red flags", priority: "high" },
      { timeframe: "Before call", action: "Review DD tracker template in Diligence tab", priority: "medium" }
    ],
    tips: [
      "Brokers respect speed. Respond within 24 hours.",
      "Have your financing pre-approved before getting too deep."
    ]
  },
  ioi_sent: {
    title: "IOI Sent — Your Next 48 Hours",
    description: "You've expressed interest. Here's what to expect.",
    tasks: [
      { timeframe: "Tomorrow 10 AM", action: "Follow up with broker if no response", priority: "high" },
      { timeframe: "Before counter-offer", action: "Prepare your walk-away number", priority: "high" },
      { timeframe: "If accepted", action: "Request 14-21 day exclusivity period", priority: "high" }
    ],
    tips: [
      "Brokers expect follow-up. Silence ≠ professionalism.",
      "Have your financing pre-approved before IOI."
    ]
  },
  loi: {
    title: "LOI Stage — Critical Period",
    description: "Due diligence begins. This is where deals fall apart.",
    tasks: [
      { timeframe: "Day 1", action: "Send DD request list to seller", priority: "high" },
      { timeframe: "Day 3", action: "Engage QoE provider", priority: "high" },
      { timeframe: "Day 7", action: "First check-in call with seller", priority: "medium" },
      { timeframe: "Day 14", action: "Review QoE findings", priority: "high" }
    ],
    tips: [
      "Most deals die in DD. That's normal.",
      "Document everything. You'll need it for renegotiation."
    ]
  },
  dd: {
    title: "Due Diligence — Verify Everything",
    description: "Trust but verify. Use the DD tracker in Diligence tab.",
    tasks: [
      { timeframe: "Weekly", action: "Update DD tracker status", priority: "medium" },
      { timeframe: "Ongoing", action: "Flag issues immediately to broker/seller", priority: "high" },
      { timeframe: "Before close", action: "Verify working capital target", priority: "high" }
    ],
    tips: [
      "Customer concentration over 20%? Talk to the top 3 customers yourself.",
      "If seller is slow to provide documents, that's a red flag."
    ]
  },
  passed: {
    title: "Passed — Deal Closed",
    description: "This deal has been passed. No further action needed.",
    tasks: [],
    tips: [
      "Learn from every pass. What made you pass?",
      "Consider updating your search criteria based on patterns."
    ]
  },
  closed_won: {
    title: "Closed Won — Congratulations!",
    description: "Deal successfully closed. Time to celebrate and execute.",
    tasks: [],
    tips: [
      "Document what worked in this deal for future reference.",
      "Set up transition plan and owner handoff."
    ]
  },
  closed_lost: {
    title: "Closed Lost — Deal Ended",
    description: "This deal did not close. Review what happened.",
    tasks: [],
    tips: [
      "Understand why it was lost. Was it price, terms, or something else?",
      "Use this feedback to improve your process."
    ]
  }
};

/**
 * Get playbook for a given stage
 */
export function getPlaybookForStage(stage: DealStage | string | null | undefined): StagePlaybook | null {
  if (!stage) return STAGE_PLAYBOOKS.new;
  const normalizedStage = stage as DealStage;
  return STAGE_PLAYBOOKS[normalizedStage] || STAGE_PLAYBOOKS.new;
}
