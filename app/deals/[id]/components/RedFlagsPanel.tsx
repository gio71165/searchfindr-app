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

export function RedFlagsPanel({
  redFlags,
  embedded,
  showCimCitationHint = true,
}: {
  redFlags: RedFlag[];
  embedded?: boolean;
  /** When false, hides "use View CIM PDF in the header" text (e.g. for on-market deals without CIM) */
  showCimCitationHint?: boolean;
}) {
  const getConfidenceBadge = (confidence?: 'High' | 'Medium' | 'Low') => {
    if (!confidence) return null;

    const confLower = confidence.toLowerCase();

    if (confLower === 'high') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
          High Confidence
        </span>
      );
    }

    if (confLower === 'medium') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
          Medium Confidence
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-600/50 text-slate-300 border border-slate-500">
        Low Confidence
      </span>
    );
  };

  // Extract citation from string (e.g. "(Page 15, Addback Schedule)" stored in bullet text)
  const extractCitationFromString = (text: string): { flag: string; citation?: string } => {
    const trimmed = text.trim();
    // Match "(Page N, ...)" or "(Page N)" anywhere in the string (stored format: "Flag (Page 15, Section) [High confidence]")
    const citationMatch = trimmed.match(/\s*\((Page\s+\d+[^)]*)\)/i);
    if (citationMatch) {
      const citation = citationMatch[1].trim();
      const flag = trimmed.replace(citationMatch[0], '').replace(/\s{2,}/g, ' ').trim();
      return { flag: flag || trimmed, citation };
    }
    return { flag: trimmed };
  };

  const normalizeFlag = (flag: RedFlag): NormalizedRedFlag => {
    if (typeof flag === 'string') {
      const { flag: flagText, citation } = extractCitationFromString(flag);
      return { flag: flagText, citation };
    }

    return flag;
  };

  const content = (
    <div className="flex-1">
        {redFlags.length === 0 ? (
          <p className="text-sm text-slate-400">
            No red flags detected yet.
          </p>
        ) : (
          <div className="space-y-3">
            {redFlags.map((flagRaw, idx) => {
              const flag = normalizeFlag(flagRaw);

              return (
                <div
                  key={idx}
                  className="bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getConfidenceBadge(flag.confidence)}

                        {flag.citation && (
                          <span className="text-xs text-slate-400 italic">
                            ({flag.citation})
                          </span>
                        )}
                      </div>

                      <p className="text-slate-50 text-sm leading-relaxed font-medium mb-2">
                        {flag.flag}
                      </p>

                      {flag.impact && (
                        <p className="text-xs text-slate-300 mb-2">
                          <strong>Impact:</strong> {flag.impact}
                        </p>
                      )}

                      {flag.why_it_matters && (
                        <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm">
                          <p className="font-medium text-emerald-400 mb-1">
                            Why This Matters:
                          </p>
                          <p className="text-slate-300">
                            {flag.why_it_matters}
                          </p>
                        </div>
                      )}

                      {flag.next_action && (
                        <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded text-sm">
                          <p className="font-medium text-emerald-400 mb-1">
                            Next Action:
                          </p>
                          <p className="text-slate-300">
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
  );

  const citationHint = showCimCitationHint ? (
    <p className="text-xs text-slate-400">
      Citations (e.g. page numbers) are shown in italics — use <strong className="text-slate-300">View CIM PDF</strong> in the header to verify.
    </p>
  ) : null;

  if (embedded) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300">Red Flags</h4>
        {citationHint}
        {content}
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border-2 border-red-500/30 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-500/10 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-50">
            Red Flags Detected
          </h3>
          {showCimCitationHint && (
            <p className="text-xs text-slate-400 mt-0.5">
              Citations (e.g. page numbers) are shown in italics — use <strong className="text-slate-300">View CIM PDF</strong> in the header to open the source and verify.
            </p>
          )}
        </div>
      </div>
      {content}
    </div>
  );
}
