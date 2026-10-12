'use client';

import { useQueries } from '@tanstack/react-query';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { ErpisCard, ErpisEmpty, ErpisHero, ErpisLoader } from './ErpisWidgetShell';
import { useErpisChartTheme } from './useErpisChartTheme';
import { formatCompact, formatNumber } from '../../../features/erpis/shared';
import { erpisQueryApi, type ErpisQueryFilter } from '@/lib/api';

// Dönem Karşılaştırması — "geçen döneme göre nasılız" sorusunun cevabı.
//
// Pencereler ÜSTTEKİ TARİHE bağlı: seçili dönem, ondan hemen önceki eşit uzunluktaki
// dönem ve geçen yılın aynı dönemi. Daha önce sabit pencereler (Bu Ay / Geçen Ay /
// Son 3 Ay / Bu Yıl) gösteriliyordu ve tarih filtresini yok sayıyordu.
//
// Tablo yerine ÇUBUK + DEĞİŞİM: dört sütunlu bir sayı tablosunda "arttı mı azaldı mı"
// sorusu ancak iki rakamı zihinde bölerek cevaplanıyordu. Çubuk oranı gösteriyor,
// yüzde rozeti yönü söylüyor.

interface Props {
  filter: ErpisQueryFilter;
  /** Ortalama Sipariş Değeri (AOV) hero istatistiğini de göster — Sipariş Analiz
   * paneli için (bkz. OrderAnalysisWidgets.tsx). Genel Bakış'ta kapalı: kart zaten
   * dört rakam gösteriyor, beşincisi orada gürültü olurdu. */
  showAov?: boolean;
}

interface PeriodWindow {
  key: string;
  label: string;
  from: string;
  to: string;
}

