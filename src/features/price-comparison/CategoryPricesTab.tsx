'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Check, Search, Download, ChevronRight, Upload } from 'lucide-react';
import { categoryApi, categoryPriceApi, settingsApi, excelReportApi } from '../../lib/api';
import type { CategoryPriceTarget } from '../../types/api';
import { ExportMenu, type ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';
import { ToleranceTab } from './ToleranceTab';
import { ModerationTab } from './ModerationTab';
import { PriceComparisonPageShell } from './PriceComparisonPageShell';

const TARGET_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'category', header: 'Kategori' },
  { key: 'tl', header: 'Hedef Fiyat (TL)', type: 'money' },
  { key: 'gbp', header: 'Hedef Fiyat (GBP)' },
];

function approxHint(value: string, rate: number, direction: 'tlToGbp' | 'gbpToTl'): string | null {
  const n = parseFloat(value.replace(',', '.'));
  if (isNaN(n) || n <= 0 || rate <= 0) return null;
  if (direction === 'tlToGbp') return `≈ £${(n / rate).toFixed(2)}`;
  return `≈ ₺${(n * rate).toFixed(2)}`;
}

interface RowEdit {
  tl: string;
  gbp: string;
}

export function CategoryPricesTab() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [edits, setEdits] = useState<Record<number, RowEdit>>({});
  const [savedId, setSavedId] = useState<number | null>(null);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [search, setSearch] = useState('');

  const [toleranceOpen, setToleranceOpen] = useState(false);
  const [moderationOpen, setModerationOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['category-price-targets'],
    queryFn: () => categoryPriceApi.targets(),
    staleTime: 30_000,
  });

  const { data: uncategorized } = useQuery({
    queryKey: ['categories-uncategorized-count'],
    queryFn: categoryApi.uncategorizedCount,
    staleTime: 60_000,
  });

  const { data: fx } = useQuery({
    queryKey: ['base-fx'],
    queryFn: () => settingsApi.getBaseFx(),
    staleTime: 5 * 60_000,
  });
  const rate = fx?.gbpToTryRate ?? 0;

  const { data: moderationSummary } = useQuery({
    queryKey: ['category-price-moderation'],
    queryFn: () => categoryPriceApi.moderationQueue(),
    staleTime: 15_000,
  });
  const pendingCount = moderationSummary?.total ?? 0;

  const saveMutation = useMutation({
    meta: { successMessage: 'Hedef fiyat kaydedildi' } as const,
    mutationFn: ({ id, tl, gbp }: { id: number; tl: number | null; gbp: number | null }) =>
      categoryPriceApi.upsertTarget(id, { priceTl: tl, priceGbp: gbp }),
    onSuccess: (_v, { id }) => {
      setSavedId(id);
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 1800);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['category-price-targets'] });
    },
  });

  function editValue(row: CategoryPriceTarget, field: keyof RowEdit): string {
    const e = edits[row.internalCategoryId];
    if (e) return e[field];
    const raw = field === 'tl' ? row.priceTl : row.priceGbp;
    return raw != null ? String(raw) : '';
  }

  function setEdit(id: number, row: CategoryPriceTarget, field: keyof RowEdit, value: string) {
    setEdits((prev) => {
      const base: RowEdit = prev[id] ?? {
        tl: row.priceTl != null ? String(row.priceTl) : '',
        gbp: row.priceGbp != null ? String(row.priceGbp) : '',
      };
      return { ...prev, [id]: { ...base, [field]: value } };
    });
  }

  function save(row: CategoryPriceTarget) {
    const e = edits[row.internalCategoryId];
    const tlStr = e ? e.tl : row.priceTl != null ? String(row.priceTl) : '';
    const gbpStr = e ? e.gbp : row.priceGbp != null ? String(row.priceGbp) : '';
    const tlParsed = parseFloat(tlStr.replace(',', '.'));
    const gbpParsed = parseFloat(gbpStr.replace(',', '.'));
    const tl = isNaN(tlParsed) || tlParsed < 0 ? null : tlParsed;
    const gbp = isNaN(gbpParsed) || gbpParsed < 0 ? null : gbpParsed;
    saveMutation.mutate({ id: row.internalCategoryId, tl, gbp });
  }

  async function handleFile(file: File) {
    setIsUploading(true);
    setUploadInfo(null);
    try {
      const summary = await categoryPriceApi.parseExcel(file);
      if (summary.matched.length > 0) {
        await categoryPriceApi.importRows(
          summary.matched.map((m) => ({
            internalCategoryId: m.internalCategoryId,
            priceTl: m.priceTl,
            priceGbp: m.priceGbp,
          }))
        );
      }
      setUploadInfo(
        `Excel işlendi: ${summary.matchedCount} hedef fiyat güncellendi. ${
          summary.needsReviewCount > 0 ? `${summary.needsReviewCount} kayıt moderasyona eklendi.` : ''
        }`
      );
      qc.invalidateQueries({ queryKey: ['category-price-targets'] });
      qc.invalidateQueries({ queryKey: ['category-price-moderation'] });
    } catch (err: unknown) {
      setUploadInfo(`Excel yükleme hatası: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const rows = useMemo(() => {
    const list = data?.items ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((r) => r.categoryName.toLowerCase().includes(q));
  }, [data, search]);

  return (
    <PriceComparisonPageShell
      toolbar={
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-8 w-56 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs text-[var(--fg)] focus-within:border-[var(--fg)]">
              <Search size={13} className="text-[var(--fg-muted)] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Kategori filtrele"
                className="w-full bg-transparent text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none"
              />
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--card)] disabled:opacity-50"
            >
              <Upload size={12} />
              <span>{isUploading ? 'Yükleniyor…' : 'Excel Yükle'}</span>
            </button>

            <button
              type="button"
              disabled={isDownloadingTemplate}
              onClick={async () => {
                setIsDownloadingTemplate(true);
                try {
                  await excelReportApi.downloadTemplate('CategoryPrice');
                } catch {
                  /* noop */
                } finally {
                  setIsDownloadingTemplate(false);
                }
              }}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              <Download size={12} />
              <span>Şablon</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu
              filename="kategori-hedef-fiyatlari"
              columns={TARGET_EXPORT_COLUMNS}
              getData={() =>
                rows.map((r): ExportRow => ({
                  category: r.categoryName,
                  tl: r.priceTl ?? 0,
                  gbp: r.priceGbp ?? 0,
                }))
              }
            />
          </div>
        </>
      }
    >
      {uploadInfo && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2.5 text-xs text-[var(--fg)]">
          {uploadInfo}
        </div>
      )}

      {uncategorized != null && uncategorized.uncategorizedCount > 0 && (
        <div className="flex items-center justify-between rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/60 p-2.5 text-xs">
          <span className="text-[var(--fg-muted)]">
            <strong className="text-[var(--fg)]">{uncategorized.uncategorizedCount} ürünün</strong> henüz kategorisi belirlenmemiş.
          </span>
          {/* Kategorisiz ürünün çözüldüğü yer Eşleştirme sekmesi — eski `/categories`
              yalnızca yönlendirme bıraktığı için tam sayfa yenilemesine yol açıyordu. */}
          <Link href="/products/categories/matching" className="font-bold text-[var(--fg)] hover:underline">
            Eşleştirmeye Git →
          </Link>
        </div>
      )}

      {/* ── Akordeon Bölümler (Tolerans & Moderasyon) ── */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {/* Tolerans Kartı */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
          <button
            type="button"
            onClick={() => setToleranceOpen((o) => !o)}
            className="flex w-full items-center justify-between p-3 text-xs font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)]/40 transition"
          >
            <span>Fiyat Tolerans Ayarı</span>
            <ChevronRight size={13} className={`text-[var(--fg-muted)] transition ${toleranceOpen ? 'rotate-90' : ''}`} />
          </button>
          {toleranceOpen && (
            <div className="border-t border-[var(--border-soft)] p-3">
              <ToleranceTab />
            </div>
          )}
        </div>

        {/* Moderasyon Kartı */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
          <button
            type="button"
            onClick={() => setModerationOpen((o) => !o)}
            className="flex w-full items-center justify-between p-3 text-xs font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)]/40 transition"
          >
            <div className="flex items-center gap-2">
              <span>Onay Bekleyen Eşleşmeler</span>
              {pendingCount > 0 && (
                <span className="rounded-[2px] bg-amber-500/10 px-1.5 py-0.2 text-[10.5px] font-bold text-amber-500/90">
                  {pendingCount}
                </span>
              )}
            </div>
            <ChevronRight size={13} className={`text-[var(--fg-muted)] transition ${moderationOpen ? 'rotate-90' : ''}`} />
          </button>
          {moderationOpen && (
            <div className="border-t border-[var(--border-soft)] p-3">
              <ModerationTab />
            </div>
          )}
        </div>
      </div>

      {/* ── Kategori Fiyatları Tablosu ── */}
      <div className="border border-[var(--border-soft)] rounded-[4px] overflow-auto">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--fg-muted)]">Hedef fiyatlar yükleniyor…</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-rose-500/90">Hedef fiyatlar alınamadı.</div>
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              <tr>
                <th className="px-3.5 py-2.5">Kategori</th>
                <th className="px-3.5 py-2.5">Hedef (TL)</th>
                <th className="px-3.5 py-2.5">Hedef (GBP)</th>
                <th className="px-3.5 py-2.5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {rows.map((row) => {
                const id = row.internalCategoryId;
                const isSaved = savedId === id;
                const isDirty = !!edits[id];
                const tlVal = editValue(row, 'tl');
                const gbpVal = editValue(row, 'gbp');
                const tlApprox = rate > 0 ? approxHint(tlVal, rate, 'tlToGbp') : null;
                const gbpApprox = rate > 0 ? approxHint(gbpVal, rate, 'gbpToTl') : null;

                return (
                  <tr key={id} className="transition hover:bg-[var(--bg-subtle)]/30">
                    <td className="px-3.5 py-2.5 font-semibold text-[var(--fg)]">{row.categoryName}</td>
                    
                    {/* TL Hedef */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-muted)]">
                            ₺
                          </span>
                          <input
                            inputMode="decimal"
                            value={tlVal}
                            placeholder="0.00"
                            onChange={(e) => setEdit(id, row, 'tl', e.target.value)}
                            className="h-7 w-full rounded-[3px] border border-[var(--border)] bg-[var(--card)] pl-5 pr-2 text-xs font-bold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                          />
                        </div>
                        {tlApprox && <span className="text-[11px] text-[var(--fg-muted)]">{tlApprox}</span>}
                      </div>
                    </td>

                    {/* GBP Hedef */}
                    <td className="px-3.5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="relative w-28">
                          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--fg-muted)]">
                            £
                          </span>
                          <input
                            inputMode="decimal"
                            value={gbpVal}
                            placeholder="0.00"
                            onChange={(e) => setEdit(id, row, 'gbp', e.target.value)}
                            className="h-7 w-full rounded-[3px] border border-[var(--border)] bg-[var(--card)] pl-5 pr-2 text-xs font-bold text-[var(--fg)] outline-none focus:border-[var(--fg)]"
                          />
                        </div>
                        {gbpApprox && <span className="text-[11px] text-[var(--fg-muted)]">{gbpApprox}</span>}
                      </div>
                    </td>

                    {/* Kaydet Butonu */}
                    <td className="px-3.5 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => save(row)}
                        disabled={saveMutation.isPending}
                        className={`inline-flex h-7 items-center gap-1 rounded-[3px] px-2.5 text-xs font-semibold transition ${
                          isSaved
                            ? 'bg-emerald-500/15 text-emerald-600/90 dark:text-emerald-400 font-bold border border-emerald-500/30'
                            : isDirty
                            ? 'border border-[var(--fg)]/40 bg-[var(--bg-subtle)] font-bold text-[var(--fg)] hover:bg-[var(--card)]'
                            : 'border border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[var(--fg-muted)] hover:text-[var(--fg)]'
                        }`}
                      >
                        {isSaved ? <Check size={11} /> : <Save size={11} />}
                        <span>{isSaved ? 'Kaydedildi' : 'Kaydet'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </PriceComparisonPageShell>
  );
}
