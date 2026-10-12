'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../../../lib/i18n';
import { useOperationsSummary } from '../../../hooks/monitoring/useMonitoring';
import { workspaceRoute } from '../../../lib/workspace-routes';
import type { OperationsStockSourceDto } from '../../../lib/api/monitoring';
import { OperationsIssuesTab } from './OperationsIssuesTab';

// "Operasyon" sekmesi — diğer sekmelerin aksine (denetim kaydı, hata, yavaş istek) teknik
// değil, iş-uyarı odaklı: bir operasyon yöneticisinin "şu an işte ne sorunlu" sorusuna tek
// bakışta cevap vermesi için. Üstteki uyarı kartları "neyi kaçırıyorum"u, altındaki iş
// listesi "kim ne yapacak"ı gösterir.
//
// KARTLAR NEDEN BU KADAR SADE: eskiden tek bir "Kritik Stok" sayısı vardı ve BaseTrack ile
// SentosTrack'in uyarılarını TOPLUYORDU. O sayı hiçbir gerçek büyüklüğe karşılık gelmiyordu
// (biri UK deposunun ikmal riski, diğeri Türkiye'deki stok açığı) ve hangi depoda ne olduğu
// kaybolduğu için üstüne aksiyon da alınamıyordu. Artık her kaynak kendi satırında, kendi
// kapsam etiketiyle durur.

// Her stok kaynağı için ilgili modülün sayfası — etiket backend'den geldiği için eşleme
// kaynak ADINA değil, etiketin başındaki modül adına bakar.
function sourceHref(label: string): string | null {
  if (label.startsWith('BaseTrack')) return workspaceRoute('base');
  if (label.startsWith('SentosTrack')) return workspaceRoute('sentos');
  return null;
}

function StockSourceRow({ source }: { source: OperationsStockSourceDto }) {
  const href = sourceHref(source.label);
  const critical = source.available ? source.criticalCount : null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-[var(--fg)]">{source.label}</div>
        <div className="text-[11px] text-[var(--fg-muted)]">
          {source.available
            ? `${source.totalCount} uyarı`
            : 'Veri alınamadı'}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div
          className={`text-base font-bold tabular-nums ${
            critical && critical > 0 ? 'text-[var(--danger)]' : 'text-[var(--fg)]'
          }`}
        >
          {critical === null ? '—' : critical}
        </div>
        <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
          Kritik
        </div>
      </div>

      {href && (
        <Link
          href={href}
          className="shrink-0 rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-1.5 text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
          aria-label={`${source.label} sayfasını aç`}
        >
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  );
}

export function OperationsTab() {
  const { lang } = useI18n();
  const { data, isLoading, isError } = useOperationsSummary();

  const stockSources = data?.stockSources ?? [];
  const categoryMismatch = data?.categoryMismatchCount ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="m-0 text-[15px] font-extrabold tracking-tight text-[var(--fg)]">
          {lang === 'tr' ? 'Operasyon' : 'Operations'}
        </h1>
        <p className="mt-0.5 mb-0 text-[11.5px] text-[var(--fg-muted)]">
          {lang === 'tr'
            ? 'İşte şu an gerçekten sorunlu olan şeyler — stok ve kategori uyarıları'
            : 'What is actually wrong with the business right now — stock and category warnings'}
        </p>
      </div>

      {isError && (
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] px-4 py-3 text-xs font-semibold text-[var(--danger)]">
          {lang === 'tr' ? 'Operasyon özeti yüklenemedi.' : 'Could not load the operations summary.'}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Stok uyarıları — kaynak başına bir satır, toplanmış tek sayı YOK */}
        <section className="overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
          <header className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-4 py-2.5">
            <h2 className="m-0 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              {lang === 'tr' ? 'Stok Uyarıları' : 'Stock Warnings'}
            </h2>
          </header>

          <div className="divide-y divide-[var(--border-soft)]">
            {isLoading ? (
              <div className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                {lang === 'tr' ? 'Yükleniyor…' : 'Loading…'}
              </div>
            ) : stockSources.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--fg-muted)]">
                {lang === 'tr' ? 'Kayıtlı stok kaynağı yok.' : 'No stock source registered.'}
              </div>
            ) : (
              stockSources.map((source) => <StockSourceRow key={source.label} source={source} />)
            )}
          </div>
        </section>

        {/* Kategori uyuşmazlığı */}
        <section className="overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
          <header className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-4 py-2.5">
            <h2 className="m-0 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
              {lang === 'tr' ? 'Kategori Uyuşmazlığı' : 'Category Mismatch'}
            </h2>
          </header>

          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[var(--fg)]">
                {lang === 'tr' ? 'Eşleme adı ERP ile uyuşmuyor' : 'Mapping name differs from the ERP'}
              </div>
              <div className="text-[11px] text-[var(--fg-muted)]">
                {lang === 'tr' ? 'Tüm hesaplar' : 'All accounts'}
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div
                className={`text-base font-bold tabular-nums ${
                  categoryMismatch > 0 ? 'text-[var(--warning)]' : 'text-[var(--fg)]'
                }`}
              >
                {isLoading ? '—' : categoryMismatch}
              </div>
              <div className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">
                {lang === 'tr' ? 'Satır' : 'Rows'}
              </div>
            </div>

            <Link
              href="/products/categories/mismatches"
              className="shrink-0 rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-1.5 text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
              aria-label={lang === 'tr' ? 'Kategori uyuşmazlığı panelini aç' : 'Open the category mismatch panel'}
            >
              <ArrowRight size={13} />
            </Link>
          </div>
        </section>
      </div>

      {/* Operasyon iş listesi — eski Operasyon Merkezi'nin çekirdeği */}
      <OperationsIssuesTab />
    </div>
  );
}