export function ErpisPeriodSummary({ filter, showAov = false }: Props) {
  const theme = useErpisChartTheme();
  const windows = periodWindows(filter.from ?? null, filter.to ?? null);

  // Üç pencere üç ayrı sorgu: sunucuda tek uç yazmak, dönem mantığını hem burada hem
  // orada tutmak demekti. Filtrenin geri kalanı (firma, pazar, marka…) aynen taşınıyor —
  // yalnız tarih değişiyor ki karşılaştırma gerçekten aynı veri kümesi üzerinde olsun.
  const results = useQueries({
    queries: windows.map((w) => ({
      queryKey: ['erpis-q-period', filter, w.key],
      queryFn: () => erpisQueryApi.summary({
        ...filter, from: w.from, to: w.to, convertTo: 'TL',
      }),
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error)?.error;

  const rows = windows.map((w, i) => {
    const data = results[i].data;

    return {
      ...w,
      currency: data?.converted?.currency ?? data?.totals[0]?.currency ?? null,
      amount: data?.converted?.total ?? data?.totals[0]?.total ?? 0,
      quantity: data?.totalQuantity ?? 0,
      lineCount: data?.lineCount ?? 0,
      orderCount: data?.orderCount ?? 0,
    };
  });

  const current = rows[0];
  const max = Math.max(...rows.map((r) => r.amount), 0);
  const hasAnyData = rows.some((row) => row.lineCount > 0);

  return (
    <ErpisCard
      title="Dönem Karşılaştırması"
      subtitle="Seçili dönem, öncesi ve geçen yıl"
      exportData={() => (!hasAnyData ? null : {
        columns: [
          { key: 'label', header: 'Dönem', type: 'text' },
          { key: 'from', header: 'Başlangıç', type: 'date' },
          { key: 'to', header: 'Bitiş', type: 'date' },
          { key: 'amount', header: `Tutar${current.currency ? ` (${current.currency})` : ''}`, type: 'money' },
          { key: 'orderCount', header: 'Sipariş', type: 'int' },
          { key: 'lineCount', header: 'Kalem', type: 'int' },
          { key: 'quantity', header: 'Miktar', type: 'decimal' },
        ],
        rows: rows.map((row) => ({
          label: row.label,
          from: row.from,
          to: row.to,
          amount: row.amount,
          orderCount: row.orderCount,
          lineCount: row.lineCount,
          quantity: row.quantity,
        })),
      })}
    >
      {isLoading ? (
        <ErpisLoader />
      ) : error ? (
        <ErpisEmpty
          title="Özet yüklenemedi"
          hint={error instanceof Error ? error.message : 'Bağlantıyı kontrol edip tekrar deneyin.'}
        />
      ) : !hasAnyData ? (
        <ErpisEmpty
          title="Bu dönem için veri yok"
          hint="Üstteki tarih aralığını genişletmeyi deneyin."
        />
      ) : (
        <>
          <ErpisHero
            value={formatCompact(current.amount)}
            label={current.currency ? `Seçili dönem (${current.currency})` : 'Seçili dönem'}
            stats={[
              { label: 'Sipariş', value: formatNumber(current.orderCount) },
              { label: 'Kalem', value: formatNumber(current.lineCount) },
              { label: 'Miktar', value: formatCompact(current.quantity) },
              ...(showAov ? [{
                label: 'Ort. Sipariş',
                value: formatCompact(current.orderCount > 0 ? current.amount / current.orderCount : 0),
              }] : []),
            ]}
          />

          <div>
            {rows.map((row, index) => {
              // Değişim her zaman SEÇİLİ DÖNEME göre: kullanıcı "şu an neredeyim, önceye
              // göre nasılım" diye bakıyor, satırlar arası zincirleme değişime değil.
              const delta = index === 0 || row.amount === 0
                ? null
                : ((current.amount - row.amount) / Math.abs(row.amount)) * 100;

              return (
                <div key={row.key} className="erpis-rank-row">
                  <div className="erpis-rank-body">
                    <span className="erpis-rank-label">
                      {row.label}
                      <span style={{ color: theme.tick, fontWeight: 500 }}>
                        {' '}· {formatDayRange(row.from, row.to)}
                      </span>
                    </span>
                    <div className="erpis-bar-track">
                      <div
                        className="erpis-bar-fill"
                        style={{
                          width: `${max > 0 ? Math.max(2, (row.amount / max) * 100) : 2}%`,
                          background: theme.amount,
                          // Seçili dönem tam güçte, karşılaştırma dönemleri soluk:
                          // hangisinin "şimdi" olduğu tek bakışta belli olmalı.
                          opacity: index === 0 ? 1 : 0.45,
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span className="erpis-rank-value">
                      {row.lineCount === 0 ? '—' : formatCompact(row.amount)}
                    </span>
                    <span className="erpis-rank-share">
                      {delta === null
                        ? `${formatNumber(row.lineCount)} kalem`
                        : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 2,
                            color: delta >= 0 ? '#10b981' : '#f43f5e', fontWeight: 700,
                          }}>
                            {delta >= 0
                              ? <TrendingUp size={9} strokeWidth={2.5} />
                              : <TrendingDown size={9} strokeWidth={2.5} />}
                            {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                          </span>
                        )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </ErpisCard>
  );
}

// Seçili dönem + öncesi + geçen yılın aynı dönemi.
//
// Önceki dönem AYNI GÜN SAYISINDA: 30 günü 31 günle karşılaştırmak yapay bir fark
// üretirdi. Geçen yıl aynı dönem, mevsimsellik taşıyan bir işte tek anlamlı kıyas.
function periodWindows(from: string | null, to: string | null): PeriodWindow[] {
  if (!from || !to) return [];

  const start = new Date(from);
  const end = new Date(to);
  const dayMs = 86_400_000;
  const lengthDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs) + 1);

  const prevEnd = new Date(start.getTime() - dayMs);
  const prevStart = new Date(prevEnd.getTime() - (lengthDays - 1) * dayMs);

  const lastYearStart = new Date(start);
  lastYearStart.setFullYear(start.getFullYear() - 1);
  const lastYearEnd = new Date(end);
  lastYearEnd.setFullYear(end.getFullYear() - 1);

  return [
    { key: 'current', label: 'Seçili Dönem', from, to },
    { key: 'previous', label: 'Önceki Dönem', from: iso(prevStart), to: iso(prevEnd) },
    { key: 'last-year', label: 'Geçen Yıl', from: iso(lastYearStart), to: iso(lastYearEnd) },
  ];
}

// "3 Eyl – 8 Eyl" — hangi tarihlerin karşılaştırıldığı görünsün.
function formatDayRange(from: string, to: string): string {
  const short = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return from === to ? short(from) : `${short(from)} – ${short(to)}`;
}

// Yerel tarih bileşenleriyle biçimlendirilir: toISOString() UTC'ye çevirip ayın ilk
// gününü bir önceki aya kaydırabiliyor.
function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
