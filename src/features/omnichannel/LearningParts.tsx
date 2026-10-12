import type { ReactNode } from 'react';

// Öğrenme sekmesinin ortak yapı taşları: kart, boş durum, düğme. Sekmedeki tüm bölümler
// aynı görünsün diye tek yerde.

export function LearningCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4 flex flex-col gap-2">
      <header className="flex flex-col gap-0.5">
        <h3 className="text-xs font-bold text-[var(--fg)]">{title}</h3>
        {hint && <p className="text-[11px] text-[var(--fg-muted)]">{hint}</p>}
      </header>
      {children}
    </section>
  );
}

export function LearningEmpty({ text }: { text: string }) {
  return <span className="text-[var(--fg-muted)]">{text}</span>;
}

type ButtonTone = 'primary' | 'ghost' | 'danger';

const TONE_CLASSES: Record<ButtonTone, string> = {
  primary: 'bg-[var(--fg)] text-[var(--bg)] font-bold',
  ghost: 'text-[var(--fg)] font-semibold hover:bg-[var(--bg-subtle)]',
  danger: 'text-rose-500 font-semibold hover:bg-rose-500/10',
};

export function LearningButton({ tone = 'ghost', disabled, onClick, children }: {
  tone?: ButtonTone; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      type="button" disabled={disabled} onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] px-2.5 text-[11px] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${TONE_CLASSES[tone]}`}
    >
      {children}
    </button>
  );
}

// "× 3" gibi kanıt sayısı — hepsinde aynı yazım.
export function EvidenceCount({ count }: { count: number }) {
  return <span className="font-mono text-[11px] text-[var(--fg-muted)]">× {count}</span>;
}
