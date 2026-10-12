'use client';

import { OrderAnalysisWidgets } from '../../components/dashboard/erpis/OrderAnalysisWidgets';
import { useErpisFilterState } from './useErpisFilterState';

// Sipariş Analiz sekmesi — "Sipariş" bölümünde Siparişler/Karma Siparişler/Planlama'nın
// yanında (bkz. ErpisWorkspace.TABS). Bkz. docs/superpowers/specs/2026-09-15-siparis-analiz-design.md.
//
// Kendi filtre çubuğu YOK: workspace kabuğu zaten üstte ErpisQueryFilterBar'ı gösteriyor
// (bkz. ErpisWorkspace.FILTERED_TABS) — diğer sekmelerle aynı tarih/firma/pazar filtresini
// paylaşır. Widget'lar bu ortak filtreyi devralır, yalnız pazar (scope) her kartta kendi
// sabit değeriyle (genel/yurt içi/yurt dışı) ezilir.
export function OrderAnalysisTab({ companyId }: { companyId: number | null }) {
  const { filter } = useErpisFilterState(companyId);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ConstructionBanner />
      <OrderAnalysisWidgets queryFilter={filter} />
    </div>
  );
}

// GEÇİCİ — panel tüm planlanan alanlarla tamamlanınca kaldırılır. Faz numarası
// bilerek YAZILMAZ: kullanıcıya iç geliştirme takvimi değil, "hâlâ genişliyor" bilgisi
// veriliyor.
function ConstructionBanner() {
  return (
    <div className="mx-2.5 mt-2.5 sm:mx-4 sm:mt-3 flex items-center gap-3 rounded-[8px] border border-amber-300/60 bg-amber-50 px-4 py-3 text-[14px] font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
      <span aria-hidden className="text-[20px]">🚧</span>
      <span>
        Bu panel yapım aşamasında, yeni özellikler ekleniyor.
      </span>
    </div>
  );
}
