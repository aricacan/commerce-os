'use client';

import { AlertTriangle } from 'lucide-react';
import {
  AD_PLATFORM, AD_ACCOUNT_STATUS, AD_ENTITY_STATUS,
  type AdPlatform, type AdAccountStatus, type AdEntityStatus,
} from '../../lib/api/adshub';
import { palette, icon, softTint, statusDot } from '../shared/design';

// AdsHub sekmelerinin ortak parçaları. SiteHub shared.tsx ile aynı desen:
// rozet ve etiket haritaları tek yerde dursun ki üç sekme birbirinden kaymasın.

export function ErrorState({ text }: { text?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: 10,
      color: palette.danger, fontSize: 13, fontWeight: 600, background: softTint(palette.danger),
    }}>
      <AlertTriangle size={icon.lg} strokeWidth={icon.stroke} />
      {text ?? 'Veri yüklenemedi. Bağlantıyı kontrol edip tekrar deneyin.'}
    </div>
  );
}

// Platform → renk + isim. Renk yalnızca rozet/nokta içindir, marka rengiyle
// karıştırılmasın diye tasarım paletinden seçildi.
export const PLATFORM_META: Record<AdPlatform, { label: string; color: string }> = {
  [AD_PLATFORM.Meta]: { label: 'Meta', color: palette.bot },
  [AD_PLATFORM.Google]: { label: 'Google Ads', color: palette.accent },
  [AD_PLATFORM.TikTok]: { label: 'TikTok', color: palette.textStrong },
};

export function PlatformBadge({ platform }: { platform: AdPlatform }) {
  const meta = PLATFORM_META[platform] ?? { label: '—', color: palette.neutral };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
      background: softTint(meta.color, 14), color: meta.color, whiteSpace: 'nowrap',
    }}>
      <span style={statusDot(meta.color, 6)} />
      {meta.label}
    </span>
  );
}

const ACCOUNT_STATUS_META: Record<AdAccountStatus, { label: string; color: string }> = {
  [AD_ACCOUNT_STATUS.Unknown]: { label: 'Bilinmiyor', color: palette.neutral },
  [AD_ACCOUNT_STATUS.Connected]: { label: 'Bağlı', color: palette.success },
  [AD_ACCOUNT_STATUS.AuthFailed]: { label: 'Jeton reddedildi', color: palette.danger },
  [AD_ACCOUNT_STATUS.Unreachable]: { label: 'Ulaşılamıyor', color: palette.warning },
  [AD_ACCOUNT_STATUS.RateLimited]: { label: 'Kota doldu', color: palette.warning },
};

const UNKNOWN_STATUS_META = { label: 'Bilinmiyor', color: palette.neutral };

export function AccountStatusDot({ status }: { status: AdAccountStatus }) {
  // Backend yeni bir durum kodu eklerse (FE geride kalırsa) haritada karşılığı
  // olmaz ve meta.label okuması çökerdi — dürüst bir geri düşüş şart.
  const meta = ACCOUNT_STATUS_META[status] ?? UNKNOWN_STATUS_META;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: palette.textMuted }}>
      <span style={statusDot(meta.color)} />
      {meta.label}
    </span>
  );
}

// Uyarı penceresi — backend'deki AdTokenExpiryPolicy.WarningWindow ile aynı (7 gün).
const TOKEN_WARNING_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Saat okuması bileşen gövdesinin dışında: React derleyicisi render sırasında doğrudan
// Date.now() çağrısını saf olmayan işlem sayıp bileşeni optimize etmiyor (bkz. sonar/shared.tsx
// ile aynı desen).
function daysUntil(expiresMs: number) {
  return Math.ceil((expiresMs - Date.now()) / MS_PER_DAY);
}

// Erişim jetonu süresi yaklaşan/dolan hesaplar için rozet. Meta jetonu kendiliğinden
// yenilenmez; süre dolunca senkron sessizce 401'e düşer — kullanıcı bunu önceden görsün.
export function TokenExpiryBadge({ expiresAt }: { expiresAt?: string | null }) {
  if (!expiresAt) return null;

  const expiresMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresMs)) return null;

  const daysLeft = daysUntil(expiresMs);
  if (daysLeft > TOKEN_WARNING_DAYS) return null;

  const expired = daysLeft <= 0;
  const color = expired ? palette.danger : palette.warning;
  return (
    <span
      title={`Bitiş: ${formatDateTime(expiresAt)} — hesabı yeniden bağlayın.`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
        background: softTint(color, 14), color, whiteSpace: 'nowrap',
      }}
    >
      {expired ? 'Jeton süresi doldu' : `Jeton ${daysLeft} gün içinde bitiyor`}
    </span>
  );
}

// Kampanya/set/reklam durumu. Ham platform metni ayrı gösterildiği için
// burada yalnızca ortak kümeye indirgenmiş anlam var.
const ENTITY_STATUS_META: Record<AdEntityStatus, { label: string; color: string }> = {
  [AD_ENTITY_STATUS.Unknown]: { label: 'Bilinmiyor', color: palette.neutral },
  [AD_ENTITY_STATUS.Active]: { label: 'Yayında', color: palette.success },
  [AD_ENTITY_STATUS.Paused]: { label: 'Duraklatıldı', color: palette.warning },
  [AD_ENTITY_STATUS.Archived]: { label: 'Arşivlendi', color: palette.neutral },
  [AD_ENTITY_STATUS.Deleted]: { label: 'Silindi', color: palette.danger },
};

export function EntityStatusBadge({ status }: { status: AdEntityStatus }) {
  const meta = ENTITY_STATUS_META[status];
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
      background: softTint(meta.color, 14), color: meta.color, whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

// "İnsan onaylasın" uyarısı — otomatik durdurma YOK, reklam hâlâ harcama yapıyor olabilir.
// Yalnızca isLandingProductOutOfStock === true iken çağrılmalı (null/false gösterilmez —
// bkz. AdEntityRowDto.isLandingProductOutOfStock yorumu, "bilinmiyor" ile "stokta yok"
// birbirine karışmasın).
export function OutOfStockWarningBadge() {
  return (
    <span
      title="Ürün stokta yok — reklam hâlâ harcama yapıyor olabilir"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
        fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
        background: softTint(palette.warning, 14), color: palette.warning, whiteSpace: 'nowrap',
      }}
    >
      <AlertTriangle size={11} strokeWidth={icon.stroke} />
      Stokta yok
    </span>
  );
}

// ── Sayı biçimlendirme ────────────────────────────────────────────────────────
//
// AdsHub'a özgü: TL formatı burada, tarih için lib/format.ts kullanılıyor.

export function formatTry(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });
}

export function formatMoney(value: number | null | undefined, currency: string): string {
  if (value == null) return '—';
  try {
    return value.toLocaleString('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 });
  } catch {
    // Tanınmayan/eksik para birimi kodu — sessizce çökmek yerine ham sayı.
    return `${value.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${currency}`;
  }
}

export function formatCount(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('tr-TR');
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null) return '—';
  return `%${value.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function formatRatio(value: number | null | undefined, digits = 2): string {
  if (value == null) return '—';
  return `${value.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}x`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
