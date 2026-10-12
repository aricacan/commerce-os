'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { SectionCard, formatCompact, formatNumber } from './shared';
import {
  useErpisAging, useErpisBreakdown, useErpisFilterOptions, useErpisLines,
} from '@/hooks/erpis/useErpisQuery';
import { ErpisDrawer } from './ErpisDrawer';
import { parseId } from './erpisFilterUtils';
import type { ErpisQueryFilter } from '@/lib/api';

// Bir kovanın gün sınırları — detay sorgusu bu aralığı TARİH FİLTRESİNE çeviriyor.
//
// Sunucuda ayrı bir "yaş detayı" ucu YOK ve gerek de yok: yaş zaten sipariş tarihinden
// hesaplanıyor, dolayısıyla "31-60 gün" demek "bugünden 60 gün önce ile 31 gün önce
// arasında verilmiş açık siparişler" demek. Mevcut kırılım ucu bunu aynen cevaplıyor.
const BUCKET_DAYS: Record<string, { min: number; max: number | null }> = {
  '0-30': { min: 0, max: 30 },
  '31-60': { min: 31, max: 60 },
  '61-90': { min: 61, max: 90 },
  '90+': { min: 91, max: null },
};

const DETAIL_LIMIT = 8;

// Açık Sipariş Yaşlandırması — bu ekranın eyleme dönüşen tek rakamı.
//
// Panoda "2.129 açık kalem" yazıyor ve kimse bir şey yapmıyor; "90 günden eski 40 kalem"
// yazınca biri telefon açıyor. Aynı verinin farklı sorusu, bu yüzden panoda değil burada.
//
// Yaş SİPARİŞ TARİHİNDEN sayılır (sunucuda, bkz. GetAgingAsync); filtre çubuğundaki
// "tarih alanı" seçimi burada geçerli değil — "kaç gündür bekliyor" sorusunun referansı
// her zaman siparişin verildiği gün.
// Renk TEK BİR YERDE kullanılıyor: en eski kova.
//
// Dört kovaya dört ayrı renk vermek, hepsi eşit derecede önemliymiş gibi gösteriyordu.
// Aslında yalnız biri sorun; diğerleri gri tonlarında koyudan açığa gidiyor ve sıralama
// zaten yaşı anlatıyor. Renk vurgudur, dekorasyon değil.
const BUCKET_TONES: Record<string, string> = {
  '0-30': 'var(--border)',
  '31-60': 'var(--fg-subtle)',
  '61-90': 'var(--fg-muted)',
  '90+': 'rgba(91, 141, 239, 0.75)',
};

interface Props {
  filter: ErpisQueryFilter;
}

