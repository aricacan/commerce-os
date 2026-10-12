'use client';

import { Radio } from 'lucide-react';
import { useErpisSqlSources } from '@/hooks/erpis/useErpis';
import { formatDateTime } from './shared';

// Yükle sekmesinin üstündeki bilgi şeridi: açık bir canlı kaynak varsa kullanıcı Excel
// yüklemeye kalkmadan önce verinin zaten SQL'den otomatik geldiğini görsün.
export function LiveDataBanner({ onOpenLiveData }: { onOpenLiveData: () => void }) {
  const sources = useErpisSqlSources();
  const live = (sources.data ?? []).filter((s) => s.isEnabled);

  if (live.length === 0) return null;

  // Stok kartı prosedürü kartların yalnız B2B alt kümesini veriyor (bkz. ErpisSqlSyncCatalog).
  const stockCardsLive = live.some((s) => s.key === 'stock-cards');

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[4px] border border-emerald-300 bg-emerald-50 px-3 py-2 text-emerald-900">
      <div className="flex items-start gap-2">
        <Radio size={15} strokeWidth={1.8} className="mt-0.5 shrink-0" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-bold">Veriler artık canlı olarak Erpis&apos;ten otomatik alınıyor.</span>
          <span className="text-[11px]">
            {live.map((s) => `${s.displayName} (son başarılı: ${s.lastSuccessAt ? formatDateTime(s.lastSuccessAt) : '—'})`).join(' · ')}
          </span>
          <span className="text-[11px]">
            Excel yüklemesine gerek yok; yalnız canlı veri çalışmazsa yedek olarak kullanın.
          </span>
          {stockCardsLive && (
            <span className="text-[11px] font-semibold">
              İstisna: canlı stok kartları yalnız B2B kartlarını getirir. Tüm kartlar ve EAN, ölçü,
              tedarikçi bilgileri için Excel stok kartı dosyasını yüklemeye devam edin.
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenLiveData}
        className="rounded-[4px] border border-emerald-300 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-900"
      >
        Canlı Veri ayarları
      </button>
    </div>
  );
}
