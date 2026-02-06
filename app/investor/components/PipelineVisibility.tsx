'use client';

interface PipelineVisibilityProps {
  dealsByStage: { stage: string; count: number; totalValue: number }[];
}

export default function PipelineVisibility({ dealsByStage }: PipelineVisibilityProps) {
  if (dealsByStage.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
        <p className="text-slate-400">No pipeline data available.</p>
      </div>
    );
  }

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
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
      <h2 className="text-xl font-semibold text-slate-50 mb-4">Pipeline Breakdown</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dealsByStage.map((stage) => (
          <div
            key={stage.stage}
            className="border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="text-sm font-medium text-slate-400 mb-2 capitalize">
              {stage.stage.replace(/_/g, ' ')}
            </div>
            <div className="text-2xl font-bold text-slate-50 mb-1">
              {stage.count}
            </div>
            <div className="text-sm text-slate-500">
              {formatCurrency(stage.totalValue)} total value
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
