'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, RefreshCw, Search } from 'lucide-react';
import { palette } from '../shared/design';
import {
  sonarImports,
  sonarStudio,
  type ImportBatchDto,
  type StudioCell,
  type StudioRow,
  type StudioTable,
} from '../../lib/api/sonar';
import {
  Button, Empty, ErrorNote, Page, PageHeader, Toolbar,
  formatPrice, formatRelative,
} from './shared';

const PAGE_SIZE = 40;

/**
 * Yapışkan kimlik sütunlarının genişlikleri — TEK KAYNAK.
 *
 * İkinci sütunun `left` değeri birincinin genişliğinden TÜRETİLİR. Sabit
 * yazıldığında uzun bir OEM ilk sütunu büyütüyor, ikinci sütun eski yerinde
 * kalıyor ve yatay kaydırmada ürün adı numaranın altına giriyordu — tam da
 * yapışkan sütunların çözmesi gereken anda.
 */
const OEM_COL_WIDTH = 148;
const NAME_COL_WIDTH = 240;

/**
 * Karşılaştırma stüdyosu — hangi OEM hangi tedarikçide kaça ve kaç adet.
 *
 * Siteye HİÇ gitmez; birikmiş kataloğu okur. Her hücre kaynağını ve doğrulanma
 * zamanını taşır: tarihsiz bir fiyat, aylık bir veriyi canlı gibi sunar ve
 * kullanıcı ona güvenerek sipariş verir.
 */
