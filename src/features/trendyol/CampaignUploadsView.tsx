'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, FileSpreadsheet, Download, AlertCircle, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { campaignApi, excelReportApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useMobile } from '../../hooks/useMobile';
import { formatDateTime } from '../../lib/format';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { CampaignUploadInfo } from '../../types/api';
import { pushAlert, clearAlerts } from '../../stores/alert-stack';
import { describeError } from '../../lib/errors';

// Durum = gerçek işlem sonucu (eşleşti/kısmen eşleşti/işleniyor/başarısız), tek marka
// aksanından ayrı — bu yüzden semantic token'lar kullanılıyor, rainbow değil.
const STATUS_CLASSES: Record<string, string> = {
  Completed:    'bg-success-soft text-success',
  PartialMatch: 'bg-warning-soft text-warning',
  Processing:   'bg-accent-soft text-accent',
  Failed:       'bg-danger-soft text-danger',
};

export function CampaignUploadsView() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const isMobile = useMobile();
  const fileRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CampaignUploadInfo | null>(null);

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ['campaign-uploads'],
    queryFn: () => campaignApi.uploads(),
  });

  const uploadMut = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (file: File) => campaignApi.upload(file),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['campaign-uploads'] });
      qc.invalidateQueries({ queryKey: ['campaign-tariff'] });

      let typeLabel = result.campaignType;
      if (result.campaignType === 'Opportunity') {
        typeLabel = lang === 'tr' ? 'Ürün Komisyon Tarifesi (Fırsat)' : 'Product Commission Tariff (Opportunity)';
      } else if (result.campaignType === 'Starred') {
        typeLabel = lang === 'tr' ? 'Yıldızlı Ürün Kampanyası' : 'Starred Product Campaign';
      } else if (result.campaignType === 'Flash') {
        typeLabel = lang === 'tr' ? 'Flaş Kampanya' : 'Flash Campaign';
      } else if (result.campaignType === 'Plus') {
        typeLabel = lang === 'tr' ? 'Trendyol Plus Kampanyası' : 'Trendyol Plus Campaign';
      }

      const msg = lang === 'tr'
        ? `Kampanya Excel yüklendi (${typeLabel}): ${result.matchedRows}/${result.totalRows} ürün eşleşti.`
        : `Campaign Excel uploaded (${typeLabel}): ${result.matchedRows}/${result.totalRows} products matched.`;

      setUploadResult({ ok: true, message: msg });
      pushAlert(msg, 'success', 8000);
      setTimeout(() => setUploadResult(null), 8000);
    },
    onError: (err: unknown) => {
      const msg = describeError(err);
      setUploadResult({ ok: false, message: msg });
      pushAlert(msg, 'error', 8000);
      setTimeout(() => setUploadResult(null), 8000);
    },
  });

  const deleteMut = useMutation({
    // Hata satır içinde gösteriliyor — global bildirim çift olmasın.
    meta: { silentError: true } as const,
    mutationFn: (id: number) => campaignApi.deleteUpload(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-uploads'] });
      qc.invalidateQueries({ queryKey: ['campaign-tariff'] });
      setPendingDelete(null);

      const msg = lang === 'tr' ? 'Kampanya dosyası ve ilgili veriler silindi.' : 'Campaign file and associated data deleted.';
      pushAlert(msg, 'info', 5000);
    },
    onError: (err: unknown) => {
      const msg = describeError(err);
      pushAlert(msg, 'error', 8000);
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
    clearAlerts();
    pushAlert(
      lang === 'tr'
        ? `"${file.name}" dosyası işleniyor ve ürünlerle eşleştiriliyor...`
        : `Processing "${file.name}" and matching products...`,
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

  return (
    <div className={`mx-auto max-w-5xl ${isMobile ? 'p-4' : 'p-6'}`}>
      {/* Yükleme alanı */}
      <div
        data-tour="campaigns-upload-dropzone"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => {
          pushAlert(
            lang === 'tr'
              ? 'Kampanya Excel Yükle: Trendyol Yıldızlı, Flaş veya Plus kampanya Excel dökümlerini yükleyebilirsiniz. Dosya barkod/SKU ve ilgili kampanya fiyatı kolonlarını içermelidir.'
              : 'Upload Campaign Excel: Supports Trendyol Starred, Flash, or Plus campaign Excel exports. File must contain barcode/SKU and respective campaign price columns.',
            'info',
            9000
          );
          fileRef.current?.click();
        }}
        className={`mb-4 cursor-pointer rounded-[var(--radius)] border-2 border-dashed text-center transition-colors ${isMobile ? 'px-4 py-6' : 'p-12'} ${
          dragging ? 'border-accent bg-accent-soft' : 'border-border bg-card'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload size={32} className={`mx-auto mb-3 ${dragging ? 'text-accent' : 'text-fg-muted'}`} />
        <p className="mb-1 text-sm font-semibold text-fg">{t('campaign_upload_title')}</p>
        <p className="text-xs text-fg-muted">{t('campaign_upload_drag')}</p>
        {uploadMut.isPending && <p className="mt-3 text-xs text-accent">{t('loading')}</p>}
      </div>

      {/* Yükleme sonucu bildirimi */}
      {uploadResult && (
        <div className={`mb-4 flex items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-[13px] font-medium ${
          uploadResult.ok ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
        }`}>
          <AlertCircle size={14} />
          {uploadResult.message}
        </div>
      )}

      {/* Yükleme geçmişi — tek toolbar: sayaç + rozet + şablon indirme */}
      <div data-tour="campaigns-history" className="overflow-hidden rounded-[var(--radius)] border border-border bg-card">
        <div className={`flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5 ${isMobile ? 'flex-col items-stretch' : ''}`}>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-fg">{t('campaign_uploads_history')}</h2>
            {uploads.length > 0 && (
              <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[11px] font-bold tabular-nums text-fg-muted">{uploads.length}</span>
            )}
          </div>
          <button
            data-tour="campaigns-template-btn"
            type="button"
            onClick={() => excelReportApi.downloadTemplate('Campaign')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-border bg-card font-bold text-accent shadow-xs ${
              isMobile ? 'px-3 py-2 text-xs' : 'px-3 py-1.5 text-[12px]'
            }`}
          >
            <Download size={13} />
            {lang === 'tr' ? 'Şablon İndir' : 'Download Template'}
          </button>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-[13px] text-fg-muted">{t('loading')}</div>
        ) : uploads.length === 0 ? (
          <div className="p-10 text-center text-[13px] text-fg-muted">{t('campaign_no_uploads')}</div>
        ) : isMobile ? (
          <ul className="m-0 flex list-none flex-col gap-2.5 p-3">
            {uploads.map((up) => (
              <li key={up.id} className="rounded-2xl border border-border bg-card p-3.5 shadow-xs">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Link href={`/campaigns/analysis/${up.id}`} className="flex min-w-0 items-center gap-2 text-accent no-underline">
                    <FileSpreadsheet size={16} className="shrink-0" />
                    <span className="truncate text-[13px] font-semibold">{up.fileName}</span>
                  </Link>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CLASSES[up.status] ?? 'bg-bg-subtle text-fg-muted'}`}>
                    {up.status}
                  </span>
                </div>
                <div className="mb-2.5 flex items-center justify-between text-xs text-fg-muted">
                  <span>{up.campaignType === 'Opportunity' ? 'Referans Tarife' : up.campaignType} · {formatDateTime(up.uploadedAt)}</span>
                  <span className="font-semibold text-fg">{up.matchedRows} / {up.totalRows}</span>
                </div>
                <div className="flex items-center gap-2 border-t border-border-soft pt-2.5">
                  <Link
                    href={`/orders?campaignUploadId=${up.id}`}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-border py-1.5 text-xs font-semibold text-accent"
                  >
                    <ShoppingCart size={13} />
                    {lang === 'tr' ? 'Siparişler' : 'Orders'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDelete(up)}
                    className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-border p-1.5 text-fg-muted"
                    title={t('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-bg-subtle">
                <th className="px-4 py-2.5 font-semibold text-fg-muted">{t('campaign_filename')}</th>
                <th className="px-4 py-2.5 font-semibold text-fg-muted">Tip</th>
                <th className="px-4 py-2.5 font-semibold text-fg-muted">{t('campaign_date')}</th>
                <th className="px-4 py-2.5 font-semibold text-fg-muted">{t('status')}</th>
                <th className="px-4 py-2.5 text-right font-semibold text-fg-muted">{t('campaign_matched')}</th>
                <th className="px-4 py-2.5 text-right font-semibold text-fg-muted">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {uploads.map((up) => (
                <tr key={up.id} className="border-b border-border-soft last:border-0">
                  <td className="px-4 py-3 font-medium text-fg">
                    <Link href={`/campaigns/analysis/${up.id}`} className="flex items-center gap-2 text-accent no-underline">
                      <FileSpreadsheet size={16} className="shrink-0 text-accent" />
                      {up.fileName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-fg-muted">
                    {up.campaignType === 'Opportunity' ? 'Referans Tarife' : up.campaignType}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{formatDateTime(up.uploadedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[up.status] ?? 'bg-bg-subtle text-fg-muted'}`}>
                      {up.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-fg">
                    {up.matchedRows} / {up.totalRows}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/orders?campaignUploadId=${up.id}`}
                        className="inline-flex items-center justify-center rounded p-1 text-accent"
                        title={lang === 'tr' ? 'Kampanya Siparişlerini Gör' : 'See Campaign Orders'}
                      >
                        <ShoppingCart size={15} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setPendingDelete(up)}
                        className="rounded border-0 bg-transparent p-1 text-fg-muted"
                        title={t('delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('campaign_delete_confirm')}
        description={pendingDelete ? (lang === 'tr'
          ? `"${pendingDelete.fileName}" dosyasını ve içindeki ${pendingDelete.totalRows} ürün kaydını silmek üzeresiniz. Bu işlem geri alınamaz ve En İyi Aksiyon sonuçlarını etkileyebilir.`
          : `You are about to delete "${pendingDelete.fileName}" and its ${pendingDelete.totalRows} product records. This action cannot be undone and may affect Best Action results.`) : ''}
        destructive
        onConfirm={() => pendingDelete && deleteMut.mutate(pendingDelete.id)}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
