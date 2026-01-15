'use client';

interface VerdictFiltersProps {
  selectedVerdict: string;
  setSelectedVerdict: (verdict: string) => void;
}

export function VerdictFilters(props: VerdictFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-center mb-6 text-sm bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Verdict buttons */}
      <div className="flex gap-2 items-center">
        <span className="text-gray-700 dark:text-gray-300 font-medium">Verdict:</span>
        <VerdictButton
          active={props.selectedVerdict === 'all'}
          onClick={() => props.setSelectedVerdict('all')}
          label="All"
        />
        <VerdictButton
          active={props.selectedVerdict === 'proceed'}
          onClick={() => props.setSelectedVerdict('proceed')}
          label="Proceed"
          color="green"
        />
        <VerdictButton
          active={props.selectedVerdict === 'park'}
          onClick={() => props.setSelectedVerdict('park')}
          label="Park"
          color="yellow"
        />
        <VerdictButton
          active={props.selectedVerdict === 'pass'}
          onClick={() => props.setSelectedVerdict('pass')}
          label="Pass"
          color="gray"
        />
      </div>
    </div>
  );
}

interface VerdictButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: 'green' | 'yellow' | 'gray';
}

function VerdictButton({ active, onClick, label, color }: VerdictButtonProps) {
  const colors = {
    green: active ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800',
    yellow: active ? 'bg-yellow-600 text-white' : 'bg-yellow-100 text-yellow-800',
    gray: active ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        color ? colors[color as keyof typeof colors] : (active ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
      }`}
    >
      {label}
    </button>
  );
}
