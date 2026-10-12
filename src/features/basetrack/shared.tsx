'use client';

import type { CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';
import { palette, softTint } from '../shared/design';
import { formatDate as formatDateShared } from '../../lib/format';

// BaseTrack zincir aşamaları: accent → warning → success, aşama ilerledikçe.
// Zemin softTint ile aynı token'dan türetilir, böylece rozet zemini yazı rengiyle
// aynı hue'da kalır. TrDepot etiketi panel ayarındaki depo adıyla ezilebilir.
export const STATE_META: Record<string, { label: string; color: string }> = {
  TrDepot: { label: 'DEMO UK', color: palette.accent },
  InTransit: { label: 'Sevkiyat', color: palette.warning },
  UkDepot: { label: 'UK Depo', color: palette.success },
};

export const STATES = ['TrDepot', 'InTransit', 'UkDepot'] as const;

export function StateChip({ state, qty, label }: { state: string; qty: number; label?: string }) {
  const meta = STATE_META[state] ?? { label: state, color: palette.textMuted };
  if (qty <= 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600,
        color: meta.color, background: softTint(meta.color), whiteSpace: 'nowrap',
      }}
    >
      {label ?? meta.label} · {qty}
    </span>
  );
}

// Tablo hücreleri ortak tasarımda karşılığı olmayan tek primitive — BaseTrack'in
// geniş veri tabloları için burada tanımlı, renkleri token'lardan gelir.
export const thStyle: CSSProperties = {
  textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600,
  color: palette.textLabel, borderBottom: `1px solid ${palette.border}`,
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: '10px 12px', fontSize: 13, color: palette.text,
  borderBottom: `1px solid ${palette.borderFaint}`, verticalAlign: 'top',
};

export function formatDate(iso: string | null): string {
  return iso ? formatDateShared(iso) : '—';
}

// API isteği başarısız olduğunda gösterilir — "kayıt yok" (gerçekten boş) ile "veri
// çekilemedi" (backend hatası) aynı görünürse ikinci gerçek bir sorunu maskeler.
export function ErrorState({ text = 'Veri yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.' }: { text?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: 10,
      color: palette.danger, fontSize: 13, fontWeight: 600, background: softTint(palette.danger),
    }}>
      <AlertTriangle size={16} strokeWidth={2} />
      {text}
    </div>
  );
}
