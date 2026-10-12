'use client';

import { useMemo, useRef, useState } from 'react';
import { FileSpreadsheet, RefreshCw, Download, Search, Upload, Trash2 } from 'lucide-react';
import {
  useBaseTrackReportTemplates,
  useBaseTrackReport,
  useRefreshBaseTrackReport,
  useBaseTrackReportUpload,
  useBaseTrackReportMerged,
  useParseBaseTrackReportUpload,
  useCommitBaseTrackReportUpload,
  useDeleteBaseTrackReportUpload,
} from '@/hooks/basetrack/useBaseTrack';
import type { BaseTrackReportColumn, BaseTrackReportRow, BaseTrackReportUploadPreview } from '@/lib/api';
import { downloadExcel, type ExportColumn } from '../../lib/export';
import { ReportGrid } from './ReportGrid';
import { UploadPreviewDialog } from './UploadPreviewDialog';
import { useFeedback } from '../shared/Feedback';
import type { ExportRow } from '../../components/ui/ExportMenu';

const PREVIEW_LIMIT = 500;

type View = 'calculated' | 'uploaded' | 'merged';

const VIEWS: { key: View; label: string }[] = [
  { key: 'calculated', label: 'Hesaplanan' },
  { key: 'uploaded', label: 'Yüklenen' },
  { key: 'merged', label: 'Birleşik' },
];

export function ReportsTab() {
  const templates = useBaseTrackReportTemplates();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [view, setView] = useState<View>('calculated');
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<BaseTrackReportUploadPreview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { notify, confirm } = useFeedback();

  const activeKey = selectedKey ?? templates.data?.[0]?.key ?? null;
  const activeTemplate = templates.data?.find((t) => t.key === activeKey);

  const report = useBaseTrackReport(activeKey);
  const upload = useBaseTrackReportUpload(activeKey);
  const merged = useBaseTrackReportMerged(activeKey, view === 'merged');

  const refreshMutation = useRefreshBaseTrackReport();
  const parseUpload = useParseBaseTrackReportUpload();
  const commitUpload = useCommitBaseTrackReportUpload();
  const deleteUpload = useDeleteBaseTrackReportUpload();

  const columns: BaseTrackReportColumn[] = useMemo(() => {
    if (view === 'merged') return merged.data?.columns ?? [];
    return activeTemplate?.columns ?? [];
  }, [view, merged.data, activeTemplate]);

  const rawRows: BaseTrackReportRow[] = useMemo(() => {
    if (view === 'merged') return (merged.data?.rows as BaseTrackReportRow[]) ?? [];
    if (view === 'uploaded') return (upload.data?.rows as BaseTrackReportRow[]) ?? [];
    return (report.data?.rows as BaseTrackReportRow[]) ?? [];
  }, [view, merged.data, upload.data, report.data]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rawRows;
    return rawRows.filter((r) =>
      Object.values(r).some((v) => v !== null && v !== undefined && String(v).toLowerCase().includes(q)),
    );
  }, [rawRows, search]);

  const previewRows = filteredRows.slice(0, PREVIEW_LIMIT);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeKey) return;
    try {
      const parsed = await parseUpload.mutateAsync({ templateKey: activeKey, file });
      setPreview(parsed);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Excel okunamadı.');
    } finally {
      e.target.value = '';
    }
  };

  const handleCommit = async () => {
    if (!preview || !activeKey) return;
    try {
      await commitUpload.mutateAsync({ templateKey: activeKey, fileName: preview.fileName, rows: preview.rows });
      notify.success('Yüklenen rapor kaydedildi.');
      setPreview(null);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Kaydedilemedi.');
    }
  };

  const handleDeleteUpload = async () => {
    if (!activeKey) return;
    const ok = await confirm({
      title: 'Yüklenen rapor silinsin mi?',
      body: 'Bu şablona ait yüklenmiş Excel verisi silinecek.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteUpload.mutateAsync(activeKey);
      notify.success('Yüklenen veri silindi.');
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Silinemedi.');
    }
  };

  const handleDownload = () => {
    if (!activeTemplate || rawRows.length === 0) return;
    const exportCols: ExportColumn[] = columns.map((c) => ({
      key: c.key,
      header: c.label,
      type: c.type === 'number' ? 'int' : 'text',
    }));
    downloadExcel(
      `${activeTemplate.key}-${view}-${new Date().toISOString().slice(0, 10)}.xlsx`,
      rawRows as ExportRow[],
      exportCols,
    );
  };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div data-tour="basetrack-reports-header">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">BaseTrack Raporları</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Tedarik zinciri, sipariş eşleşmeleri ve stok hareketleri raporları.
        </p>
      </div>

      {/* Template Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-soft)] pb-2">
        {templates.data?.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSelectedKey(t.key)}
            className={`h-7.5 px-3 rounded-[3px] font-semibold text-xs transition cursor-pointer ${
              activeKey === t.key
                ? 'bg-[var(--fg)] text-[var(--bg)] shadow-xs'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* View Modes & Action Toolbar */}
      <div data-tour="basetrack-reports-toolbar" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[var(--bg-subtle)]/60 p-0.5 rounded-[4px] border border-[var(--border-soft)]">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={`h-7 px-3 rounded-[3px] font-semibold text-xs transition cursor-pointer ${
                view === v.key
                  ? 'bg-[var(--card)] text-[var(--fg)] shadow-xs border border-[var(--border-soft)]'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-56">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rapor içinde ara..."
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          {view === 'calculated' && activeKey && (
            <button
              type="button"
              onClick={() => refreshMutation.mutate(activeKey)}
              disabled={refreshMutation.isPending}
              className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={refreshMutation.isPending ? 'animate-spin' : ''} />
              <span>Yenile</span>
            </button>
          )}

          {view === 'uploaded' && (
            <>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={parseUpload.isPending}
                className="h-8 px-3 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <Upload size={12} />
                <span>Excel Yükle</span>
              </button>
              <input ref={fileInput} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="hidden" />

              {rawRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteUpload}
                  disabled={deleteUpload.isPending}
                  className="h-8 px-2.5 rounded-[4px] border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-semibold transition cursor-pointer"
                  title="Yüklenen Veriyi Sil"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={rawRows.length === 0}
            className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
          >
            <Download size={12} />
            <span>Excel İndir ({filteredRows.length})</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div data-tour="basetrack-reports-grid" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        <ReportGrid
          columns={columns}
          rows={previewRows}
          previewLimit={PREVIEW_LIMIT}
          emptyText="Bu raporda görüntülenecek veri bulunamadı."
          showSource={view === 'merged'}
        />
      </div>

      {preview && (
        <UploadPreviewDialog
          preview={preview}
          onCancel={() => setPreview(null)}
          onConfirm={handleCommit}
          isSaving={commitUpload.isPending}
        />
      )}
    </div>
  );
}
