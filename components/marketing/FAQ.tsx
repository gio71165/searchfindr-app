interface FAQProps {
  q: string;
  a: string;
}

export function FAQ({ q, a }: FAQProps) {
  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 transition-colors">
      <h3 className="text-lg font-semibold text-white mb-2">
        {q}
      </h3>
      <p className="text-white/60 leading-relaxed">
        {a}
      </p>
    </div>
  );
}
