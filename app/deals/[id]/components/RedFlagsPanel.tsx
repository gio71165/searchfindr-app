export function RedFlagsPanel({ redFlags }: { redFlags: string[] }) {
  return (
    <section className="card-red">
      <h2 className="text-lg font-semibold mb-2">Red Flags</h2>
      {redFlags.length === 0 ? (
        <p className="text-sm">No red flags detected{redFlags.length === 0 ? ' yet' : ''}.</p>
      ) : (
        <ul className="list-disc list-inside space-y-1 text-sm">
          {redFlags.map((flag, idx) => (
            <li key={idx}>{flag}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
