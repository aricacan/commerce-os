'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Download, Upload } from 'lucide-react';
import { palette } from '../shared/design';
import {
  sonarImports,
  sonarMatches,
  sonarSites,
  type ImportBatchDto,
  type SonarImportPreview,
  type SupplierSiteDto,
} from '../../lib/api/sonar';
import { SupplierSuggestions } from './SupplierSuggestions';
import {
  Card, Empty, ErrorNote, Page, PageHeader, Stat, formatDateTime,
} from './shared';

export function ImportTab({ onUploaded }: { onUploaded?: () => void }) {
  const [batches, setBatches] = useState<ImportBatchDto[] | null>(null);
  const [sites, setSites] = useState<SupplierSiteDto[]>([]);
  const [preview, setPreview] = useState<SonarImportPreview | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [b, s] = await Promise.all([sonarImports.list(), sonarSites.list()]);
      setBatches(b);
      setSites(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Yüklemeler alınamadı.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const choose = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setPreview(null);
    try {
      // ÖNİZLEME: hiçbir şey kaydedilmez. Kullanıcı sütun eşlemesini görüp
      // onaylamadan veritabanına yazmak, yanlış dosyayı sessizce içeri almaktır.
      setPreview(await sonarImports.preview(file));
      setPendingFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya okunamadı.');
      setPendingFile(null);
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const commit = async () => {
    if (!pendingFile) return;
    setBusy(true);
    try {
      await sonarImports.upload(pendingFile);
      setPreview(null);
      setPendingFile(null);
      await load();
      onUploaded?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader
        dataTour="sonar-imports-header"
        title="Excel Yüklemeleri"
        description="OEM numaralarını içeren tedarikçi/sipariş dosyası. Sütunlar başlık adına göre bulunur; sıraları önemli değil."
        actions={
          <label
            data-tour="sonar-imports-upload"
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[4px] px-3 text-xs font-medium"
            style={{ background: palette.accent, color: palette.textOnFill }}
          >
            <Upload size={13} /> {busy ? 'İşleniyor…' : 'Excel seç'}
            <input ref={fileInput} type="file" accept=".xlsx" hidden onChange={choose}
              disabled={busy} />
          </label>
        }
      />

      {error && <ErrorNote message={error} />}

      {preview && (
        <PreviewCard preview={preview} busy={busy}
          onCommit={() => void commit()}
          onCancel={() => { setPreview(null); setPendingFile(null); }} />
      )}

      {batches?.length === 0 && !preview && (
        <Empty title="Henüz dosya yüklenmedi"
          hint="OEM sütunu ve ürün adı bulunan bir .xlsx dosyası seçin." />
      )}

      {batches && batches.length > 0 && (
        <div className="flex flex-col gap-2" data-tour="sonar-imports-list">
          {batches.map((b) => (
            <BatchRow key={b.id} batch={b} sites={sites} />
          ))}
        </div>
      )}
    </Page>
  );
}

function PreviewCard({ preview, busy, onCommit, onCancel }: {
  preview: SonarImportPreview;
  busy: boolean;
  onCommit: () => void;
  onCancel: () => void;
}) {
  return (
    <Card>
      <div className="mb-3 text-sm font-medium" style={{ color: palette.textStrong }}>
        Önizleme — henüz kaydedilmedi
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Satır" value={preview.rows.length} />
        <Stat label="Benzersiz OEM" value={preview.uniqueOemCount} />
        <Stat label="Aranacak OEM" value={preview.uniqueOemCountForMissingRows} tone="info" />
        <Stat label="Atlanan çöp" value={preview.junkTokenCount}
          tone={preview.junkTokenCount > 0 ? 'warn' : 'neutral'} />
      </div>

      {preview.unsearchableRowCount > 0 && (
        <p className="mt-3 text-xs" style={{ color: palette.textMuted }}>
          {preview.unsearchableRowCount} satırda aranabilir OEM yok — bunlar için
          hiçbir şey yapılamaz, ama satırlar korunur ve Excel çıktısında yer alır.
        </p>
      )}

      <div className="mt-4">
        <div className="mb-1.5 text-xs font-medium" style={{ color: palette.textLabel }}>
          Sütun eşlemesi
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(preview.columnMapping).map(([header, field]) => (
            <span key={header}
              className="rounded-md px-2 py-1 text-xs"
              style={{ background: palette.chipBg, color: palette.textMuted }}>
              {header} → <strong style={{ color: palette.text }}>{field}</strong>
            </span>
          ))}
        </div>
      </div>

      {preview.warnings.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1 text-xs" style={{ color: palette.warningText }}>
          {preview.warnings.map((w) => <li key={w}>• {w}</li>)}
        </ul>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm"
          style={{ border: `1px solid ${palette.border}`, color: palette.text }}>
          Vazgeç
        </button>
        <button type="button" onClick={onCommit} disabled={busy}
          className="rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-50"
          style={{ background: palette.accent, color: palette.textOnFill }}>
          {busy ? 'Kaydediliyor…' : 'Onayla ve kaydet'}
        </button>
      </div>
    </Card>
  );
}

function BatchRow({ batch, sites }: { batch: ImportBatchDto; sites: SupplierSiteDto[] }) {
  const [siteId, setSiteId] = useState<number | ''>(sites[0]?.id ?? '');
  const [prefillSupplier, setPrefillSupplier] = useState<string | null>(null);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium" style={{ color: palette.textStrong }}>
            {batch.fileName}
          </div>
          <div className="mt-0.5 text-xs" style={{ color: palette.textMuted }}>
            {formatDateTime(batch.createdAt)}
            {batch.uploadedBy && ` · ${batch.uploadedBy}`}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs"
            style={{ color: palette.textFaint }}>
            <span>{batch.rowCount} satır</span>
            <span>{batch.uniqueOemCount} benzersiz OEM</span>
            <span>{batch.pendingOemCount} aranacak</span>
            <span>{batch.rowsWithSupplierCode} satırda kod zaten var</span>
            {batch.junkTokenCount > 0 && <span>{batch.junkTokenCount} çöp atlandı</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value === '' ? '' : Number(e.target.value))}
            aria-label="Tedarikçi sitesi"
            className="rounded-lg px-2 py-1.5 text-xs"
            style={{
              background: palette.inputBg,
              border: `1px solid ${palette.border}`,
              color: palette.text,
            }}
          >
            {sites.length === 0 && <option value="">Site yok</option>}
            {sites.map((s) => <option key={s.id} value={s.id}>{s.displayName}</option>)}
          </select>

          <a
            href={siteId === '' ? undefined : sonarMatches.exportUrl(batch.id, siteId)}
            aria-disabled={siteId === ''}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs"
            style={{
              border: `1px solid ${palette.border}`,
              color: siteId === '' ? palette.textFaint : palette.text,
              pointerEvents: siteId === '' ? 'none' : undefined,
            }}
          >
            <Download size={13} /> Excel indir
          </a>
        </div>
      </div>

      <SupplierSuggestions
        importBatchId={batch.id}
        onAddSite={(supplier) => setPrefillSupplier(supplier)}
      />

      {prefillSupplier && (
        <p className="mt-2 text-xs" style={{ color: palette.textMuted }}>
          <strong>{prefillSupplier}</strong> için Siteler sekmesinden site ekleyin;
          link ve bayi giriş bilgilerini girmeniz yeterli.
        </p>
      )}
    </Card>
  );
}
