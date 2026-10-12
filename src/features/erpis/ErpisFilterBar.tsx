'use client';

import { FilterSelect } from '../../components/ui/FilterSelect';
import { useErpisCompanies, useErpisDatasets } from '@/hooks/erpis/useErpis';

// Firma ve rapor tipi seçicisi — Genel Bakış ve Analiz sekmelerinin ortak başlığı.
//
// Bu seçici topbar'daki Ülke→ERP→Firma kaskadının yerine geçer: Erpis verisi canlı ERP
// bağlantısından değil elle yüklenen dosyalardan gelir, o kaskadın burada karşılığı yoktur.
// (Kaskadın kendisi zaten görünmez — modül tam ekran kabuğu topbar'ı kapatır.)
const ALL = 'all';

interface Props {
  companyId: number | null;
  datasetId: number | null;
  onCompanyChange: (id: number | null) => void;
  onDatasetChange: (id: number | null) => void;
}

export function ErpisFilterBar({ companyId, datasetId, onCompanyChange, onDatasetChange }: Props) {
  const companies = useErpisCompanies();
  const datasets = useErpisDatasets();

  const companyOptions = [
    { value: ALL, label: 'Tüm firmalar' },
    ...(companies.data ?? []).map((c) => ({ value: String(c.id), label: c.name, sublabel: c.code })),
  ];

  const datasetOptions = [
    { value: ALL, label: 'Tüm raporlar' },
    ...(datasets.data ?? []).map((d) => ({ value: String(d.id), label: d.name })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterSelect
        value={companyId ? String(companyId) : ALL}
        options={companyOptions}
        placeholder="Firma"
        onChange={(v) => onCompanyChange(v === ALL ? null : Number(v))}
        minWidth={180}
      />
      <FilterSelect
        value={datasetId ? String(datasetId) : ALL}
        options={datasetOptions}
        placeholder="Rapor tipi"
        onChange={(v) => onDatasetChange(v === ALL ? null : Number(v))}
        minWidth={180}
      />
    </div>
  );
}