export function StudioTab() {
  const [batches, setBatches] = useState<ImportBatchDto[]>([]);
  const [batchId, setBatchId] = useState<number | ''>('');
  const [search, setSearch] = useState('');
  const [onlyWithPrice, setOnlyWithPrice] = useState(true);
  const [page, setPage] = useState(1);
  const [table, setTable] = useState<StudioTable | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setBatches(await sonarImports.list());
      } catch {
        setBatches([]);
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      setTable(await sonarStudio.table({
        importBatchId: batchId === '' ? undefined : batchId,
        search: search.trim() || undefined,
        onlyWithPrice,
        page,
        pageSize: PAGE_SIZE,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tablo yüklenemedi.');
    }
  }, [batchId, search, onlyWithPrice, page]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = table ? Math.max(1, Math.ceil(table.totalCount / table.pageSize)) : 1;

  return (
    <Page>
      <PageHeader
        dataTour="sonar-studio-header"
        title="Karşılaştırma Stüdyosu"
        description="Hangi OEM hangi tedarikçide kaça ve kaç adet. Siteye gitmez, birikmiş kataloğu okur — her hücre ne zaman doğrulandığını gösterir."
        actions={
          <>
            <Button onClick={() => void load()}>
              <RefreshCw size={13} /> Yenile
            </Button>
            <Button
              variant="primary"
              onClick={() => table && downloadCsv(table)}
              disabled={!table || table.rows.length === 0}
            >
              <Download size={13} /> Tabloyu indir
            </Button>
          </>
        }
      />

      <Toolbar dataTour="sonar-studio-toolbar">
        <select
          value={batchId}
          onChange={(e) => { setBatchId(e.target.value ? Number(e.target.value) : ''); setPage(1); }}
          className="h-8 shrink-0 rounded-[4px] px-2 text-xs"
          style={{
            background: palette.inputBg,
            border: `1px solid ${palette.borderSoft}`,
            color: palette.text,
          }}
        >
          <option value="">Tüm OEM sözlüğü</option>
          {batches.map((b) => <option key={b.id} value={b.id}>{b.fileName}</option>)}
        </select>

        <div className="flex min-w-[200px] flex-1 items-center gap-2">
          <Search size={14} style={{ color: palette.textFaint }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Numara ya da ürün adı"
            className="w-full bg-transparent text-xs outline-none"
            style={{ color: palette.text }}
          />
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-xs"
          style={{ color: palette.textMuted }}>
          <input
            type="checkbox"
            checked={onlyWithPrice}
            onChange={(e) => { setOnlyWithPrice(e.target.checked); setPage(1); }}
          />
          Yalnız tedarikçide bulunanlar
        </label>
      </Toolbar>

      {error && <ErrorNote message={error} />}

      {table && table.rows.length === 0 && (
        <Empty
          title="Gösterilecek veri yok"
          hint="Bir tedarikçi sitesi tarayın ya da Excel'inizdeki tedarikçi sütunlarını aktarın."
        />
      )}

      {table && table.rows.length > 0 && (
        <>
          {/*
            Geniş tablo KENDİ içinde kaydırılır; sayfa yatay kaymaz.
            Başlık satırı yapışkan: 40 satır kaydırınca hangi sütunun hangi
            tedarikçi olduğu kaybolmamalı.
          */}
          <div
            data-tour="sonar-studio-table"
            className="overflow-auto rounded-[4px] shadow-xs"
            style={{ border: `1px solid ${palette.borderSoft}`, maxHeight: '68vh' }}
          >
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 z-20">
                <tr>
                  <Th sticky left={0} width={OEM_COL_WIDTH}>OEM</Th>
                  <Th sticky left={OEM_COL_WIDTH} width={NAME_COL_WIDTH} divider>
                    Ürün
                  </Th>
                  {table.suppliers.map((s) => (
                    <Th key={s.siteId} width={168}>
                      {s.name}
                      <span className="ml-1 font-normal tabular-nums"
                        style={{ color: palette.textFaint }}>
                        {s.filledCells}
                      </span>
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row) => (
                  <Row key={row.normalizedOem} row={row} suppliers={table.suppliers} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-xs"
            style={{ color: palette.textMuted }}>
            <span className="tabular-nums">
              {table.totalCount} numara · sayfa {table.page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Önceki
              </Button>
              <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </Button>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}

/**
 * Tablo başlığı.
 *
 * `sticky` olan sütunlar YATAY kaydırmada yerinde kalır. 25 tedarikçili bir
 * tabloda sağa kaydırırken hangi numaraya baktığını unutmak, tablonun tamamını
 * işe yaramaz hale getirir.
 */
function Th({ children, sticky = false, left, width, divider = false }: {
  children: React.ReactNode;
  sticky?: boolean;
  left?: number;
  width?: number;
  divider?: boolean;
}) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide ${
        sticky ? 'sticky z-10' : ''
      }`}
      style={{
        color: palette.textMuted,
        background: palette.card,
        borderBottom: `1px solid ${palette.border}`,
        borderRight: divider ? `1px solid ${palette.borderSoft}` : undefined,
        left: sticky ? left : undefined,
        width,
        minWidth: width,
        // maxWidth de sabitlenir: yoksa uzun bir baslik sutunu buyutur ve
        // ikinci yapiskan sutunun `left` degeri kayar.
        maxWidth: width,
      }}
    >
      {children}
    </th>
  );
}

function Row({ row, suppliers }: {
  row: StudioRow;
  suppliers: StudioTable['suppliers'];
}) {
  return (
    <tr className="group">
      <td
        className="sticky left-0 z-10 truncate px-3 py-2.5 align-top font-mono"
        style={{
          color: palette.textStrong,
          background: palette.card,
          borderBottom: `1px solid ${palette.borderSoft}`,
          width: OEM_COL_WIDTH,
          minWidth: OEM_COL_WIDTH,
          maxWidth: OEM_COL_WIDTH,
        }}
        title={row.rawOem ?? row.normalizedOem}
      >
        {row.rawOem ?? row.normalizedOem}
      </td>

      <td
        className="sticky z-10 px-3 py-2.5 align-top"
        style={{
          left: OEM_COL_WIDTH,
          color: palette.text,
          background: palette.card,
          borderBottom: `1px solid ${palette.borderSoft}`,
          borderRight: `1px solid ${palette.borderSoft}`,
          width: NAME_COL_WIDTH,
          minWidth: NAME_COL_WIDTH,
          maxWidth: NAME_COL_WIDTH,
        }}
      >
        <div className="truncate">{row.displayName ?? '—'}</div>
        {(row.vehicleMake || row.partType) && (
          <div className="truncate text-[11px]" style={{ color: palette.textFaint }}>
            {[row.vehicleMake, row.partType].filter(Boolean).join(' · ')}
          </div>
        )}
      </td>

      {suppliers.map((s) => (
        <td key={s.siteId} className="px-3 py-2.5 align-top"
          style={{ borderBottom: `1px solid ${palette.borderSoft}` }}>
          <Cell cell={row.cells[s.siteId]} isCheapest={row.cheapestSiteId === s.siteId} />
        </td>
      ))}
    </tr>
  );
}

function Cell({ cell, isCheapest }: { cell?: StudioCell; isCheapest: boolean }) {
  if (!cell) {
    return <span style={{ color: palette.textFaint }}>—</span>;
  }

  const isExcel = cell.provenance === 'ExcelImport';

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className="font-medium"
        style={{ color: isCheapest ? palette.success : palette.textStrong }}
      >
        {formatPrice(cell.price, cell.currency)}
        {isCheapest && ' ↓'}
      </span>

      <span className="font-mono" style={{ color: palette.textMuted }}>
        {cell.supplierCode}
      </span>

      {cell.stockQty !== null && (
        <span style={{ color: palette.textMuted }}>{cell.stockQty} adet</span>
      )}
      {cell.stockQty === null && cell.stockState && (
        <span style={{ color: palette.textMuted }}>{cell.stockState}</span>
      )}

      {/*
        Kaynak ve tarih HER ZAMAN görünür. Excel verisi bir anlık görüntüdür;
        canlı fiyat gibi göstermek, kullanıcıya eski fiyatla sipariş verdirir.
      */}
      <span style={{ color: isExcel ? palette.warningText : palette.textFaint }}>
        {isExcel ? 'Excel' : 'canlı'} · {formatRelative(cell.observedAt)}
      </span>
    </div>
  );
}

/**
 * Tabloyu CSV olarak indirir.
 *
 * Kaynak ve tarih sütunları ÇIKTIYA DA girer: dosya paylaşıldığında hangi
 * fiyatın canlı hangisinin eski olduğu kaybolmamalı.
 */
function downloadCsv(table: StudioTable) {
  const head = [
    'OEM', 'Ürün', 'Araç', 'Parça',
    ...table.suppliers.flatMap((s) => [
      `${s.name} Kod`, `${s.name} Fiyat`, `${s.name} Stok`, `${s.name} Kaynak`,
    ]),
  ];

  const lines = table.rows.map((row) => [
    row.rawOem ?? row.normalizedOem,
    row.displayName ?? '',
    row.vehicleMake ?? '',
    row.partType ?? '',
    ...table.suppliers.flatMap((s) => {
      const c = row.cells[s.siteId];
      return c
        ? [
            c.supplierCode,
            c.price === null ? '' : String(c.price),
            c.stockQty === null ? (c.stockState ?? '') : String(c.stockQty),
            `${c.provenance === 'ExcelImport' ? 'Excel' : 'canlı'} ${c.observedAt.slice(0, 10)}`,
          ]
        : ['', '', '', ''];
    }),
  ]);

  const csv = [head, ...lines]
    .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  // BOM şart: Excel BOM'suz UTF-8'i Türkçe karakterlerde bozuk gösterir.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sonar-karsilastirma-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
