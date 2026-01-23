import { AlertTriangle } from 'lucide-react';

export function RedFlagsPanel({ redFlags }: { redFlags: string[] }) {
  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30">
          <AlertTriangle className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-red-900 text-lg mb-3">Red Flags Detected</h3>
          {redFlags.length === 0 ? (
            <p className="text-sm text-red-700">No red flags detected yet.</p>
          ) : (
            <div className="space-y-2">
              {redFlags.map((flag, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-white/60 rounded-lg p-3 border border-red-200 hover:bg-white/80 transition-colors">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                  <p className="text-red-900 text-sm leading-relaxed">{flag}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
