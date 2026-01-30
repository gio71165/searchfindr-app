import { AlertTriangle } from 'lucide-react';

type RedFlag =
  | string
  | {
      flag: string;
      confidence?: 'High' | 'Medium' | 'Low';
      citation?: string;
      impact?: string | null;
      why_it_matters?: string;
      next_action?: string;
    };

type NormalizedRedFlag = {
  flag: string;
  confidence?: 'High' | 'Medium' | 'Low';
  citation?: string;
  impact?: string | null;
  why_it_matters?: string;
  next_action?: string;
};

export function RedFlagsPanel({ redFlags }: { redFlags: RedFlag[] }) {
  const getConfidenceBadge = (confidence?: 'High' | 'Medium' | 'Low') => {
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

  const normalizeFlag = (flag: RedFlag): NormalizedRedFlag => {
    if (typeof flag === 'string') {
      return { flag };
    }

    return flag;
  };

  return (
    <div className="bg-white border-2 border-red-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-50 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          Red Flags Detected
        </h3>
      </div>

      <div className="flex-1">
        {redFlags.length === 0 ? (
          <p className="text-sm text-slate-600">
            No red flags detected yet.
          </p>
        ) : (
          <div className="space-y-3">
            {redFlags.map((flagRaw, idx) => {
              const flag = normalizeFlag(flagRaw);

              return (
                <div
                  key={idx}
                  className="bg-slate-50 rounded-lg p-4 border border-red-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getConfidenceBadge(flag.confidence)}

                        {flag.citation && (
                          <span className="text-xs text-slate-600 italic">
                            ({flag.citation})
                          </span>
                        )}
                      </div>

                      <p className="text-slate-900 text-sm leading-relaxed font-medium mb-2">
                        {flag.flag}
                      </p>

                      {flag.impact && (
                        <p className="text-xs text-slate-700 mb-2">
                          <strong>Impact:</strong> {flag.impact}
                        </p>
                      )}

                      {flag.why_it_matters && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
                          <p className="font-medium text-blue-900 mb-1">
                            Why This Matters:
                          </p>
                          <p className="text-blue-800">
                            {flag.why_it_matters}
                          </p>
                        </div>
                      )}

                      {flag.next_action && (
                        <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-sm">
                          <p className="font-medium text-emerald-900 mb-1">
                            Next Action:
                          </p>
                          <p className="text-emerald-800">
                            {flag.next_action}
                          </p>
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
  );
}
