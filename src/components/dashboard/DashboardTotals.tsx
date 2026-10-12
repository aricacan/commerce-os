'use client';

import { Sigma } from 'lucide-react';
import type { ErpisCompanyOverview } from '@/lib/api';
import type { DashboardOverview } from '../../types/api';
import { count, formatRange, money } from './DashboardCardParts';

// Giriş ekranının en üstündeki TOPLAM şeridi.
//
// Kartlar "hangi panoya gireyim" sorusunu cevaplıyor; bu şerit ondan önceki soruyu:
// "şirket toplamda ne durumda". E-ticaret ve bütün Erpis firmaları tek satırda toplanıyor
// — kullanıcı bugüne kadar iki kartın rakamlarını kafadan topluyordu.
//
// Şerit kartların YARISI kadar: burada karar verilmiyor, durum okunuyor. Kartlarla aynı
// yükseklikte olsaydı hangisine bakılacağı belirsizleşirdi.
export function DashboardTotals({ ecommerce, companies }: {
  ecommerce?: DashboardOverview;
  companies: readonly ErpisCompanyOverview[];
}) {
  const revenue = (ecommerce?.month.amount ?? 0)
    + companies.reduce((sum, c) => sum + c.month.amount, 0);

  const orders = (ecommerce?.month.orderCount ?? 0)
    + companies.reduce((sum, c) => sum + c.month.orderCount, 0);

  const items = (ecommerce?.month.productCount ?? 0)
    + companies.reduce((sum, c) => sum + c.month.itemCount, 0);

  // Başlığın altındaki "bu ay" aralığı: e-ticaret yoksa ilk firmanınki.
  const range = formatRange(
    ecommerce?.monthFrom ?? companies[0]?.monthFrom,
    ecommerce?.monthTo ?? companies[0]?.monthTo,
  );

  // Yurt içi/dışı ve döviz kırılımı YALNIZ Erpis'ten geliyor.
  let extraDomesticFromUnknown = 0;
  const currencies = new Map<string, number>();
  for (const company of companies) {
    for (const row of company.currencies) {
      const code = (row.currency ?? '').trim().toUpperCase();
      if (!code || code === 'TL' || code === 'TRY' || code === 'BELIRSIZ' || code === 'BELİRSİZ' || code === '—') {
        if (code === 'BELIRSIZ' || code === 'BELİRSİZ') {
          extraDomesticFromUnknown += row.total;
        }
        continue;
      }
      currencies.set(code, (currencies.get(code) ?? 0) + row.total);
    }
  }

  const domestic = companies.reduce((sum, c) => sum + c.domestic, 0) + extraDomesticFromUnknown;
  const foreign = Math.max(0, companies.reduce((sum, c) => sum + c.foreign, 0) - extraDomesticFromUnknown);

  // Para birimi kırılımı ÇEVRİLMEMİŞ: "USD 4.900" cümlesi ancak dövizin kendisiyle
  // kurulabilir. Sıfır ve 'BELİRSİZ' olanlar asla gösterilmez.
  const foreignRows = [...currencies.entries()]
    .filter(([currency, total]) => currency !== 'TL' && currency !== 'BELIRSIZ' && currency !== 'BELİRSİZ' && total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="flex flex-col justify-between rounded-[12px] border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 lg:p-7 shadow-xs min-h-[140px] h-full transition-all">
      {/* Başlık: ikon + "Genel", altında bu ayın tarih aralığı */}
      <div className="mb-4 flex flex-col gap-1 border-b border-[var(--border-soft)] pb-3">
        <div className="flex items-center gap-2">
          <Sigma size={16} strokeWidth={2} aria-hidden className="shrink-0 text-[var(--fg-muted)]" />
          <span className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--fg)] sm:text-[13px]">
            Genel
          </span>
        </div>
        {range && (
          <span className="text-[11px] font-medium tabular-nums text-[var(--fg-muted)]">{range}</span>
        )}
      </div>

      {/* Ana Metrikler Satırı */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-8 lg:gap-x-10">
        {/* Toplam Ciro (Hero) */}
        <div className="shrink-0">
          <Total label="Toplam Ciro" value={money(revenue)} unit="TL" hero />
        </div>

        <Divider />

        {/* Hacim Metrikleri */}
        <div className="grid grid-cols-2 gap-4 xs:grid-cols-4 sm:flex sm:flex-wrap sm:items-center sm:gap-x-7 sm:gap-y-3 lg:gap-x-8">
          <Total label="Sipariş" value={count(orders)} />
          <Total label="Ürün / Adet" value={count(items)} />
          <Total label="Yurt İçi" value={money(domestic)} unit="TL" />
          <Total label="Yurt Dışı" value={money(foreign)} unit="TL" />
        </div>

        {foreignRows.length > 0 && (
          <>
            <Divider />
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 lg:gap-8">
              {foreignRows.map(([currency, total]) => (
                <Total key={currency} label={currency} value={money(total)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Mobilde alt açıklama */}
      <span className="mt-3 block text-[10px] font-medium text-[var(--fg-muted)] sm:hidden border-t border-[var(--border-soft)] pt-2">
        Yurt içi/dışı ve döviz yalnız fabrika verisinden
      </span>
    </div>
  );
}

function Total({ label, value, unit, hero = false }: {
  label: string;
  value: string;
  unit?: string;
  hero?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--fg-muted)]">
        {label}
      </span>
      <span
        className={`truncate font-extrabold tabular-nums leading-none text-[var(--fg)] ${
          hero ? 'text-[24px] sm:text-[30px] lg:text-[34px] tracking-tight' : 'text-[16px] sm:text-[18px]'
        }`}
      >
        {value}
        {unit && <span className="ml-1 text-[11px] font-bold text-[var(--fg-muted)]">{unit}</span>}
      </span>
    </div>
  );
}

function Divider() {
  return <span className="hidden h-10 w-px bg-[var(--border-soft)] sm:block shrink-0" />;
}
