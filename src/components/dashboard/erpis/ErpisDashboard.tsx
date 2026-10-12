'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDashboardFilters } from '../../../stores/dashboard-filters';
import { resolveDatePreset } from '../../../utils/date';
import { useErpisCompanies } from '@/hooks/erpis/useErpis';
import type { ErpisQueryFilter, ErpisScope } from '@/lib/api';
import { resolveErpisBucket } from './erpisBucket';
import { ErpisDashboardFilters } from './ErpisDashboardFilters';
import { ErpisKpiBar } from './ErpisKpiBar';
import { ErpisDashboardWidgets } from './ErpisDashboardWidgets';

// Panonun Erpis görünümü — aynı kiracının Erpis'ten yüklenen verisi.
//
// E-ticaret görünümüyle tek ortak filtre TARİH: aynı kavram, aynı store'dan okunuyor ki
// görünümler arası geçişte dönem korunsun. Kategori filtresi ve mağaza/platform seçimi
// e-ticarete özgüdür, burada okunmaz ve YAZILMAZ.
//
// KPI ve widget'ların HEPSİ tek filtre nesnesinden besleniyor: üstteki tarih, firma,
// pazar ve kova seçimi ekrandaki her rakama aynı anda uygulanır.
export function ErpisDashboard() {
  const dateRange = useDashboardFilters((s) => s.dateRange);
  const customFrom = useDashboardFilters((s) => s.customFrom);
  const customTo = useDashboardFilters((s) => s.customTo);

  const [scope, setScope] = useState<ErpisScope>('all');

  const companies = useErpisCompanies();

  // FİRMA URL'DEN GELİYOR, ekrandan seçilmiyor.
  //
  // Giriş ekranında her firmanın kendi kartı var (bkz. DashboardChooser) ve kullanıcı
  // hangi şirkete baktığını oraya tıklayarak söylüyor. Panonun içinde ikinci bir firma
  // seçici, aynı kararı iki yerde sormak olurdu — ve iki yer birbirinden habersizken
  // kullanıcı "DEMO Levha'ya tıkladım ama Otomotiv'i görüyorum" durumuna düşüyordu.
  //
  // Parametre yoksa ilk aktif firma: doğrudan /dashboard/erpis yazan ya da eski bir
  // yer imi açan kullanıcı boş ekran görmemeli.
  const params = useSearchParams();
  const requested = Number(params.get('companyId'));

  const companyId = Number.isFinite(requested) && requested > 0
    ? requested
    : (companies.data ?? []).find((c) => c.isActive)?.id ?? null;

  const companyName = companies.data?.find((c) => c.id === companyId)?.name;

  // Store'dan TÜREV değer selector içinde hesaplanmıyor: her render'da yeni nesne dönen
  // bir selector sonsuz döngüye yol açıyor (projede daha önce yaşandı).
  const { from, to } = useMemo(
    () => resolveDatePreset(dateRange, customFrom, customTo),
    [dateRange, customFrom, customTo],
  );

  // Zaman çözünürlüğü tarihten TÜRETİLİYOR: "bu ay" 8 günse 8 dilim, "son 3 ay" haftalık,
  // "son 1 yıl" aylık. Kullanıcıya ayrı bir kova seçtirmek, zaten tarihten belli olan bir
  // şeyi ikinci kez sormaktı ve yanlış seçimde grafik tek noktaya düşüyordu.
  const bucket = useMemo(() => resolveErpisBucket(from, to), [from, to]);

  const filter: ErpisQueryFilter = useMemo(
    () => ({ companyId, from, to, bucket, scope: scope === 'all' ? undefined : scope }),
    [companyId, from, to, bucket, scope],
  );

  // Önceki eşit uzunluktaki dönem — KPI değişim yüzdeleri bununla hesaplanır.
  const previousFilter: ErpisQueryFilter = useMemo(
    () => ({ ...filter, ...previousPeriod(from, to) }),
    [filter, from, to],
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <ErpisDashboardFilters
        companyName={companyName}
        scope={scope}
        onScopeChange={setScope}
      />
      <ErpisKpiBar filter={filter} previousFilter={previousFilter} />
      <ErpisDashboardWidgets queryFilter={filter} />
    </div>
  );
}

// Seçili dönemle AYNI GÜN SAYISINDA, hemen öncesindeki aralık. Eşit uzunluk şart:
// 30 günü 31 günle karşılaştırmak yapay bir artış üretirdi.
function previousPeriod(from: string, to: string): { from: string; to: string } {
  const start = new Date(from);
  const end = new Date(to);
  const dayMs = 86_400_000;
  const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

  const prevEnd = new Date(start.getTime() - dayMs);
  const prevStart = new Date(prevEnd.getTime() - (lengthDays - 1) * dayMs);

  return { from: isoDate(prevStart), to: isoDate(prevEnd) };
}

// Yerel tarih bileşenleriyle: toISOString() UTC'ye çevirip günü kaydırabiliyor.
function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
