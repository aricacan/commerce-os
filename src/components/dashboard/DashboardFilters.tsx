'use client';

import { useQuery } from '@tanstack/react-query';
import { categoryApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useDashboardFilters } from '../../stores/dashboard-filters';
import { DateRangePicker } from '../ui/DateRangePicker';
import { Select } from '../ui/Select';

const ALL_VALUE = -1;

export function DashboardFilters() {
  const { t } = useI18n();
  const {
    dateRange, setDateRange,
    customFrom, customTo, setCustomDates,
    categoryId, setCategoryId,
  } = useDashboardFilters();

  const { data: categories } = useQuery({
    queryKey: ['categories-master'],
    queryFn: categoryApi.master,
    staleTime: 300_000,
  });

  return (
    <div className="grid w-full grid-cols-2 gap-2 px-3 pt-3 sm:flex sm:w-auto sm:items-center sm:gap-3 sm:px-5 sm:pt-4">
      {/* Pano görünümü değiştirici (E-ticaret ↔ Fabrika) BURADA YOK: seçim giriş
          ekranında yapılıyor (bkz. DashboardChooser) ve aynı seçimi iki yerde sunmak
          gereksiz. Görünüm değiştirmek için sol menüden "Kontrol Paneli"ne dönülür. */}
      <DateRangePicker
        className="w-full sm:w-auto"
        value={dateRange}
        onChange={(p) => { if (p !== 'all') setDateRange(p); }}
        customFrom={customFrom}
        customTo={customTo}
        onCustomChange={setCustomDates}
      />

      {/* Category Selector */}
      <Select
        className="w-full sm:w-auto"
        value={categoryId ?? ALL_VALUE}
        onChange={(v) => setCategoryId(v === ALL_VALUE ? undefined : v)}
        options={[
          { value: ALL_VALUE, label: t('orders_all_categories') },
          ...(categories?.map(c => ({ value: c.id, label: c.name })) ?? []),
        ]}
      />
    </div>
  );
}
