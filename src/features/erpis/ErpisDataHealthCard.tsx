'use client';

import { SectionCard, formatNumber } from './shared';
import { useErpisDataHealth } from '@/hooks/erpis/useErpisQuery';
import type { ErpisDataHealth, ErpisQueryFilter } from '@/lib/api';

// Veri Sağlığı — "elimdeki veri ne kadar eksik".
//
// Panoda olmayan, modüle özel kart. Erpis'ten inen dosya her ay aynı kalitede gelmiyor:
// bir ay ürün adları düzgün, ertesi ay marka çıkarılamıyor. Buraya bakan kişi eksikleri
// görüp sözlüğe ekliyor ve yeniden ayrıştırıyor — panodaki ciro rakamı bu bilgiyi
// vermez, sadece eksik verinin ÜRETTİĞİ yanlış rakamı gösterir.
//
// Renk YALNIZ eşiğin altında. Üç kademeli yeşil/sarı/turuncu, iyi durumdaki satırları
// da renklendirip kartı trafik ışığına çeviriyordu; iyi olan zaten sorun değil, nötr
// kalabilir. Tek bir soluk kehribar, gerçekten eksik olanı işaret ediyor.
const FAIR_RATIO = 0.7;

interface Props {
  filter: ErpisQueryFilter;
}

export function ErpisDataHealthCard({ filter }: Props) {
  const health = useErpisDataHealth(filter);
  const data = health.data;

  return (
    <SectionCard title="Veri Sağlığı" subtitle="Kartlarda ve kalemlerde ne eksik">
      {!data ? (
        <div className="h-40 animate-pulse rounded-[4px] bg-[var(--border-soft)]" />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            {coverageRows(data).map((row) => (
              <CoverageRow key={row.label} {...row} total={data.itemCount} />
            ))}
          </div>

          {/* Kalem düzeyindeki eksikler AYRI: bunlar kartın değil satırın sorunu ve
              hepsi sessiz kayıp — kartı çözülemeyen kalem hiçbir kırılıma girmiyor. */}
          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border-soft)] pt-3 md:grid-cols-4">
            {[
              { label: 'Kartsız kalem', value: data.linesWithoutItem },
              { label: 'Para birimsiz', value: data.linesWithoutCurrency },
              { label: 'Tarihsiz', value: data.linesWithoutDate },
              { label: 'Tutarsız', value: data.linesWithoutAmount },
            ].map((cell) => (
              <div key={cell.label} className="flex flex-col">
                <span className="text-[15px] font-extrabold leading-tight text-[var(--fg)]">
                  {formatNumber(cell.value)}
                </span>
                <span className="text-[9.5px] font-semibold uppercase tracking-wide text-[var(--fg-muted)]">
                  {cell.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function coverageRows(data: ErpisDataHealth) {
  return [
    { label: 'Marka', value: data.withBrand },
    { label: 'Model', value: data.withModel },
    { label: 'Yıl', value: data.withYear },
    { label: 'Kategori', value: data.withProductType },
    { label: 'Araç / Grup', value: data.withCategory },
  ];
}

function CoverageRow({ label, value, total }: { label: string; value: number; total: number }) {
  const ratio = total > 0 ? value / total : 0;
  const color = ratio >= FAIR_RATIO ? 'var(--fg-subtle)' : 'rgba(91, 141, 239, 0.7)';

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[74px] shrink-0 text-[11px] font-semibold text-[var(--fg)]">{label}</span>

      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-soft)]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${ratio * 100}%`, background: color }}
        />
      </div>

      <span className="w-[104px] shrink-0 text-right text-[10.5px] tabular-nums text-[var(--fg-muted)]">
        <strong className="font-extrabold text-[var(--fg)]">%{(ratio * 100).toFixed(0)}</strong>
        {' '}· {formatNumber(total - value)} eksik
      </span>
    </div>
  );
}
