'use client';

interface PipelineSummaryProps {
  selectedStage: string;
  setSelectedStage: (stage: string) => void;
  stageCounts: Record<string, number>;
  variant?: 'full' | 'compact';
}

export function PipelineSummary({ selectedStage, setSelectedStage, stageCounts, variant = 'full' }: PipelineSummaryProps) {
  const stages = [
    { key: 'all', label: 'All' },
    { key: 'new', label: 'New' },
    { key: 'reviewing', label: 'Reviewing' },
    { key: 'follow_up', label: 'Follow-up' },
    { key: 'ioi_sent', label: 'IOI Sent' },
    { key: 'loi', label: 'LOI' },
    { key: 'dd', label: 'DD' },
    { key: 'passed', label: 'Passed' }
  ];

  if (variant === 'compact') {
    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stage: <span className="text-gray-500 font-normal">({stageCounts[selectedStage] || 0} deals)</span>
        </label>
        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {stages.map(stage => (
            <option key={stage.key} value={stage.key}>
              {stage.label} ({stageCounts[stage.key] || 0})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Full variant (tile grid)
  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {stages.map(stage => (
        <button
          key={stage.key}
          onClick={() => {
            if (typeof setSelectedStage === 'function') {
              setSelectedStage(stage.key);
            }
          }}
          className={`p-4 rounded-lg font-semibold transition-all text-left ${
            selectedStage === stage.key
              ? 'bg-blue-600 text-white shadow-lg scale-105'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:shadow-md'
          }`}
        >
          <div className="text-2xl font-bold">{stageCounts[stage.key] || 0}</div>
          <div className="text-sm opacity-90">{stage.label}</div>
        </button>
      ))}
    </div>
  );
}
