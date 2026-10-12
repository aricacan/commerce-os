import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { zoneColumnLabel } from '../../../lib/shipping-labels';

// Kargo ekranının ortak yapı taşları — her bölüm aynı kart ve aynı tutar kutusunu kullanır.

interface SectionCardProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Yardım turunun hedeflediği işaret (bkz. features/tour/help-registry). */
  tour?: string;
}

export function SectionCard({ title, description, actions, children, tour }: SectionCardProps) {
  return (
    <section data-tour={tour} className="flex min-w-0 flex-col gap-4 rounded-[8px] border border-[var(--border-soft)] bg-[var(--card)] p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="m-0 text-[13px] font-semibold text-[var(--fg)]">{title}</h2>
          {description && <p className="m-0 text-xs leading-relaxed text-[var(--fg-muted)]">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  currency: string;
  placeholder?: string;
  ariaLabel: string;
  className?: string;
}

export function MoneyInput({ value, onChange, currency, placeholder, ariaLabel, className = 'w-28' }: MoneyInputProps) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-muted)]">{currency}</span>
      <input
        inputMode="decimal"
        aria-label={ariaLabel}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-[6px] border border-[var(--border)] bg-[var(--bg)] pl-6 pr-2.5 text-right font-mono text-xs text-[var(--fg)] outline-none transition placeholder:font-sans placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg)]"
      />
    </div>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  options: { key: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg)] p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`rounded-[5px] px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
            value === option.key
              ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-medium text-[var(--fg-muted)]">{children}</span>;
}

interface ZoneHeaderProps {
  zones: string[];
  first: string;
  /** Satır sonundaki işlem sütunu (ör. sil düğmesi) için boşluk. */
  trailing?: boolean;
}

// Bölge sütunlu fiyat tablolarının başlığı — satırlar ZonePriceInputs ile aynı genişlikleri kullanır.
export function ZoneHeader({ zones, first, trailing }: ZoneHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
      <span className="min-w-0 flex-1">{first}</span>
      {zones.map((zone) => (
        <span key={zone} className="w-28 shrink-0 text-right">{zoneColumnLabel(zone)}</span>
      ))}
      {trailing && <span className="w-9 shrink-0" />}
    </div>
  );
}

interface ZonePriceInputsProps {
  zones: string[];
  prices: Record<string, string>;
  currency: string;
  rowLabel: string;
  placeholder?: string;
  onChange: (zone: string, value: string) => void;
}

export function ZonePriceInputs({ zones, prices, currency, rowLabel, placeholder, onChange }: ZonePriceInputsProps) {
  return (
    <>
      {zones.map((zone) => (
        <MoneyInput
          key={zone}
          ariaLabel={`${rowLabel} · ${zoneColumnLabel(zone)}`}
          currency={currency}
          value={prices[zone] ?? ''}
          placeholder={placeholder}
          onChange={(value) => onChange(zone, value)}
        />
      ))}
    </>
  );
}

interface CollapsibleProps {
  open: boolean;
  onToggle: () => void;
}

export function CollapseButton({ open, onToggle }: CollapsibleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[var(--border)] px-3 text-xs font-semibold text-[var(--fg)] transition hover:bg-[var(--bg-subtle)] cursor-pointer"
    >
      {open ? 'Gizle' : 'Göster'}
      <ChevronDown size={13} className={`transition ${open ? 'rotate-180' : ''}`} />
    </button>
  );
}
