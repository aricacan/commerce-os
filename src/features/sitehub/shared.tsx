'use client';

import { AlertTriangle, FileText, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  SITE_STATUS, REQUEST_TYPE, REQUEST_STATUS,
  type SiteStatus, type SiteRequestType, type SiteRequestStatus,
} from '../../lib/api/sitehub';
import { palette, icon, softTint, statusDot } from '../shared/design';

// SiteHub sekmelerinin ortak parçaları. BaseTrack/Kargo shared.tsx ile aynı desen:
// rozet ve etiket haritaları tek yerde dursun ki üç sekme birbirinden kaymasın.
//
// Kart/hata gibi primitive'ler burada YENİDEN TANIMLANMAZ — design.ts'ten gelirler.
// Kopyalanan token, ortak tasarım değişince sessizce geride kalır.

// API isteği başarısız olduğunda gösterilir — "kayıt yok" (gerçekten boş) ile
// "veri çekilemedi" (backend hatası) aynı görünürse ikincisi maskelenir.
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

// Bağlantı durumu → renk + Türkçe etiket.
const STATUS_META: Record<SiteStatus, { label: string; color: string }> = {
  [SITE_STATUS.Unknown]: { label: 'Bilinmiyor', color: palette.neutral },
  [SITE_STATUS.Connected]: { label: 'Bağlı', color: palette.success },
  [SITE_STATUS.AuthFailed]: { label: 'Anahtar reddedildi', color: palette.danger },
  [SITE_STATUS.Unreachable]: { label: 'Ulaşılamıyor', color: palette.warning },
};

export function StatusDot({ status }: { status: SiteStatus }) {
  const meta = STATUS_META[status];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: palette.textMuted }}>
      <span style={statusDot(meta.color)} />
      {meta.label}
    </span>
  );
}

// Talep tipi → ikon + etiket. Teklif ile mesaj listede tek bakışta ayrılsın.
export const REQUEST_TYPE_META: Record<SiteRequestType, { label: string; Icon: LucideIcon }> = {
  [REQUEST_TYPE.Offer]: { label: 'Teklif Talebi', Icon: FileText },
  [REQUEST_TYPE.Message]: { label: 'İletişim Mesajı', Icon: MessageSquare },
};

// ERP iç durumu. Renk iş anlamı taşıyor: yeni = aksan (dikkat), kazanıldı =
// yeşil, kaybedildi = kırmızı, kapandı = nötr.
export const REQUEST_STATUS_META: Record<SiteRequestStatus, { label: string; color: string }> = {
  [REQUEST_STATUS.New]: { label: 'Yeni', color: palette.accent },
  [REQUEST_STATUS.InProgress]: { label: 'İşleniyor', color: palette.warning },
  [REQUEST_STATUS.Quoted]: { label: 'Teklif verildi', color: palette.bot },
  [REQUEST_STATUS.Won]: { label: 'Kazanıldı', color: palette.success },
  [REQUEST_STATUS.Lost]: { label: 'Kaybedildi', color: palette.danger },
  [REQUEST_STATUS.Closed]: { label: 'Kapandı', color: palette.neutral },
};

export function StatusBadge({ status }: { status: SiteRequestStatus }) {
  const meta = REQUEST_STATUS_META[status];
  return (
    <span style={{
      fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
      background: softTint(meta.color, 14), color: meta.color, whiteSpace: 'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: SiteRequestType }) {
  const meta = REQUEST_TYPE_META[type];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
      background: palette.chipBg, color: palette.textMuted, whiteSpace: 'nowrap',
    }}>
      <meta.Icon size={icon.sm} strokeWidth={icon.stroke} />
      {meta.label}
    </span>
  );
}

// Tarih yoksa (sitede tarih alanı sonradan eklendi) tire göster — "Invalid Date"
// yazdırmak kullanıcıya hiçbir şey anlatmaz.
export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