export function ErpisAgingCard({ filter }: Props) {
  // Kur çevrimi AÇIK: bekleyen tutar tek rakam olarak okunabilsin.
  const [openBucket, setOpenBucket] = useState<string | null>(null);
  const aging = useErpisAging({ ...filter, convertTo: 'TL' });
  const rows = aging.data ?? [];

  const totalLines = rows.reduce((sum, r) => sum + r.lineCount, 0);
  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const currency = rows[0]?.currency ?? '';
  const critical = rows.find((r) => r.key === '90+');

  return (
    <SectionCard
      title="Açık Sipariş Yaşlandırması"
      subtitle="Kalemler kaç gündür bekliyor (sipariş tarihinden)"
    >
      {aging.isLoading ? (
        <div className="h-28 animate-pulse rounded-[4px] bg-[var(--border-soft)]" />
      ) : totalLines === 0 ? (
        <p className="py-6 text-center text-[12px] text-[var(--fg-muted)]">
          Bu filtrede bekleyen açık kalem yok.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[22px] font-extrabold leading-none text-[var(--fg)]">
                {formatNumber(totalLines)}
              </div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
                Açık kalem · {formatCompact(totalAmount)} {currency}
              </div>
            </div>

            {critical && critical.lineCount > 0 && (
              <div className="rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-1.5">
                <span className="text-[11.5px] font-bold text-[var(--fg)]">
                  {formatNumber(critical.lineCount)} kalem 90 günden eski
                </span>
                <span className="ml-1.5 text-[10.5px] text-[var(--fg-muted)]">
                  en eskisi {formatNumber(critical.oldestDays)} gün
                </span>
              </div>
            )}
          </div>

          {/* Tek yığılmış şerit: dört ayrı çubuk oranı göstermiyor, hangi kovanın
              bütünün ne kadarı olduğu ancak yan yana görülünce anlaşılıyor. */}
          <div className="flex h-3 overflow-hidden rounded-full bg-[var(--border-soft)]">
            {rows.map((row) => (
              <div
                key={row.key}
                title={`${row.label}: ${formatNumber(row.lineCount)} kalem`}
                style={{
                  flexGrow: row.lineCount,
                  background: BUCKET_TONES[row.key] ?? 'var(--border)',
                }}
              />
            ))}
          </div>

          {/* Kovalar TIKLANABİLİR: "1.561 kalem 90 günden eski" tek başına eyleme
              dönüşmüyor, "hangi cari" sorusunun cevabı gerekiyor. Tıklayınca o yaş
              aralığındaki açık siparişler cari kırılımıyla açılıyor. */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {rows.map((row) => (
              <button
                key={row.key}
                type="button"
                onClick={() => setOpenBucket((current) => (current === row.key ? null : row.key))}
                aria-expanded={openBucket === row.key}
                className={`flex flex-col gap-0.5 rounded-[5px] border px-3 py-2 text-left transition-colors ${
                  openBucket === row.key
                    ? 'border-[var(--border)] bg-[var(--bg-subtle)]'
                    : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)]'
                }`}
              >
                <span className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
                  <span
                    className="h-2 w-2 rounded-[2px]"
                    style={{ background: BUCKET_TONES[row.key] ?? 'var(--border)' }}
                  />
                  {row.label}
                  {openBucket === row.key
                    ? <ChevronUp size={10} strokeWidth={2.5} className="ml-auto" />
                    : <ChevronDown size={10} strokeWidth={2.5} className="ml-auto" />}
                </span>
                <span className="text-[15px] font-extrabold leading-tight text-[var(--fg)]">
                  {formatNumber(row.lineCount)}
                </span>
                <span className="text-[9px] text-[var(--fg-muted)]">
                  {formatCompact(row.amount)} {currency} · {formatCompact(row.remainingQuantity)} adet
                </span>
              </button>
            ))}
          </div>

          {openBucket && (
            <AgingDetail
              filter={filter}
              bucketKey={openBucket}
              label={rows.find((r) => r.key === openBucket)?.label ?? ''}
            />
          )}
        </div>
      )}
    </SectionCard>
  );
}

// Seçilen yaş aralığındaki açık siparişlerin cari kırılımı.
function AgingDetail({ filter, bucketKey, label }: {
  filter: ErpisQueryFilter;
  bucketKey: string;
  label: string;
}) {
  const range = BUCKET_DAYS[bucketKey];

  const detailFilter: ErpisQueryFilter = {
    ...filter,
    convertTo: 'TL',
    onlyOpen: true,
    // Yaş SİPARİŞ TARİHİNDEN sayılıyor; filtre çubuğundaki tarih alanı seçimi ne olursa
    // olsun detay da aynı eksenden bakmalı, yoksa rakamlar kartla tutmaz.
    dateField: 'order',
    from: range?.max != null ? daysAgo(range.max) : null,
    to: daysAgo(range?.min ?? 0),
  };

  const breakdown = useErpisBreakdown(detailFilter, 'party', DETAIL_LIMIT, 'amount', false);
  const rows = breakdown.data ?? [];

  // Cariye tıklayınca AÇILIR PANEL, başka sekmeye yönlendirme DEĞİL.
  //
  // Önce Siparişler ekranına filtreyle gönderiyordu; iki sorun çıktı: filtre GLOBAL
  // olduğu için diğer sekmeleri de daraltıyordu, ve kullanıcı geri döndüğünde
  // yaşlandırma kartı da o daraltmayla hesaplanıyordu. Panel, ana filtreye hiç
  // dokunmadan o carinin kalemlerini gösteriyor.
  const [openParty, setOpenParty] = useState<{ ids: number[]; name: string } | null>(null);

  // Cari kırılımının ANAHTARI cari ADI, kimliği değil (sunucu adla grupluyor). Panel ise
  // kimlikle süzüyor: önceden Number(ad) → NaN gidiyor ve panel hep boş açılıyordu.
  // Kimlik, aynı filtrenin cari seçeneklerinden ada göre bulunuyor; aynı ad birden çok
  // firmada ayrı kayıt olabildiği için eşleşen TÜM kimlikler alınıyor. Seçenek listesi
  // sunucuda ilk 200 cariyle sınırlı: dışında kalan cari için kimlik bulunamaz, panel
  // o zaman ada göre arar (bkz. PartyLinesPanel) — satır eskiden tıklanamaz kalıyordu.
  const options = useErpisFilterOptions(detailFilter);
  const partyIdsOf = (name: string): number[] =>
    (options.data?.parties ?? [])
      .filter((o) => o.label.trim() === name.trim())
      .map((o) => parseId(o.value))
      .filter((id): id is number => id != null);

  // Cariye tıklayınca Siparişler sekmesi AYNI daraltmayla açılır: o yaş aralığı, yalnız
  // açıklar, yalnız o cari. Filtre durumu zaten URL'de yaşıyor (bkz. useErpisFilterState),
  // bu yüzden ayrı bir detay ekranı yazmak yerine mevcut liste kullanılıyor — kullanıcı
  // orada sıralayabiliyor, Excel'e aktarabiliyor, satıra tıklayıp kalem detayını görebiliyor.

  return (
    <div className="rounded-[5px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-3">
      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
        {label} · en yüksek {rows.length} cari
      </span>

      {breakdown.isLoading ? (
        <div className="mt-2 h-16 animate-pulse rounded-[4px] bg-[var(--border-soft)]" />
      ) : rows.length === 0 ? (
        <p className="mt-2 text-[11.5px] text-[var(--fg-muted)]">Bu aralıkta açık kalem yok.</p>
      ) : (
        <div className="mt-1.5 flex flex-col">
          {rows.map((row, index) => (
            <button
              key={row.key}
              type="button"
              onClick={() => setOpenParty({ ids: partyIdsOf(row.key), name: row.label })}
              title="Bu carinin bekleyen kalemlerini göster"
              className="group flex items-center gap-2 border-b border-[var(--border-soft)] py-1.5 text-left last:border-0 hover:bg-[var(--card)]"
            >
              <span className="w-4 shrink-0 text-[10px] font-extrabold text-[var(--fg-muted)]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-[var(--fg)]">
                {row.label}
              </span>
              <span className="shrink-0 text-[10.5px] text-[var(--fg-muted)]">
                {formatNumber(row.lineCount)} kalem
              </span>
              <span className="w-24 shrink-0 text-right text-[11.5px] font-extrabold tabular-nums text-[var(--fg)]">
                {formatCompact(row.comparableAmount)} {row.comparableCurrency}
              </span>
              <ArrowUpRight
                size={12}
                strokeWidth={2.2}
                className="shrink-0 text-[var(--fg-subtle)] opacity-0 transition-opacity group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      )}

      {openParty && (
        <PartyLinesPanel
          filter={detailFilter}
          partyIds={openParty.ids}
          partyName={openParty.name}
          rangeLabel={label}
          onClose={() => setOpenParty(null)}
        />
      )}
    </div>
  );
}

// Seçilen carinin, seçilen yaş aralığındaki bekleyen kalemleri.
//
// Kendi filtresini kuruyor ve ANA FİLTREYE HİÇ DOKUNMUYOR: yaşlandırma kartı, üstteki
// KPI'lar ve diğer sekmeler olduğu gibi kalıyor. Bu yüzden panel, "Siparişler ekranına
// filtreyle git" çözümünden hem daha güvenli hem daha hızlı.
function PartyLinesPanel({ filter, partyIds, partyName, rangeLabel, onClose }: {
  filter: ErpisQueryFilter;
  partyIds: number[];
  partyName: string;
  rangeLabel: string;
  onClose: () => void;
}) {
  // Kimlik bulunamadıysa (cari, ilk 200 seçeneğin dışında) ada göre aranır. Arama cari
  // adını da kapsıyor; kimlik kadar kesin değil, ama satırı tıklanamaz bırakmaktan iyi.
  const scopedFilter = partyIds.length > 0
    ? { ...filter, partyIds }
    : { ...filter, search: partyName };

  const lines = useErpisLines(
    scopedFilter,
    { page: 1, pageSize: PANEL_LINE_LIMIT, sortBy: 'orderDate', desc: false });

  const rows = lines.data?.items ?? [];

  return (
    <ErpisDrawer title={partyName} subtitle={`${rangeLabel} · bekleyen kalemler`} onClose={onClose}>
      {lines.isLoading ? (
        <div className="h-24 animate-pulse rounded-[4px] bg-[var(--border-soft)]" />
      ) : rows.length === 0 ? (
        <p className="text-[12px] text-[var(--fg-muted)]">Bu aralıkta bekleyen kalem yok.</p>
      ) : (
        <div className="flex flex-col">
          <span className="pb-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--fg-muted)]">
            {formatNumber(lines.data?.total)} kalem · en eskiden yeniye
          </span>

          {rows.map((line) => (
            <div
              key={line.id}
              className="flex flex-col gap-0.5 border-b border-[var(--border-soft)] py-2 last:border-0"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11.5px] font-extrabold tabular-nums text-[var(--fg)]">
                  {line.orderNo}
                </span>
                <span className="text-[11.5px] font-extrabold tabular-nums text-[var(--fg)]">
                  {formatCompact(line.netAmount ?? 0)} {line.currency ?? ''}
                </span>
              </div>

              <span className="line-clamp-2 text-[11px] leading-[1.3] text-[var(--fg)]">
                {line.itemName ?? line.sku ?? '—'}
              </span>

              <span className="text-[10px] text-[var(--fg-muted)]">
                {line.orderDate ?? '—'} · {formatNumber(line.remainingQty, 2)} adet bekliyor
                {line.sku ? ` · ${line.sku}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </ErpisDrawer>
  );
}

// Panelde gösterilecek en fazla kalem. Panel bir liste ekranı değil, "kim ne bekliyor"
// sorusunun hızlı cevabı; yüzlerce satır o soruyu cevaplamıyor.
const PANEL_LINE_LIMIT = 50;

// Bugünden N gün önceki tarih, yerel bileşenlerle (toISOString UTC'ye kaydırıyor).
function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
