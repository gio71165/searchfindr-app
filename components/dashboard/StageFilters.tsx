'use client';

interface StageFiltersProps {
  selectedStage: string;
  setSelectedStage: (stage: string) => void;
  stageCounts: Record<string, number>;
}

export function StageFilters({ selectedStage, setSelectedStage, stageCounts }: StageFiltersProps) {
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

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {stages.map(stage => (
        <button
          key={stage.key}
          onClick={() => setSelectedStage(stage.key)}
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
