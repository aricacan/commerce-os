'use client';

import { useCallback, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileSpreadsheet, Download, AlertCircle, Info } from 'lucide-react';
import Link from 'next/link';
import { campaignApi, excelReportApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useMobile } from '../../hooks/useMobile';
import { formatDateTime } from '../../lib/format';
import type { TariffRow } from '../../types/api';
import { pushAlert } from '../../stores/alert-stack';
import { ExportMenu, type ExportRow } from '../../components/ui/ExportMenu';
import type { ExportColumn } from '../../lib/export';

const TARIFF_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'barcode', header: 'Barkod' },
  { key: 'productName', header: 'Ürün Adı' },
  { key: 'tier1', header: '1. Fiyat Alt Limit', type: 'money' },
  { key: 'tier2', header: '2. Fiyat Alt Limit', type: 'money' },
];

const TARIFF_TABLE_LIMIT = 200;

export function CampaignTariffView() {
  const { t, lang } = useI18n();
  const isMobile = useMobile();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState('');
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; message: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-tariff'],
    queryFn: () => campaignApi.tariff(),
  });

  const uploadMut = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (file: File) => campaignApi.upload(file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['campaign-tariff'] });
      qc.invalidateQueries({ queryKey: ['campaign-uploads'] });
      if (result.campaignType !== 'Opportunity') {
        const errorMsg = lang === 'tr'
          ? `Bu dosya "${result.campaignType}" tipinde görünüyor — bu panel yalnızca Ürün Komisyon Tarifesi (Fırsat) dosyası kabul eder. Kampanya dosyalarını Kampanyalar sayfasından yükleyin.`
          : `This file appears to be of type "${result.campaignType}" — this panel only accepts Product Commission Tariff (Opportunity) files. Upload campaign files from the Campaigns page.`;
        setUploadResult({ ok: false, message: errorMsg });
        pushAlert(errorMsg, 'error', 8000);
      } else {
        const successMsg = lang === 'tr'
          ? `Tarife güncellendi: ${result.matchedRows}/${result.totalRows} ürün eşleşti.`
          : `Tariff updated: ${result.matchedRows}/${result.totalRows} products matched.`;
        setUploadResult({ ok: true, message: successMsg });
        pushAlert(successMsg, 'success', 8000);
      }
      setTimeout(() => setUploadResult(null), 6000);
    },
    onError: (err: Error) => {
      const errorMsg = `${t('error')}: ${err.message}`;
      setUploadResult({ ok: false, message: errorMsg });
      pushAlert(errorMsg, 'error', 8000);
      setTimeout(() => setUploadResult(null), 6000);
    },
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.name.endsWith('.xlsx')) {
      const msg = lang === 'tr'
        ? 'Lütfen .xlsx uzantılı bir Excel dosyası seçin (eski .xls formatı desteklenmiyor).'
        : 'Please select a file with the .xlsx extension (legacy .xls is not supported).';
      pushAlert(msg, 'error', 5000);
      return;
    }
    pushAlert(
      lang === 'tr'
        ? `"${file.name}" tarife Excel dosyası yükleniyor...`
        : `Uploading "${file.name}" tariff Excel...`,
      'info',
      4000
    );
    uploadMut.mutate(file);
  }, [uploadMut, lang]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const rows: TariffRow[] = data?.rows ?? [];
  const filtered = search
    ? rows.filter(r => r.barcode.toLowerCase().includes(search.toLowerCase()) || r.productName.toLowerCase().includes(search.toLowerCase()))
    : rows;
  const visibleRows = filtered.slice(0, TARIFF_TABLE_LIMIT);

  return (
    <div className={`mx-auto max-w-5xl ${isMobile ? 'p-3' : 'px-7 py-5'}`}>
      <h1 className="mb-5 text-lg font-bold text-fg">
        {t('campaign_tariff')} (Fırsat) Referans Tablosu
      </h1>

      <div className="mb-6 flex items-start gap-2 rounded-[var(--radius-sm)] border border-border bg-accent-soft px-4 py-3">
        <Info size={16} className="mt-0.5 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-fg-muted">
          {t('campaign_tariff_info_before')}
          <Link href="/trendyol/campaigns" className="text-accent">{t('campaign_tariff_info_link')}</Link>
          {t('campaign_tariff_info_after')}
        </p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => {
          pushAlert(
            lang === 'tr'
              ? 'Tarife Excel Yükle: Excel sütun başlıkları arasında en azından "1.fiyat alt limit" kolonunu ve barkod/SKU sütununu barındırmalıdır.'
              : 'Upload Tariff Excel: Excel must contain at least "1.fiyat alt limit" column and barcode/SKU column.',
            'info',
            9000
          );
          fileRef.current?.click();
        }}
        className={`mb-3 cursor-pointer rounded-[var(--radius)] border-2 border-dashed text-center transition-colors ${isMobile ? 'rounded-2xl px-3.5 py-5' : 'p-9'} ${
          dragging ? 'border-accent bg-accent-soft' : 'border-border bg-card'
        }`}
      >
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        <Upload size={isMobile ? 24 : 30} className={`mx-auto mb-2.5 ${dragging ? 'text-accent' : 'text-fg-muted'}`} />
        <p className="mb-1 text-[13px] font-semibold text-fg">
          {lang === 'tr'
            ? `${t('campaign_tariff')} (Fırsat) dosyasını sürükleyin veya tıklayın`
            : `Drag or click to upload ${t('campaign_tariff')} (Opportunity) file`}
        </p>
        <p className="text-[11px] text-fg-muted">{t('campaign_file_types_xlsx')}</p>
        {uploadMut.isPending && <p className="mt-2.5 text-xs text-accent">{t('loading')}</p>}
      </div>

      {uploadResult && (
        <div className={`mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-[13px] font-medium ${
          uploadResult.ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
        }`}>
          <AlertCircle size={14} />
          {uploadResult.message}
        </div>
      )}

      {/* Tarife listesi */}
      <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 ${isMobile ? 'flex-col items-start' : ''}`}>
          <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
            <FileSpreadsheet size={18} className="text-accent" />
            <span className="text-sm font-bold text-fg">{t('campaign_tariff')} Verileri ({filtered.length})</span>
            {data?.uploadedAt && (
              <span className="text-[11px] text-fg-muted">• Güncelleme: {formatDateTime(data.uploadedAt)}</span>
            )}
          </div>
          <div className={`flex items-center gap-2 ${isMobile ? 'w-full' : ''}`}>
            <input
              type="text"
              placeholder="Barkod veya ürün adı ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`rounded-[var(--radius-sm)] border border-border bg-bg px-3 py-1.5 text-xs text-fg outline-none ${isMobile ? 'w-full' : 'w-56'}`}
            />
            <button
              type="button"
              onClick={() => excelReportApi.downloadTemplate('Tariff')}
              title={lang === 'tr' ? 'Örnek Tarife Excel Şablonu İndir' : 'Download Sample Tariff Excel Template'}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card px-3 py-1.5 text-xs font-bold text-accent"
            >
              <Download size={13} />
              {!isMobile && (lang === 'tr' ? 'Şablon' : 'Template')}
            </button>
            <ExportMenu
              filename="komisyon-tarifesi"
              columns={TARIFF_EXPORT_COLUMNS}
              getData={() => filtered.map((r): ExportRow => ({
                barcode: r.barcode,
                productName: r.productName,
                tier1: r.tier1PriceLow ?? 0,
                tier2: r.tier2PriceLow ?? 0,
              }))}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-[13px] text-fg-muted">{t('loading')}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-fg-muted">
            {search ? 'Aramaya uygun kayıt bulunamadı.' : 'Henüz tarife verisi yüklenmemiş. Yukarıdaki alandan Excel dosyasını yükleyin.'}
          </div>
        ) : isMobile ? (
          <div className="flex flex-col gap-2.5 p-3">
            {visibleRows.map((r, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-3 shadow-xs">
                <p className="mb-0.5 font-mono text-xs text-fg">{r.barcode}</p>
                <p className="mb-2 truncate text-[13px] text-fg">{r.productName}</p>
                <div className="flex justify-between text-xs">
                  <span className="text-fg-muted">1. Alt Limit</span>
                  <span className="font-semibold text-accent">
                    {r.tier1PriceLow != null ? `₺${r.tier1PriceLow.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-fg-muted">2. Alt Limit</span>
                  <span className="font-semibold text-fg-muted">
                    {r.tier2PriceLow != null ? `₺${r.tier2PriceLow.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-border bg-bg-subtle">
                  <th className="px-4 py-2.5 font-semibold text-fg-muted">Barkod</th>
                  <th className="px-4 py-2.5 font-semibold text-fg-muted">Ürün Adı</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-fg-muted">1. Fiyat Alt Limit</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-fg-muted">2. Fiyat Alt Limit</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r, i) => (
                  <tr key={i} className="border-b border-border-soft last:border-0">
                    <td className="px-4 py-2.5 font-mono text-fg">{r.barcode}</td>
                    <td className="max-w-[300px] truncate px-4 py-2.5 text-fg">{r.productName}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-accent">
                      {r.tier1PriceLow != null ? `₺${r.tier1PriceLow.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-fg-muted">
                      {r.tier2PriceLow != null ? `₺${r.tier2PriceLow.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > TARIFF_TABLE_LIMIT && (
          <div className="border-t border-border-soft px-4 py-2.5 text-[11px] text-fg-muted">
            {lang === 'tr'
              ? `İlk ${TARIFF_TABLE_LIMIT} kayıt gösteriliyor (${filtered.length} eşleşme) — daralt aramayla veya dışa aktarımı kullan.`
              : `Showing first ${TARIFF_TABLE_LIMIT} rows (${filtered.length} matches) — narrow the search or use export.`}
          </div>
        )}
      </div>
    </div>
  );
}
