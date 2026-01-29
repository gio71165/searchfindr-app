import { AlertTriangle } from 'lucide-react';

type RedFlag = string | {
  flag: string;
  confidence?: 'High' | 'Medium' | 'Low';
  citation?: string;
  impact?: string | null;
  why_it_matters?: string;
  next_action?: string;
};

export function RedFlagsPanel({ redFlags }: { redFlags: string[] | RedFlag[] }) {
  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence) return null;
    const confLower = confidence.toLowerCase();
    if (confLower === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
          High Confidence
        </span>
      );
    }
    if (confLower === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
          Medium Confidence
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-300">
        Low Confidence
      </span>
    );
  };

  const normalizeFlag = (flag: RedFlag): { flag: string; confidence?: string; citation?: string; impact?: string | null; why_it_matters?: string; next_action?: string } => {
    if (typeof flag === 'string') {
      return { flag };
    }
    return flag;
  };

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
            <div className="space-y-3">
              {redFlags.map((flagRaw, idx) => {
                const flag = normalizeFlag(flagRaw);
                return (
                  <div key={idx} className="bg-white/60 rounded-lg p-4 border border-red-200 hover:bg-white/80 transition-colors">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {getConfidenceBadge(flag.confidence)}
                          {flag.citation && (
                            <span className="text-xs text-slate-600 italic">({flag.citation})</span>
                          )}
                        </div>
                        <p className="text-red-900 text-sm leading-relaxed font-medium mb-2">{flag.flag}</p>
                        {flag.impact && (
                          <p className="text-xs text-red-700 mb-2"><strong>Impact:</strong> {flag.impact}</p>
                        )}
                        {flag.why_it_matters && (
                          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                            <p className="font-medium text-blue-900 mb-1">Why This Matters:</p>
                            <p className="text-blue-800">{flag.why_it_matters}</p>
                          </div>
                        )}
                        {flag.next_action && (
                          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                            <p className="font-medium text-emerald-900 mb-1">Next Action:</p>
                            <p className="text-emerald-800">{flag.next_action}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
