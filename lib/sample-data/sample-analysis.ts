export const SAMPLE_ANALYSIS = {
  company_name: "ABC Services Company",
  industry: "HVAC Services",
  location: "Austin, TX",
  asking_price: 2500000,
  revenue_ttm: 3200000,
  ebitda_ttm: 640000,
  ebitda_margin: "20%",
  
  executive_summary: "ABC Services is a 15-year-old HVAC installation and maintenance company serving residential and commercial clients in the Austin metropolitan area. The business generates $3.2M in annual revenue with $640K EBITDA (20% margin), driven primarily by recurring maintenance contracts and seasonal installation work. While the company has established customer relationships and strong local brand recognition, significant customer concentration (top 3 customers represent 47% of revenue) and owner dependency present material transition risks. Financials appear generally reliable, though revenue recognition timing for multi-year service contracts requires verification. The business would benefit from customer diversification and documented operational processes before a successful transition.",
  
  ai_summary: "ABC Services is a 15-year-old HVAC installation and maintenance company serving residential and commercial clients in the Austin metropolitan area. The business generates $3.2M in annual revenue with $640K EBITDA (20% margin), driven primarily by recurring maintenance contracts and seasonal installation work.\n\nWhile the company has established customer relationships and strong local brand recognition, significant customer concentration (top 3 customers represent 47% of revenue) and owner dependency present material transition risks. Financials appear generally reliable, though revenue recognition timing for multi-year service contracts requires verification.\n\nThe business would benefit from customer diversification and documented operational processes before a successful transition. Worth revisiting if customer concentration improves or owner willing to stay on 12+ months.",
  
  red_flags: [
    {
      severity: "high",
      title: "Customer Concentration Risk",
      description: "Top 3 customers represent 47% of revenue. Loss of any one customer would significantly impact cash flow.",
      source_page: 12
    },
    {
      severity: "medium",
      title: "Owner-Dependent Operations",
      description: "Current owner handles all major customer relationships and pricing decisions. No documented processes.",
      source_page: 8
    },
    {
      severity: "medium",
      title: "Seasonal Revenue Volatility",
      description: "60% of revenue occurs in Q2-Q3 (peak cooling season). Cash flow management critical during off-peak months.",
      source_page: 15
    },
    {
      severity: "low",
      title: "Limited Geographic Diversification",
      description: "All operations concentrated in Austin metro. Vulnerable to local economic downturns or competitive pressure.",
      source_page: 5
    }
  ],
  
  qoe_red_flags: [
    {
      type: "Revenue Recognition",
      severity: "medium",
      description: "Revenue recognition timing unclear for multi-year service contracts. Need to verify when revenue is recognized vs. when cash is received."
    },
    {
      type: "Addbacks",
      severity: "high",
      description: "Add-backs include $80K 'one-time marketing expense' that appears in prior 2 years. This suggests recurring expense misclassified as one-time."
    },
    {
      type: "Working Capital",
      severity: "medium",
      description: "AR aging not provided. Seasonal business may have significant working capital swings that impact cash flow."
    }
  ],
  
  strengths: [
    "Strong recurring revenue base with multi-year maintenance contracts",
    "Established local brand with 15 years of operations",
    "Healthy EBITDA margins (20%) above industry average",
    "Diversified service mix (installation + maintenance) reduces seasonality risk",
    "Experienced technician team with low turnover"
  ],
  
  verdict: {
    recommendation: "park",
    confidence: "B",
    reasoning: "Good fundamentals and industry, but customer concentration and owner dependency present significant transition risk. Worth revisiting if customer concentration improves or owner willing to stay on 12+ months.",
    primary_reason: "Customer concentration (47% from top 3) and owner dependency create material transition risk that requires mitigation before proceeding.",
    deal_killers: [],
    proceed_conditions: [
      "Verify customer concentration can be reduced through diversification",
      "Confirm owner willing to stay on 6-12 months for transition",
      "Complete QoE review to validate addbacks and revenue recognition",
      "Document key operational processes and customer relationships"
    ],
    recommended_next_action: "Schedule call with broker to discuss customer diversification plan and owner transition timeline",
    estimated_time_to_decision: "Needs 2-3 weeks DD to assess customer concentration mitigation and transition planning"
  },
  
  financials: {
    revenue_ttm: "$3.2M",
    revenue_1y_ago: "$2.9M",
    revenue_2y_ago: "$2.6M",
    ebitda_ttm: "$640K",
    ebitda_margin_ttm: "20%",
    revenue_cagr_3y: "11%",
    customer_concentration: "Top 3 customers = 47% of revenue",
    working_capital_needs: "Seasonal - requires AR/AP aging analysis"
  },
  
  scoring: {
    succession_risk: "High",
    succession_risk_reason: "Owner handles all major customer relationships and pricing decisions. No documented processes or clear #2.",
    financial_quality: "Medium",
    financial_quality_reason: "Generally reliable but revenue recognition timing unclear and some addback questions.",
    revenue_durability: "Medium",
    revenue_durability_reason: "Recurring maintenance contracts provide stability, but high customer concentration creates risk.",
    customer_concentration_risk: "High",
    customer_concentration_risk_reason: "Top 3 customers represent 47% of revenue.",
    deal_complexity: "Low",
    deal_complexity_reason: "Single location, straightforward service business model.",
    final_tier: "B",
    final_tier_reason: "Good fundamentals but customer concentration and owner dependency require mitigation."
  },
  
  owner_interview_questions: [
    {
      category: "Revenue",
      question: "Your top 3 customers represent 47% of revenue - what are the contract terms and renewal likelihood for each?"
    },
    {
      category: "Operations",
      question: "You handle all major customer relationships - what's your plan for transitioning these relationships to a new owner?"
    },
    {
      category: "Financials",
      question: "The CIM shows an $80K 'one-time marketing expense' addback, but this appears in prior 2 years. Can you explain why this is truly one-time?"
    },
    {
      category: "Customers",
      question: "What's the typical contract length for your maintenance agreements, and what's the renewal rate?"
    },
    {
      category: "Market",
      question: "How competitive is the Austin HVAC market, and what differentiates you from competitors?"
    }
  ]
};
