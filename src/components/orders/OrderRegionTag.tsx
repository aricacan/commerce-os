import { ZONE_SHORT_LABELS } from '../../lib/shipping-labels';

interface OrderRegionTagProps {
  country?: string;
  zone?: string;
}

// UK siparişinin teslimat bölgesi (posta kodundan). Kargo fiyatı bölgeye göre değiştiği için
// listede görünür olmalı; TR siparişlerinde bölge ayrımı yok, etiket gösterilmez.
export function OrderRegionTag({ country, zone }: OrderRegionTagProps) {
  if (country !== 'UK') return null;

  const label = zone ? ZONE_SHORT_LABELS[zone] ?? zone : 'Posta kodu yok';
  const highlighted = zone === 'Scotland' || zone === 'NorthernIreland';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-px text-[10px] font-semibold ${
        highlighted
          ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
          : 'border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
      }`}
      title="Teslimat bölgesi — kargo ek ücreti bu bölgeye göre uygulanır"
    >
      UK · {label}
    </span>
  );
}
