'use client';

import { MessageSquare } from 'lucide-react';

type OwnerQuestion = {
  category: string;
  question: string;
};

export function OwnerInterviewQuestions({ questions }: { questions: OwnerQuestion[] }) {
  if (!questions || questions.length === 0) {
    return null;
  }

  // Group questions by category
  const grouped = questions.reduce((acc, q) => {
    const cat = q.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<string, OwnerQuestion[]>);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-slate-400" />
        <h3 className="text-xl font-semibold text-slate-50">
          Suggested Questions for Owner
        </h3>
      </div>
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, categoryQuestions]) => (
          <div key={category}>
            <h4 className="font-semibold text-slate-50 mb-2">{category}</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
              {categoryQuestions.map((q, idx) => (
                <li key={idx} className="pl-2">{q.question}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
