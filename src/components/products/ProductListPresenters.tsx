'use client';

import { CalendarClock } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import type { ProductGridItem } from '../../types/api';

const NON_VEHICLE_BRANDS = new Set(['storeb', 'storea', 'storea automotive']);

export function brandModelLabel(product: Pick<ProductGridItem, 'brand' | 'model' | 'modelYear'>, lang: string): string {
  if (!product.brand) return '—';
  const isVehicleBrand = !NON_VEHICLE_BRANDS.has(product.brand.trim().toLowerCase());
  const model = product.model || (isVehicleBrand ? (lang === 'tr' ? 'Diğer Model' : 'Other Model') : null);
  return [product.brand, model, product.modelYear].filter(Boolean).join(' · ');
}

function daysSince(utcIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(utcIso).getTime()) / 86_400_000));
}

export function ArrivalInfo({ createdAt }: { createdAt: string }) {
  const { lang } = useI18n();
  const days = daysSince(createdAt);
  const relativeText = days === 0
    ? (lang === 'tr' ? 'Bugün eklendi' : 'Added today')
    : days === 1
      ? (lang === 'tr' ? 'Dün eklendi' : 'Added yesterday')
      : (lang === 'tr' ? `${days} gün önce eklendi` : `Added ${days} days ago`);
  return <span className="flex items-center gap-1.5 text-[11px] text-[var(--fg-muted)]"><CalendarClock size={13} className="text-[var(--fg-subtle)]" />{relativeText}</span>;
}

export function StoreBadges({ tags }: { tags: string[]; color?: string | null }) {
  const labels = tags.length > 0 ? tags : ['—'];
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((tag) => (
        <span
          key={tag}
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            fontSize: 10.5,
            fontWeight: 500,
            background: 'var(--bg-subtle)',
            color: 'var(--fg-muted)',
            border: '1px solid var(--border-soft)',
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function TodayOrderBadge({ count: _count }: { count: number }) {
  // Kaldırıldı — kullanıcı isteğiyle gereksiz renkli sipariş rozetleri gizlendi
  return null;
}
