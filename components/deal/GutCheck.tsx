'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, AlertTriangle } from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import type { Deal } from '@/lib/types/deal';
import { getDealConfidence } from '@/app/deals/[id]/lib/confidence';
import { normalizeRedFlags } from '@/app/deals/[id]/lib/normalizers';

type Verdict = 'strong' | 'caution' | 'pass' | 'not_analyzed';

function getDealVerdict(deal: Deal, redFlags: string[], confidence: { level?: 'A' | 'B' | 'C'; analyzed?: boolean }): Verdict {
  if (confidence?.analyzed === false) {
    return 'not_analyzed';
  }
  
  const redFlagCount = redFlags.length;
  const confidenceTier = confidence?.level || 'B';
  
  if (confidenceTier === 'C' || redFlagCount >= 5) {
    return 'pass';
  }
  
  if (confidenceTier === 'A' && redFlagCount <= 2) {
    return 'strong';
  }
  
  return 'caution';
}

interface GutCheckProps {
  deal: Deal;
  dealId: string;
  onUpdate?: () => void;
}

export function GutCheck({ deal, dealId, onUpdate }: GutCheckProps) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(deal.gut_check_score ?? null);
  const [saving, setSaving] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const redFlags = normalizeRedFlags(deal.ai_red_flags);
  const confidence = getDealConfidence(deal);
  const aiVerdict = getDealVerdict(deal, redFlags, confidence);

  // Map AI verdict to "Proceed" vs "Pass"
  // "strong" and "caution" both mean "Proceed" (proceed with caution is still proceed)
  const isProceedVerdict = aiVerdict === 'strong' || aiVerdict === 'caution';
  const isPassVerdict = aiVerdict === 'pass';

  // Conflict detection
  const hasConflict = 
    (isProceedVerdict && score !== null && score <= 4) ||
    (isPassVerdict && score !== null && score >= 8);

  const conflictMessage = isProceedVerdict && score !== null && score <= 4
    ? "⚠️ The numbers work, but your gut doesn't. That matters. Don't chase a deal you'll regret."
    : isPassVerdict && score !== null && score >= 8
    ? "You're really excited about this despite the red flags. Make sure you're not in love with the idea vs. the reality."
    : null;

  const handleScoreChange = async (newScore: number) => {
    setScore(newScore);
    setSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('Not authenticated');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.workspace_id) {
        console.error('No workspace');
        return;
      }

      const { error } = await supabase
        .from('companies')
        .update({ 
          gut_check_score: newScore,
          last_action_at: new Date().toISOString()
        })
        .eq('id', dealId)
        .eq('workspace_id', profile.workspace_id);

      if (error) {
        console.error('Failed to save gut check score:', error);
        // Revert on error
        setScore(deal.gut_check_score ?? null);
      } else {
        // Calculate conflict for analytics (using new score)
        const newHasConflict = 
          (isProceedVerdict && newScore <= 4) ||
          (isPassVerdict && newScore >= 8);

        // Log analytics event
        try {
          await supabase.from('deal_activities').insert({
            workspace_id: profile.workspace_id,
            deal_id: dealId,
            user_id: session.user.id,
            activity_type: 'gut_check_recorded',
            description: `Gut check score: ${newScore}/10`,
            metadata: {
              gut_check_score: newScore,
              ai_verdict: aiVerdict,
              verdict: deal.verdict || null,
              has_conflict: newHasConflict
            }
          });
        } catch (activityError) {
          // Don't fail if activity logging fails
          console.error('Failed to log gut check activity:', activityError);
        }

        onUpdate?.();
        // Refresh the page to show updated data
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving gut check score:', error);
      setScore(deal.gut_check_score ?? null);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setSkipped(true);
  };

  // Don't show if skipped or if verdict is not_analyzed
  if (skipped || aiVerdict === 'not_analyzed') {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="h-5 w-5 text-pink-600" />
        <h3 className="text-xl font-semibold text-slate-900">Gut Check</h3>
      </div>

      <p className="text-sm text-slate-600 mb-6">
        How excited are you to run this business for 5-7 years?
      </p>

      <div className="space-y-4">
        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min="1"
            max="10"
            value={score ?? 5}
            onChange={(e) => handleScoreChange(parseInt(e.target.value))}
            disabled={saving}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(to right, 
                #ec4899 0%, 
                #ec4899 ${((score ?? 5) - 1) * 11.11}%, 
                #e2e8f0 ${((score ?? 5) - 1) * 11.11}%, 
                #e2e8f0 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span>5</span>
            <span>10</span>
          </div>
        </div>

        {/* Score display */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-bold text-pink-600">{score ?? 5}</span>
          <span className="text-slate-600">/ 10</span>
        </div>

        {/* Conflict warning */}
        {hasConflict && conflictMessage && (
          <div className={`mt-4 p-4 rounded-lg border-l-4 ${
            isProceedVerdict && score !== null && score <= 4
              ? 'bg-yellow-50 border-yellow-400'
              : 'bg-blue-50 border-blue-400'
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                isProceedVerdict && score !== null && score <= 4
                  ? 'text-yellow-600'
                  : 'text-blue-600'
              }`} />
              <p className={`text-sm font-medium ${
                isProceedVerdict && score !== null && score <= 4
                  ? 'text-yellow-800'
                  : 'text-blue-800'
              }`}>
                {conflictMessage}
              </p>
            </div>
          </div>
        )}

        {/* Skip button */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
