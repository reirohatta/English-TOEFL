export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      {title && <h2 className="mb-2 text-sm font-semibold text-muted">{title}</h2>}
      {children}
    </section>
  );
}

export function ComingSoon({ step }: { step: string }) {
  return <p className="text-sm text-muted">この機能は {step} で実装します。</p>;
}
