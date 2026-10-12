'use client';

import type { CSSProperties } from 'react';
import { AlertTriangle } from 'lucide-react';
import { palette, softTint } from '../shared/design';

// İki mağaza (StoreA / StoreB) arasında geçiş için segment kontrolü. Her sekme üstünde
// aynı görünür — kullanıcı hangi hesaba baktığını her zaman görür.
export const STORES = [
  { code: 'storea', label: 'StoreA Sentos' },
  { code: 'storeb', label: 'StoreB Sentos' },
] as const;

export function StoreSelector({
  value, onChange,
}: { value: string; onChange: (code: string) => void }) {
  return (
    <div style={{ display: 'inline-flex', gap: 4, padding: 4, background: palette.chipBg, borderRadius: 10 }}>
      {STORES.map((s) => {
        const active = s.code === value;
        return (
          <button
            key={s.code}
            onClick={() => onChange(s.code)}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: active ? 700 : 500,
              background: active ? palette.card : 'transparent',
              color: active ? palette.textStrong : palette.textMuted,
              boxShadow: active ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all .12s',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

const LEVEL_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  red:    { bg: 'oklch(52% 0.14 25 / 0.14)',  fg: palette.danger,      label: 'Kritik' },
  orange: { bg: palette.warningSoft,          fg: palette.warningText, label: 'Uyarı' },
  yellow: { bg: 'oklch(80% 0.12 90 / 0.20)',  fg: 'oklch(50% 0.10 90)', label: 'Dikkat' },
  green:  { bg: 'oklch(48% 0.09 155 / 0.14)', fg: palette.success,     label: 'Yeterli' },
};

export function LevelBadge({ level }: { level: string }) {
  const s = LEVEL_STYLE[level] ?? LEVEL_STYLE.green;
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 99,
      fontSize: 11.5, fontWeight: 700, background: s.bg, color: s.fg, whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  );
}

export const th: CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: 12, fontWeight: 700,
  color: palette.textLabel, borderBottom: `1px solid ${palette.border}`, whiteSpace: 'nowrap',
};

export const td: CSSProperties = {
  padding: '10px 14px', fontSize: 13, color: palette.text,
  borderBottom: `1px solid ${palette.borderFaint}`,
};

export function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: palette.textMuted, fontSize: 13 }}>
      {text}
    </div>
  );
}

// API isteği başarısız olduğunda gösterilir — EmptyState'ten KASITLI olarak farklı
// (kırmızı, uyarı ikonlu): "veri yok" ile "veri çekilemedi" aynı görünürse kullanıcı
// gerçek bir hatayı "henüz Excel yüklenmemiş" sanabilir.
export function ErrorState({ text = 'Veri yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.' }: { text?: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '40px 20px', textAlign: 'center', color: palette.danger, fontSize: 13,
      background: softTint(palette.danger), borderRadius: 10,
    }}>
      <AlertTriangle size={20} />
      {text}
    </div>
  );
}

export function tabShell(children: React.ReactNode) {
  return <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>;
}
