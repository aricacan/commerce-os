'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useErpisParseStatus, useErpisReparse } from '@/hooks/erpis/useErpisCatalog';
import type { ErpisReparseResult } from '@/lib/api';
import { useAuthStore } from '../../stores/auth';
import { formatNumber } from './shared';
import { icon, palette } from '../shared/design';

// Yazma yetkisi olan roller — backend'deki WritePolicy ile aynı.
//
// Buradaki kontrol yalnız GÖRSEL: sunucu aynı kuralı ayrıca uyguluyor (403). Arayüzü
// gizlemek tek başına güvenlik değildir, ama yetkisi olmayana çalışmayacak bir buton
// göstermek de kötü bir deneyim.
export const WRITE_ROLES = ['SuperAdmin', 'Admin'];

// Sözlük değiştikten sonra kartların adlarını yeniden ayrıştırır.
//
// Otomatik tetiklenmiyor: tüm kataloğu tarıyor ve kullanıcı arka arkaya beş sözlük
// kaydı eklerken beş kez çalıştırmanın anlamı yok. Sonuç, sözlüğe eklemenin gerçekten
// işe yarayıp yaramadığını rakamla söylüyor.
export function ReparseButton() {
  const roles = useAuthStore((state) => state.user?.roles);
  const canWrite = roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  const reparse = useErpisReparse();
  const [result, setResult] = useState<ErpisReparseResult | null>(null);

  if (!canWrite) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={reparse.isPending}
        onClick={async () => setResult(await reparse.mutateAsync({ onlyOutdated: false }))}
        className="flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] px-2.5 text-[12px] font-bold text-[var(--fg)] disabled:opacity-50"
      >
        <RefreshCw
          size={icon.md}
          strokeWidth={icon.stroke}
          className={reparse.isPending ? 'animate-spin' : undefined}
        />
        {reparse.isPending ? 'Ayrıştırılıyor…' : 'Yeniden ayrıştır'}
      </button>

      {result && (
        <span className="text-[11.5px]" style={{ color: palette.textMuted }}>
          {formatNumber(result.updated)} kart · markalı {formatNumber(result.brandedBefore)} →{' '}
          <strong style={{ color: palette.text }}>{formatNumber(result.brandedAfter)}</strong>
          {result.skuKindsFixed > 0
            && ` · ${formatNumber(result.skuKindsFixed)} kartın kod türü düzeltildi`}
          {result.skippedManual > 0 && ` · ${formatNumber(result.skippedManual)} elle düzeltilmiş korundu`}
        </span>
      )}
    </div>
  );
}

// Ayrıştırıcı güncellendikten sonra kayıtlı kartlar eski sürümle kalır. Bant yalnız
// güncellenecek kart varsa görünür ve tek tıkla YALNIZ onları ayrıştırır.
//
// Açılışta otomatik çalışmıyor: Hangfire kiracısız (sistem kapsamı) koşuyor, ayrıştırma
// ise kiracının sözlüğüyle yapılmalı. Buradaki istek kullanıcının kendi kiracısında.
export function OutdatedParseBanner() {
  const roles = useAuthStore((state) => state.user?.roles);
  const canWrite = roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  const status = useErpisParseStatus(canWrite);
  const reparse = useErpisReparse();

  const outdated = status.data?.outdatedCount ?? 0;
  if (!canWrite || outdated === 0) return null;

  return (
    <div className="px-2.5 pt-2 sm:px-4">
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] px-3 py-2 text-[12px]"
      style={{ background: palette.chipBg, color: palette.text }}
    >
      <span>
        <strong>{formatNumber(outdated)} kart</strong> eski ayrıştırma sürümüyle duruyor —
        ölçü/marka gibi alanlar güncel kurallarla yeniden okunmalı.
      </span>
      <button
        type="button"
        disabled={reparse.isPending}
        onClick={() => reparse.mutate({ onlyOutdated: true })}
        className="flex h-7 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-2.5 text-[11.5px] font-bold text-[var(--bg)] disabled:opacity-50"
      >
        <RefreshCw
          size={icon.sm}
          strokeWidth={icon.stroke}
          className={reparse.isPending ? 'animate-spin' : undefined}
        />
        {reparse.isPending ? 'Güncelleniyor…' : 'Şimdi güncelle'}
      </button>
    </div>
    </div>
  );
}
