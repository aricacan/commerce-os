import { ChevronDown, type Mail } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { palette, softTint, card, icon } from '../shared/design';

export const ADMIN_ROLES = ['SuperAdmin', 'Admin', 'ForeignTrade'];

export function fmt(n: number): string {
  return n.toLocaleString('tr-TR');
}

// Rozet zeminleri ortak helper'dan; `soft` adı çağrı yerlerinde korunuyor.
export { softTint as soft } from '../shared/design';

// Durum renkleri anlamla eşleşiyor: bekleyen nötr, cevap olumlu, başarısız
// tehlike, tamamlanan aksan, abonelikten çıkan uyarı.
export const UNSUBSCRIBED_STATUS = 'Unsubscribed';

export const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  Pending: { color: palette.neutral, label: 'Bekliyor' },
  Replied: { color: palette.success, label: 'Cevap Aldı' },
  Bounced: { color: palette.danger, label: 'Başarısız' },
  Completed: { color: palette.accent, label: 'Tamamlandı' },
  [UNSUBSCRIBED_STATUS]: { color: palette.warning, label: 'Abonelikten çıktı' },
};

// Mevcut `status` alanını okur — eski backend bu değeri hiç döndürmez, rozet görünmez.
export function UnsubscribedBadge({ status }: { status?: string | null }) {
  if (status !== UNSUBSCRIBED_STATUS) return null;
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-600 border border-amber-500/20">
      {STATUS_STYLES[UNSUBSCRIBED_STATUS].label}
    </span>
  );
}

export function statusStyle(status: string): { bg: string; color: string; label: string } {
  const found = STATUS_STYLES[status] ?? { color: palette.neutral, label: status };
  return { ...found, bg: softTint(found.color) };
}

export const inputStyle: CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: `1px solid ${palette.borderSoft}`, background: palette.inputBg,
  color: palette.text, fontSize: 13, outline: 'none',
};

export const selectStyle: CSSProperties = {
  padding: '9px 30px 9px 14px', borderRadius: 9, border: `1px solid ${palette.borderSoft}`,
  background: palette.surface, color: palette.text, fontSize: 13,
  fontWeight: 600, cursor: 'pointer', outline: 'none', appearance: 'none',
};

// Radar'ın açılır menüsü — design.ts'teki paylaşılan Select component'iyle aynı
// desen (native <select> oku her tarayıcıda farklı çizildiği için appearance:none
// ile gizlenip yerine sabit boyutlu bir chevron konuyor). Radar bu deseni hiç
// kullanmıyordu, kendi ham <select>'leri tarayıcı varsayılan okuyla kalmıştı —
// bu sarmalayıcı hepsini tek noktadan aynı görünüme getiriyor. `selectStyleOverride`
// CountrySelect'in 'form' varyantı gibi input görünümlü seçim kutuları için var.
export function RadarSelect({
  value, onChange, children, style, selectStyle: selectStyleOverride, disabled, ...rest
}: {
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
  /** Sarmalayıcıya uygulanır (genişlik/hizalama), <select>'e değil. */
  style?: CSSProperties;
  /** <select>'in kendi görünümünü değiştirmek için (varsayılan: modülün selectStyle'ı). */
  selectStyle?: CSSProperties;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', ...style }}>
      <select
        {...rest}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          ...(selectStyleOverride ?? selectStyle),
          appearance: 'none',
          paddingRight: 30,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {children}
      </select>
      {/* pointerEvents:none — chevron tıklamayı yutmasın, <select> kendisi açılsın. */}
      <ChevronDown
        size={icon.sm}
        strokeWidth={icon.stroke}
        style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: palette.textMuted,
        }}
      />
    </div>
  );
}

export function Field({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: palette.textLabel }}>{label}</label>
      {children}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  /** Kartın anlamını taşıyan token rengi — sol şerit ve ikon bu renkte. */
  tone: string;
  Icon: typeof Mail;
  isLoading: boolean;
}

export function KpiCard({ label, value, sub, tone, Icon, isLoading }: KpiCardProps) {
  return (
    <div style={{
      ...card, padding: '14px 18px', borderLeft: `3px solid ${tone}`,
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: palette.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {label}
        </span>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: palette.chipBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={icon.md} strokeWidth={icon.stroke} color={tone} />
        </div>
      </div>
      <div>
        {isLoading ? (
          <div style={{ height: 26, width: '60%', borderRadius: 6, background: palette.borderFaint, margin: '4px 0' }} />
        ) : (
          <p style={{ fontSize: 22, fontWeight: 800, color: palette.textStrong, letterSpacing: '-0.5px', margin: 0, lineHeight: 1.2 }}>{value}</p>
        )}
        {sub && !isLoading && (
          <span style={{ fontSize: 11, color: palette.textFaint, display: 'block', marginTop: 4, fontWeight: 500 }}>{sub}</span>
        )}
      </div>
    </div>
  );
}

// Radar kartları liste/tablo taşıyor: gövde kendi içinde kaydırdığı için taban
// karttan farklı olarak padding'siz ve taşmayı kesen bir kutu.
export const cardStyle: CSSProperties = {
  ...card, padding: 0, overflow: 'hidden',
  display: 'flex', flexDirection: 'column',
};

export const tabScrollStyle: CSSProperties = {
  padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
  height: '100%', overflowY: 'auto', boxSizing: 'border-box', position: 'relative',
};

export const tabSingleScreenStyle: CSSProperties = {
  padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14,
  height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
};

// Kart başlığı şeridi — tablo/liste kartlarının üstündeki sayaç ve başlık satırı.
export const cardHeaderStyle: CSSProperties = {
  padding: '10px 18px', borderBottom: `1px solid ${palette.borderFaint}`,
  background: palette.inputBg, flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
};

// Tablo başlık hücresi — sekmeler arasında aynı kalsın diye tek yerde.
export const thStyle: CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: palette.textMuted, textTransform: 'uppercase', letterSpacing: 0.5,
  whiteSpace: 'nowrap',
};

// Satır içi ikon düğmesi (düzenle/sil) — tablolarda tekrar eden kare. 32px:
// yoğun masaüstü panel için 44px mobil dokunma hedefi fazla, ama önceki 26px
// tıklama/dokunma hedefi kılavuzunun (32-44px) altındaydı.
export const iconBtnStyle: CSSProperties = {
  width: 32, height: 32, borderRadius: 6, background: palette.surface,
  border: `1px solid ${palette.border}`, color: palette.textMuted, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
