export function DiligenceChecklist({ items, emptyText }: { items: string[]; emptyText?: string }) {
  return (
    <section className="card-section">
      <h2 className="text-lg font-semibold mb-2">Due Diligence Checklist</h2>
      {items.length === 0 ? (
        <p className="text-sm">{emptyText || 'No checklist generated yet.'}</p>
      ) : (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
