// Demo'da "Sürüm güncellemeleri" kartının yerini alır; aynı hücreyi doldurur.
export function DemoCard() {
  return (
    <section className="flex min-h-[160px] flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--card)] p-6 text-center">
      <span className="text-5xl font-black tracking-[0.35em] text-[var(--fg)]">DEMO</span>
      <span className="text-sm text-[var(--fg-muted)]">Salt görüntü modu — veriler kurgusaldır</span>
    </section>
  );
}
