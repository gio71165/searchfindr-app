'use client';

import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const STAGE_ORDER = ['new', 'reviewing', 'follow_up', 'ioi_sent', 'loi', 'dd', 'passed'] as const;
const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  follow_up: 'Follow-up',
  ioi_sent: 'IOI Sent',
  loi: 'LOI',
  dd: 'DD',
  passed: 'Passed',
};
const STAGE_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#64748b', // slate
];

export interface PipelineAnalyticsProps {
  stageCounts: Record<string, number>;
}

export function PipelineAnalytics({ stageCounts }: PipelineAnalyticsProps) {
  const [expanded, setExpanded] = useState(false);

  const totalActive =
    (stageCounts.new || 0) +
    (stageCounts.reviewing || 0) +
    (stageCounts.follow_up || 0) +
    (stageCounts.ioi_sent || 0) +
    (stageCounts.loi || 0) +
    (stageCounts.dd || 0);
  const totalPassed = stageCounts.passed || 0;
  const total = totalActive + totalPassed;

  const chartData = STAGE_ORDER.map((key) => ({
    stage: STAGE_LABELS[key] || key,
    key,
    count: stageCounts[key] ?? 0,
  })).filter((d) => d.count > 0 || d.key === 'new' || d.key === 'passed');

  const conversionRates: { label: string; value: string; sub?: string }[] = [];
  if (totalActive > 0) {
    const inPipeline =
      (stageCounts.follow_up || 0) +
      (stageCounts.ioi_sent || 0) +
      (stageCounts.loi || 0) +
      (stageCounts.dd || 0);
    conversionRates.push({
      label: 'In pipeline',
      value: `${Math.round((inPipeline / totalActive) * 100)}%`,
      sub: `${inPipeline} of ${totalActive} active`,
    });
  }
  if (total > 0 && totalPassed > 0) {
    conversionRates.push({
      label: 'Passed',
      value: `${Math.round((totalPassed / total) * 100)}%`,
      sub: `${totalPassed} of ${total} total`,
    });
  }
  if ((stageCounts.new || 0) + (stageCounts.reviewing || 0) > 0 && stageCounts.reviewing != null) {
    const reviewRate = Math.round(
      (stageCounts.reviewing / (stageCounts.new + stageCounts.reviewing)) * 100
    );
    conversionRates.push({
      label: 'New → Reviewing',
      value: `${reviewRate}%`,
      sub: 'current snapshot',
    });
  }

  return (
    <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <span className="font-semibold text-slate-200">Pipeline analytics</span>
          <span className="text-xs text-slate-500">(conversion by stage)</span>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {conversionRates.map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-slate-700/50">
                <div className="text-xs font-medium text-slate-400">{r.label}</div>
                <div className="text-xl font-bold text-slate-50">{r.value}</div>
                {r.sub && <div className="text-xs text-slate-500 mt-0.5">{r.sub}</div>}
              </div>
            ))}
          </div>
          {chartData.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="stage"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    axisLine={{ stroke: '#475569' }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                    formatter={(value: number) => [value, 'Deals']}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={entry.key} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
