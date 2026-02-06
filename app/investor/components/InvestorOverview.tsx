'use client';

import { InvestorDashboardData } from '@/lib/data-access/investor-analytics';
import { StatCard } from '@/components/ui/StatCard';
import { TrendingUp, Users, DollarSign, FileText } from 'lucide-react';

interface InvestorOverviewProps {
  data: InvestorDashboardData;
}

export default function InvestorOverview({ data }: InvestorOverviewProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Capital Committed"
          value={formatCurrency(data.totalCapitalCommitted)}
          icon={DollarSign}
        />
        <StatCard
          label="Active Searchers"
          value={data.activeSearchers.toString()}
          icon={Users}
        />
        <StatCard
          label="Total Pipeline Value"
          value={formatCurrency(data.totalPipelineValue)}
          icon={TrendingUp}
        />
        <StatCard
          label="Deals in Pipeline"
          value={data.totalDealsInPipeline.toString()}
          icon={FileText}
        />
      </div>

      {/* Pipeline Funnel Chart */}
      {data.dealsByStage.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-slate-50 mb-4">Pipeline by Stage</h2>
          <div className="space-y-4">
            {data.dealsByStage
              .sort((a, b) => {
                const stageOrder: Record<string, number> = {
                  'new': 1,
                  'reviewing': 2,
                  'follow_up': 3,
                  'ioi_sent': 4,
                  'loi': 5,
                  'dd': 6,
                  'closed': 7,
                };
                return (stageOrder[a.stage] || 99) - (stageOrder[b.stage] || 99);
              })
              .map((stage) => {
                const maxCount = Math.max(...data.dealsByStage.map(s => s.count));
                const percentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                
                return (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-300 capitalize">
                        {stage.stage.replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-400">
                        {stage.count} deals • {formatCurrency(stage.totalValue)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className="bg-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-sm text-slate-400 mb-1">CIMs Processed</div>
          <div className="text-2xl font-bold text-slate-50">{data.totalCimsProcessed}</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-sm text-slate-400 mb-1">IOIs Submitted</div>
          <div className="text-2xl font-bold text-slate-50">{data.totalIoisSubmitted}</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-sm text-slate-400 mb-1">LOIs Submitted</div>
          <div className="text-2xl font-bold text-slate-50">{data.totalLoisSubmitted}</div>
        </div>
      </div>
    </div>
  );
}
