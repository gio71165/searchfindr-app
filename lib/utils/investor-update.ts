import { InvestorDashboardData } from '@/lib/data-access/investor-analytics';

/**
 * Generates a formatted monthly update text for investors
 */
export function generateMonthlyUpdate(data: InvestorDashboardData, month: string): string {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const searcherHighlights = data.searchers
    .map(s => {
      return `
${s.searcherName}:
- Months Searching: ${s.monthsSearching}
- Deals in Pipeline: ${s.dealsInPipeline}
- Pipeline Value: ${formatCurrency(s.totalPipelineValue)}
- CIMs Reviewed (Total): ${s.cimsReviewedTotal}
- CIMs Reviewed (This Month): ${s.cimsReviewedThisMonth}
- CIM → IOI Rate: ${s.conversionRates.cimToIoi.toFixed(1)}%
- IOI → LOI Rate: ${s.conversionRates.ioiToLoi.toFixed(1)}%
- LOI → Close Rate: ${s.conversionRates.loiToClose.toFixed(1)}%
- Last Activity: ${s.lastActivity ? new Date(s.lastActivity).toLocaleDateString() : 'N/A'}
`.trim();
    })
    .join('\n\n');

  const pipelineBreakdown = data.dealsByStage
    .map(s => {
      return `${s.stage.replace(/_/g, ' ').toUpperCase()}: ${s.count} deals (${formatCurrency(s.totalValue)})`;
    })
    .join('\n');

  const tierBreakdown = data.dealsByTier
    .map(t => {
      return `Tier ${t.tier}: ${t.count} deals`;
    })
    .join('\n');

  const stateBreakdown = data.dealsByState
    .slice(0, 10) // Top 10 states
    .map(s => {
      return `${s.state}: ${s.count} deals`;
    })
    .join('\n');

  const industryBreakdown = data.dealsByIndustry
    .slice(0, 10) // Top 10 industries
    .map(i => {
      return `${i.industry}: ${i.count} deals`;
    })
    .join('\n');

  return `
MONTHLY SEARCH UPDATE - ${month}
========================================

PORTFOLIO OVERVIEW
------------------
Active Searchers: ${data.activeSearchers}
Total Capital Committed: ${formatCurrency(data.totalCapitalCommitted)}
Total Pipeline Value: ${formatCurrency(data.totalPipelineValue)}
Total Deals in Pipeline: ${data.totalDealsInPipeline}

ACTIVITY THIS MONTH
-------------------
CIMs Processed: ${data.totalCimsProcessed}
IOIs Submitted: ${data.totalIoisSubmitted}
LOIs Submitted: ${data.totalLoisSubmitted}
Total Deals Reviewed: ${data.totalDealsReviewed}

SEARCHER HIGHLIGHTS
-------------------
${searcherHighlights || 'No searchers linked yet.'}

PIPELINE BREAKDOWN BY STAGE
----------------------------
${pipelineBreakdown || 'No pipeline data available.'}

DEAL BREAKDOWN BY TIER
----------------------
${tierBreakdown || 'No tier data available.'}

GEOGRAPHIC BREAKDOWN (Top 10 States)
------------------------------------
${stateBreakdown || 'No geographic data available.'}

INDUSTRY BREAKDOWN (Top 10 Industries)
--------------------------------------
${industryBreakdown || 'No industry data available.'}

========================================
Generated on ${new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}
`.trim();
}

/**
 * Generates HTML version of monthly update for PDF generation
 */
export function generateMonthlyUpdateHTML(data: InvestorDashboardData, month: string): string {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const searcherHighlights = data.searchers
    .map(s => {
      return `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #1e293b;">${s.searcherName}</h3>
          <ul style="margin: 0; padding-left: 20px; color: #475569;">
            <li>Months Searching: ${s.monthsSearching}</li>
            <li>Deals in Pipeline: ${s.dealsInPipeline}</li>
            <li>Pipeline Value: ${formatCurrency(s.totalPipelineValue)}</li>
            <li>CIMs Reviewed (Total): ${s.cimsReviewedTotal}</li>
            <li>CIMs Reviewed (This Month): ${s.cimsReviewedThisMonth}</li>
            <li>CIM → IOI Rate: ${s.conversionRates.cimToIoi.toFixed(1)}%</li>
            <li>IOI → LOI Rate: ${s.conversionRates.ioiToLoi.toFixed(1)}%</li>
            <li>LOI → Close Rate: ${s.conversionRates.loiToClose.toFixed(1)}%</li>
            <li>Last Activity: ${s.lastActivity ? new Date(s.lastActivity).toLocaleDateString() : 'N/A'}</li>
          </ul>
        </div>
      `;
    })
    .join('');

  const pipelineBreakdown = data.dealsByStage
    .map(s => {
      return `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${s.stage.replace(/_/g, ' ').toUpperCase()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${s.count}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatCurrency(s.totalValue)}</td>
      </tr>`;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Search Update - ${month}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      color: #0f172a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
    }
    h2 {
      color: #1e293b;
      margin-top: 30px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #475569;
    }
    .metric-card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin: 10px 0;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
    }
    .metric-label {
      font-size: 14px;
      color: #64748b;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>MONTHLY SEARCH UPDATE - ${month}</h1>
  
  <h2>Portfolio Overview</h2>
  <div class="metric-card">
    <div class="metric-value">${data.activeSearchers}</div>
    <div class="metric-label">Active Searchers</div>
  </div>
  <div class="metric-card">
    <div class="metric-value">${formatCurrency(data.totalCapitalCommitted)}</div>
    <div class="metric-label">Total Capital Committed</div>
  </div>
  <div class="metric-card">
    <div class="metric-value">${formatCurrency(data.totalPipelineValue)}</div>
    <div class="metric-label">Total Pipeline Value</div>
  </div>
  <div class="metric-card">
    <div class="metric-value">${data.totalDealsInPipeline}</div>
    <div class="metric-label">Total Deals in Pipeline</div>
  </div>
  
  <h2>Activity This Month</h2>
  <ul>
    <li>CIMs Processed: ${data.totalCimsProcessed}</li>
    <li>IOIs Submitted: ${data.totalIoisSubmitted}</li>
    <li>LOIs Submitted: ${data.totalLoisSubmitted}</li>
    <li>Total Deals Reviewed: ${data.totalDealsReviewed}</li>
  </ul>
  
  <h2>Searcher Highlights</h2>
  ${searcherHighlights || '<p>No searchers linked yet.</p>'}
  
  <h2>Pipeline Breakdown by Stage</h2>
  <table>
    <thead>
      <tr>
        <th>Stage</th>
        <th style="text-align: right;">Count</th>
        <th style="text-align: right;">Total Value</th>
      </tr>
    </thead>
    <tbody>
      ${pipelineBreakdown || '<tr><td colspan="3">No pipeline data available.</td></tr>'}
    </tbody>
  </table>
  
  <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
    Generated on ${new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })}
  </p>
</body>
</html>
  `.trim();
}
