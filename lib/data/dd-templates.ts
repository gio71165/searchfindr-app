export interface DDTemplate {
  categories: {
    name: string;
    description: string;
    items: string[];
  }[];
}

export const DEFAULT_DD_CHECKLIST: DDTemplate = {
  categories: [
    {
      name: 'Financial',
      description: 'Financial records and analysis',
      items: [
        'Last 3 years of tax returns',
        'Last 3 years of financial statements (P&L, Balance Sheet, Cash Flow)',
        'Year-to-date financials',
        'AR aging report (current)',
        'AP aging report (current)',
        'Detailed revenue breakdown by customer',
        'Detailed expense breakdown by category',
        'Bank statements (last 12 months)',
        'Loan agreements and debt schedules',
        'Capital expenditure history',
        'Inventory valuation and turnover analysis',
      ],
    },
    {
      name: 'Legal',
      description: 'Legal documents and compliance',
      items: [
        'Articles of incorporation / LLC operating agreement',
        'Shareholder/member agreements',
        'Bylaws',
        'Minute books (last 3 years)',
        'Material contracts (>$10k annual)',
        'Customer contracts and terms',
        'Supplier/vendor agreements',
        'Lease agreements (real estate and equipment)',
        'Intellectual property registrations',
        'Pending or threatened litigation',
        'Regulatory licenses and permits',
        'Insurance policies (all types)',
      ],
    },
    {
      name: 'Operations',
      description: 'Business operations and processes',
      items: [
        'Organizational chart',
        'Process documentation and SOPs',
        'Key vendor list and dependencies',
        'Technology stack and software licenses',
        'Equipment list and condition',
        'Facility walkthrough notes',
        'Supply chain analysis',
        'Quality control procedures',
        'Customer service metrics',
      ],
    },
    {
      name: 'Human Resources',
      description: 'Employee matters',
      items: [
        'Employee census (names, titles, salaries, start dates)',
        'Employment agreements',
        'Non-compete agreements',
        'Benefits summary and costs',
        '401(k) or retirement plan details',
        'Health insurance details',
        'Payroll records (last 12 months)',
        'PTO accruals and policies',
        "Worker's compensation claims history",
        'Employee handbook',
        'Organizational chart with reporting relationships',
      ],
    },
    {
      name: 'Tax & Compliance',
      description: 'Tax matters and regulatory compliance',
      items: [
        'Federal tax returns (last 3 years)',
        'State tax returns (last 3 years)',
        'Sales tax compliance records',
        'Payroll tax filings (last 2 years)',
        'Any IRS or state tax audits or disputes',
        'Property tax records',
        'Tax basis of assets (for asset purchase)',
        'Environmental compliance records',
        'OSHA compliance and safety records',
        'Industry-specific regulatory compliance',
      ],
    },
    {
      name: 'Commercial',
      description: 'Sales, marketing, and customer relationships',
      items: [
        'Top 20 customers (% of revenue, contract terms)',
        'Customer concentration analysis',
        'Customer retention rates',
        'Sales pipeline and forecast',
        'Marketing materials and strategy',
        'Website analytics (last 12 months)',
        'Pricing strategy and history',
        'Competitive landscape analysis',
        'Market positioning and differentiation',
      ],
    },
  ],
};
