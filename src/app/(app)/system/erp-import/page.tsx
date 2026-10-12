'use client';

import { useRef, useState } from 'react';
import { Download, Upload, Server } from 'lucide-react';
import {
  useErpSources,
  useErpImportOrderColumns,
  useErpImportBatches,
  useParseErpOrders,
  useCommitErpOrders,
  useUndoErpImport,
} from '@/hooks/useErpImport';
import type { ErpImportBatch, ErpImportOrderPreview } from '@/lib/api';
import { downloadExcel, type ExportColumn } from '@/lib/export';
import { ImportPreviewPanel } from '@/features/erp-import/ImportPreviewPanel';
import { ImportHistoryPanel } from '@/features/erp-import/ImportHistoryPanel';
import { cardStyle, btnPrimary, btnGhost, selectStyle, ACCENT } from '@/features/erp-import/shared';

// ERP Excel İçe Aktarma — ERP'nin API'den vermediği (yasaklı/eski) dönemin siparişleri
// elle yüklenir. Hedef ERP kaynağı bu panelde seçilir; Topbar'ın ambient mağaza seçicisi
// burada BİLEREK gizlidir (bkz. Topbar.tsx STORE_SELECTOR_HIDDEN_PATHS).
export default function ErpImportPage() {
  const sources = useErpSources();
  const columns = useErpImportOrderColumns();
  const batches = useErpImportBatches();

  const parse = useParseErpOrders();
  const commit = useCommitErpOrders();
  const undo = useUndoErpImport();

  const [sourceId, setSourceId] = useState<number | null>(null);
  const [preview, setPreview] = useState<ErpImportOrderPreview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const activeSourceId = sourceId ?? sources.data?.[0]?.id ?? null;
  const activeSource = sources.data?.find((s) => s.id === activeSourceId);

  const handleDownloadTemplate = () => {
    if (!columns.data) return;
    const exportColumns: ExportColumn[] = columns.data.map((c) => ({
      key: c.key,
      header: c.required ? `${c.label} *` : c.label,
      type: c.type === 'number' ? 'decimal' : c.type === 'date' ? 'date' : 'text',
    }));
    // Satırsız şablon: sadece başlıklar. Yıldızlı sütunlar zorunlu.
    void downloadExcel('erp-siparis-sablonu.xlsx', [], exportColumns, 'Siparişler');
  };

  const handleFilePicked = async (file: File | undefined) => {
    if (!file || activeSourceId === null) return;
    const parsed = await parse.mutateAsync({ sourceId: activeSourceId, file });
    setPreview(parsed);
  };

  const handleConfirm = async () => {
    if (!preview) return;
    await commit.mutateAsync({
      fileName: preview.fileName,
      sourceId: preview.sourceId,
      rows: preview.rows,
    });
    setPreview(null);
  };

  const handleUndo = (batch: ErpImportBatch) => {
    const message =
      `"${batch.fileName}" yüklemesi geri alınacak.\n\n` +
      `${batch.createdCount} sipariş silinecek, ${batch.updatedCount} sipariş eski hâline dönecek.\n\n` +
      'Devam edilsin mi?';
    if (window.confirm(message)) undo.mutate(batch.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 24 }}>
      <div style={{
        ...cardStyle, padding: 14, display: 'flex', gap: 10,
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <Server size={15} color={ACCENT} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--fg, #111827)' }}>
          Hedef ERP
        </span>

        <select
          style={selectStyle}
          value={activeSourceId ?? ''}
          onChange={(e) => setSourceId(Number(e.target.value))}
          disabled={sources.isLoading}
        >
          {sources.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.country} · {s.erp} · {s.displayName || s.storeName}
            </option>
          ))}
        </select>

        <div style={{ flex: 1 }} />

        <button style={btnGhost} onClick={handleDownloadTemplate} disabled={!columns.data}>
          <Download size={13} />
          Şablon İndir
        </button>

        <input
          ref={fileInput}
          type="file"
          accept=".xlsx"
          style={{ display: 'none' }}
          onChange={(e) => {
            void handleFilePicked(e.target.files?.[0]);
            e.target.value = '';
          }}
        />

        <button
          style={btnPrimary}
          onClick={() => fileInput.current?.click()}
          disabled={activeSourceId === null || parse.isPending}
        >
          <Upload size={13} />
          {parse.isPending ? 'Okunuyor…' : 'Excel Yükle'}
        </button>
      </div>

      {activeSource && (
        <div style={{ fontSize: 11.5, color: 'var(--fg-muted, #6b7280)' }}>
          Yüklenen siparişler <strong>{activeSource.displayName || activeSource.storeName}</strong> mağazasına,
          canlı sync ile aynı eşleştirme anahtarıyla yazılır — sonradan gelen bir sync çift kayıt oluşturmaz.
        </div>
      )}

      {parse.isError && (
        <div style={{ ...cardStyle, padding: 14, fontSize: 12.5, color: '#b91c1c', background: '#fef2f2' }}>
          {(parse.error as Error).message}
        </div>
      )}

      {commit.isError && (
        <div style={{ ...cardStyle, padding: 14, fontSize: 12.5, color: '#b91c1c', background: '#fef2f2' }}>
          {(commit.error as Error).message}
        </div>
      )}

      {undo.isError && (
        <div style={{ ...cardStyle, padding: 14, fontSize: 12.5, color: '#b91c1c', background: '#fef2f2' }}>
          {(undo.error as Error).message}
        </div>
      )}

      {preview && (
        <ImportPreviewPanel
          preview={preview}
          isSaving={commit.isPending}
          onConfirm={() => void handleConfirm()}
          onCancel={() => setPreview(null)}
        />
      )}

      <ImportHistoryPanel
        batches={batches.data ?? []}
        isLoading={batches.isLoading}
        undoingId={undo.isPending ? undo.variables ?? null : null}
        onUndo={handleUndo}
      />
    </div>
  );
}
