export function AIInvestmentMemo({ 
  summary, 
  emptyText 
}: { 
  summary: string | null | undefined;
  emptyText?: string;
}) {
  return (
    <section className="card-section">
      <h2 className="text-lg font-semibold mb-2">Diligence Memo</h2>
      <p className="whitespace-pre-line text-sm leading-relaxed">
        {summary || emptyText || 'No diligence memo available yet.'}
      </p>
    </section>
  );
}
