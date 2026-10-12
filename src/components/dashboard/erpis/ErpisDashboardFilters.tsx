'use client';

import { useDashboardFilters } from '../../../stores/dashboard-filters';
import { DateRangePicker } from '../../ui/DateRangePicker';
import { ERPIS_SCOPES, ERPIS_SCOPE_LABELS, type ErpisScope } from '@/lib/api';

// Erpis panosunun filtre çubuğu.
//
// Tarih aralığı ORTAK store'dan geliyor — görünüm değiştirince dönem korunsun. Kategori
// filtresine hiç dokunulmuyor; o e-ticarete ait.
//
// Üç kontrol de AYNI yükseklikte (36px): tarih seçici ortak `.dropdown-trigger` stilini
// kullanıyor, firma seçicisi aynı varyanta geçirildi, pazar seçimi de aynı ölçüde bir
// segment kontrolü. Farklı yüksekliklerde yan yana duran kutular çubuğu dağıtıyordu.
//
// ZAMAN KIRILIMI SEÇİCİSİ YOK: grafiklerin çözünürlüğü seçili tarih aralığından
// türetiliyor (bkz. resolveErpisBucket). Kullanıcıya "kova" diye ayrı bir kavram
// sunmak, zaten tarihten belli olan bir şeyi ikinci kez sormaktı.
//
// FİRMA SEÇİCİSİ YOK: firma artık giriş ekranındaki karttan geliyor (bkz.
// DashboardChooser) ve URL'de yaşıyor. Aynı kararı iki yerde sormak, kullanıcıyı
// "hangi firmadayım" sorusuna düşürüyordu. Hangi firmada olduğu çubukta YAZILI —
// seçici kalkınca bilgi de kalkmamalı.
import { Select } from '../../ui/Select';

interface Props {
  companyName?: string;
  scope: ErpisScope;
  onScopeChange: (scope: ErpisScope) => void;
}

export function ErpisDashboardFilters({ companyName, scope, onScopeChange }: Props) {
  const dateRange = useDashboardFilters((s) => s.dateRange);
  const customFrom = useDashboardFilters((s) => s.customFrom);
  const customTo = useDashboardFilters((s) => s.customTo);
  const setDateRange = useDashboardFilters((s) => s.setDateRange);
  const setCustomDates = useDashboardFilters((s) => s.setCustomDates);

  return (
    <div className="flex flex-shrink-0 items-center gap-2 px-3 pt-3 sm:px-5 sm:pt-4 overflow-x-auto no-scrollbar flex-nowrap sm:flex-wrap">
      <DateRangePicker
        value={dateRange}
        onChange={(p) => { if (p !== 'all') setDateRange(p); }}
        customFrom={customFrom}
        customTo={customTo}
        onCustomChange={setCustomDates}
      />

      {companyName && (
        <span className="flex h-9 shrink-0 items-center rounded-[6px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 sm:px-3 text-[12px] sm:text-[12.5px] font-bold text-[var(--fg)]">
          {companyName}
        </span>
      )}

      {/* Mobilde açılır liste (Dropdown): tek satıra rahat sığar */}
      <div className="flex sm:hidden shrink-0">
        <Select
          value={scope}
          onChange={(v) => onScopeChange(v as ErpisScope)}
          options={ERPIS_SCOPES.map((option) => ({
            value: option,
            label: ERPIS_SCOPE_LABELS[option],
          }))}
        />
      </div>

      {/* Geniş ekranda hızlı segment kontrolü */}
      <div
        role="radiogroup"
        aria-label="Pazar"
        className="hidden sm:flex h-9 items-center gap-0.5 rounded-[6px] border border-[var(--border)] bg-[var(--card)] p-0.5 shadow-xs"
      >
        {ERPIS_SCOPES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={scope === option}
            onClick={() => onScopeChange(option)}
            className={`h-full rounded-[4px] px-3 text-[12px] font-semibold transition-colors ${
              scope === option
                ? 'bg-[var(--bg-subtle)] text-[var(--fg)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
            }`}
          >
            {ERPIS_SCOPE_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
