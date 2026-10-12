'use client';

import { SectionCard, formatCompact, formatNumber } from './shared';
import { useErpisDataHealth, useErpisOrdersSummary } from '@/hooks/erpis/useErpisQuery';
import type { ErpisQueryFilter } from '@/lib/api';

// Para Birimi Kırılımı — her döviz AYRI ve HAM tutarıyla.
//
// Üstteki KPI tek bir "3,5 Mn TL" gösteriyor; o rakam kurdan çevrilmiş bir toplam.
// "USD 4.900" gerçekten var mı sorusunun cevabı orada yok. Bu kart her para birimini
// kendi tutarıyla, çevirmeden gösteriyor — çevrilmiş toplam ayrı satırda duruyor.
//
// İki eksik durum da AÇIKÇA yazılıyor:
//   • Para birimi boş satırlar (Erpis'in PBRM kolonu dolmamış)
//   • Tutarı boş/sıfır satırlar (fiyat girilmemiş)
// Bunlar sessizce sıfır sayılırsa toplam doğru görünüp aslında eksik oluyor.

interface Props {
  filter: ErpisQueryFilter;
}

const UNKNOWN_CURRENCY = 'Belirsiz';

export function ErpisCurrencyCard({ filter }: Props) {
  const summary = useErpisOrdersSummary({ ...filter, convertTo: 'TL' });
  const health = useErpisDataHealth(filter);

  const totals = summary.data?.totals ?? [];
  const converted = summary.data?.converted;
  const missing = converted?.missingRates ?? [];

  return (
    <SectionCard title="Para Birimi Kırılımı" subtitle="Her döviz kendi tutarıyla, çevrilmeden">
      {totals.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--fg-muted)]">
          Bu filtrede tutar okunabilen kalem yok.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {totals.map((total) => (
              <div
                key={total.currency}
                className="flex flex-col gap-0.5 rounded-[5px] border border-[var(--border-soft)] bg-[var(--card)] px-3 py-2"
              >
                <span className="text-[9.5px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
                  {total.currency === UNKNOWN_CURRENCY ? 'Para birimi boş' : total.currency}
                </span>
                <span className="text-[16px] font-extrabold leading-tight tabular-nums text-[var(--fg)]">
                  {formatCompact(total.total)}
                </span>
                <span className="text-[9px] text-[var(--fg-muted)]">
                  {formatNumber(total.rowCount)} kalem
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1 border-t border-[var(--border-soft)] pt-2.5">
            {converted && (
              <Row
                label={`Kurdan çevrilmiş toplam (${converted.currency})`}
                value={formatCompact(converted.total)}
                note={`TCMB · ${converted.rateDate}`}
              />
            )}

            {/* Kuru bulunamayanlar toplama GİRMEDİ — sessizce yutulmadıklarını yazmak,
                "rakam neden tutmuyor" sorusunu baştan kapatıyor. */}
            {missing.length > 0 && (
              <Row
                label="Kuru bulunamadığı için toplama girmeyen"
                value={missing.join(', ')}
                warn
              />
            )}

            {(health.data?.linesWithoutAmount ?? 0) > 0 && (
              <Row
                label="Tutarı girilmemiş kalem"
                value={formatNumber(health.data!.linesWithoutAmount)}
                note="Raporda net tutar kolonu boş ya da sıfır"
                warn
              />
            )}

            {(health.data?.linesWithoutCurrency ?? 0) > 0 && (
              <Row
                label="Para birimi girilmemiş kalem"
                value={formatNumber(health.data!.linesWithoutCurrency)}
                note="Erpis'in PBRM kolonu boş"
                warn
              />
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function Row({ label, value, note, warn = false }: {
  label: string;
  value: string;
  note?: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="min-w-0 text-[11px] text-[var(--fg-muted)]">
        {label}
        {note && <span className="text-[var(--fg-subtle)]"> · {note}</span>}
      </span>
      <span
        className={`shrink-0 text-[11.5px] font-extrabold tabular-nums ${
          warn ? 'text-[rgba(180,83,9,0.9)]' : 'text-[var(--fg)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
