'use client';

// Sentetik Kontroller ekranının aç/kapa anahtarı (katmanlar, mesai saati) — tek görünüm.
export function SyntheticToggle({ label, checked, disabled = false, onChange }: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-ui-2xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked
          ? 'border-[rgba(var(--success-rgb),0.3)] bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)]'
          : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
      }`}
    >
      <span className={`relative h-3.5 w-6 rounded-full transition-colors ${checked ? 'bg-[var(--success)]' : 'bg-[var(--border)]'}`}>
        <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all ${checked ? 'left-3' : 'left-0.5'}`} />
      </span>
      {label}
    </button>
  );
}
