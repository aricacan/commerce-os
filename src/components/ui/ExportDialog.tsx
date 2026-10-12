'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileSpreadsheet, FileText, FileDown, ArrowUp, ArrowDown, X, Save, Trash2, Bookmark, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { pushAlert } from '../../stores/alert-stack';
import { localDateStr } from '../../utils/date';
import { CustomCheckbox } from './CustomCheckbox';
import { layers } from '../../features/shared/design';
import type { ExportRow } from './ExportMenu';
import {
  downloadExcel, downloadCsvFile, processRows, resolveFetchLimit, formatCellText,
  applyCurrencyMode, appendTotalsRow, hasConvertibleMoney,
  type ExportColumn, type CurrencyMode,
} from '../../lib/export';
import { useBaseCurrency } from '../../hooks/useBaseCurrency';
import {
  loadPrefs, savePrefs, loadPresets, savePreset, deletePreset,
  resolveIncluded, excludedFrom, type ColumnPreset,
} from '../../lib/export-prefs';
import { exportJobsApi } from '../../lib/api/export-jobs';
import { text } from '../../features/shared/design';

type BackgroundExportState = 'idle' | 'starting' | 'running' | 'completed' | 'failed';
const BG_POLL_INTERVAL_MS = 2000;
const PREVIEW_ROWS = 8;

interface Props {
  filename: string;
  columns: ExportColumn[];
  total: number;
  fetchRows: (opts?: { limit?: number }) => Promise<ExportRow[]>;
  onClose: () => void;
  backgroundExport?: { start: () => Promise<{ jobId: string }> };
}

type ExportFormat = 'excel' | 'csv' | 'pdf';
type RowScope = 'all' | 'first' | 'range';

const FORMATS: { key: ExportFormat; label: string; icon: typeof FileText; ext: string }[] = [
  { key: 'excel', label: 'Excel', icon: FileSpreadsheet, ext: 'xlsx' },
  { key: 'csv', label: 'CSV', icon: FileText, ext: 'csv' },
  { key: 'pdf', label: 'PDF', icon: FileDown, ext: 'pdf' },
];

const L = {
  tr: {
    title: 'Dışa Aktar Seçenekleri', format: 'Biçim', rows: 'Satırlar', all: 'Hepsi',
    first: 'İlk', rangeLabel: 'Aralık', to: '–', columns: 'Sütunlar', selectAll: 'Tümü',
    clear: 'Temizle', sort: 'Sıralama', none: 'Yok', filename: 'Dosya adı',
    download: 'İndir', cancel: 'İptal', selected: 'seçili', of: '/', rowsUnit: 'satır',
    colsSelected: 'sütun seçili', emptyCols: 'En az bir sütun seçin',
    presets: 'Şablon', presetPlaceholder: 'Şablon adı', save: 'Kaydet', apply: 'Uygula',
    presetSaved: 'Şablon kaydedildi', preview: 'Önizleme', previewEmpty: 'Önizlenecek veri yok', more: 'satır daha',
    currency: 'Para birimi', both: 'İkisi', totalsRow: 'Toplam satırı ekle',
  },
  en: {
    title: 'Export Options', format: 'Format', rows: 'Rows', all: 'All',
    first: 'First', rangeLabel: 'Range', to: '–', columns: 'Columns', selectAll: 'All',
    clear: 'Clear', sort: 'Sort', none: 'None', filename: 'File name',
    download: 'Download', cancel: 'Cancel', selected: 'selected', of: '/', rowsUnit: 'rows',
    colsSelected: 'columns selected', emptyCols: 'Select at least one column',
    presets: 'Preset', presetPlaceholder: 'Preset name', save: 'Save', apply: 'Apply',
    presetSaved: 'Preset saved', preview: 'Preview', previewEmpty: 'No data to preview', more: 'more rows',
    currency: 'Currency', both: 'Both', totalsRow: 'Add totals row',
  },
};

export function ExportDialog({ filename, columns, total, fetchRows, onClose, backgroundExport }: Props) {
  const { lang } = useI18n();
  const tr = lang === 'tr' ? L.tr : L.en;

  const saved = useMemo(() => loadPrefs(filename), [filename]);
  const colKeys = useMemo(() => columns.map((c) => c.key), [columns]);

  const [format, setFormat] = useState<ExportFormat>(saved.format ?? 'excel');
  const [scope, setScope] = useState<RowScope>('all');
  const [firstN, setFirstN] = useState(Math.min(100, total));
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(Math.min(100, total));
  const [included, setIncluded] = useState<Record<string, boolean>>(
    () => resolveIncluded(colKeys, saved.excludedCols),
  );
  const [sortKey, setSortKey] = useState(saved.sortKey ?? '');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(saved.sortDir ?? 'asc');
  const [name, setName] = useState(`${filename}-${localDateStr()}`);
  const [busy, setBusy] = useState(false);

  const [bgState, setBgState] = useState<BackgroundExportState>('idle');
  const [bgError, setBgError] = useState<string | null>(null);
  const [bgResult, setBgResult] = useState<{ jobId: string; fileName: string } | null>(null);
  const bgPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (bgPollRef.current) clearInterval(bgPollRef.current);
  }, []);

  function stopBgPolling() {
    if (bgPollRef.current) { clearInterval(bgPollRef.current); bgPollRef.current = null; }
  }

  async function startBackgroundExport() {
    if (!backgroundExport) return;
    setBgState('starting');
    setBgError(null);
    setBgResult(null);
    try {
      const { jobId } = await backgroundExport.start();
      setBgState('running');
      bgPollRef.current = setInterval(async () => {
        try {
          const status = await exportJobsApi.status(jobId);
          if (status.state === 'Completed') {
            stopBgPolling();
            setBgResult({ jobId, fileName: status.fileName });
            setBgState('completed');
          } else if (status.state === 'Failed') {
            stopBgPolling();
            setBgError(status.errorMessage);
            setBgState('failed');
          } else if (status.state === 'NotFound') {
            stopBgPolling();
            setBgError('İş bulunamadı.');
            setBgState('failed');
          }
        } catch {
          /* retry next tick */
        }
      }, BG_POLL_INTERVAL_MS);
    } catch (err) {
      setBgState('failed');
      setBgError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleBgDownload() {
    if (!bgResult) return;
    try {
      await exportJobsApi.download(bgResult.jobId, bgResult.fileName);
    } catch (err) {
      console.error(err);
      pushAlert('Export failed', 'error');
    }
  }

  const [presets, setPresets] = useState<ColumnPreset[]>(() => loadPresets(filename));
  const [presetDraft, setPresetDraft] = useState('');

  const { rate } = useBaseCurrency();
  const [currencyMode, setCurrencyMode] = useState<CurrencyMode>(saved.currencyMode ?? 'try');
  const [withTotals, setWithTotals] = useState(saved.withTotals ?? false);
  const canChooseCurrency = rate > 0 && hasConvertibleMoney(columns);

  const [previewRows, setPreviewRows] = useState<ExportRow[] | null>(null);

  const selectedCols = useMemo(() => columns.filter((c) => included[c.key]), [columns, included]);

  useEffect(() => {
    let alive = true;
    fetchRows({ limit: PREVIEW_ROWS })
      .then((rows) => { if (alive) setPreviewRows(rows.slice(0, PREVIEW_ROWS)); })
      .catch(() => { if (alive) setPreviewRows([]); });
    return () => { alive = false; };
  }, [fetchRows]);

  const previewView = useMemo(
    () => (previewRows ? applyCurrencyMode(previewRows, selectedCols, currencyMode, rate) : null),
    [previewRows, selectedCols, currencyMode, rate],
  );

  const selectedRowCount = useMemo(() => {
    if (scope === 'first') return Math.max(0, Math.min(firstN, total));
    if (scope === 'range') return Math.max(0, Math.min(rangeTo, total) - (rangeFrom - 1));
    return total;
  }, [scope, firstN, rangeFrom, rangeTo, total]);

  async function handleDownload() {
    if (!selectedCols.length) { pushAlert(tr.emptyCols, 'error'); return; }

    savePrefs(filename, {
      format, excludedCols: excludedFrom(colKeys, included), sortKey, sortDir, currencyMode, withTotals,
    });

    if (backgroundExport && scope === 'all' && format === 'excel') {
      await startBackgroundExport();
      return;
    }

    setBusy(true);
    try {
      const fetchLimit = resolveFetchLimit({ scope, sortKey, firstN });
      const fetched = await fetchRows(fetchLimit != null ? { limit: fetchLimit } : undefined);
      const scoped = processRows(fetched, columns, { scope, firstN, rangeFrom, rangeTo, sortKey, sortDir });
      if (!scoped.length) return;

      const conv = applyCurrencyMode(scoped, selectedCols, currencyMode, rate);
      const outRows = withTotals ? appendTotalsRow(conv.rows, conv.columns) : conv.rows;
      const outCols = conv.columns;
      const ext = FORMATS.find((f) => f.key === format)!.ext;
      const base = name.trim() || filename;
      const downloadName = `${base}.${ext}`;

      if (format === 'excel') await downloadExcel(downloadName, outRows, outCols);
      else if (format === 'csv') downloadCsvFile(downloadName, outRows, outCols);
      else {
        const { downloadPdf } = await import('../../lib/export-pdf');
        await downloadPdf(downloadName, outRows, outCols, base);
      }
      pushAlert(`${downloadName} indirildi`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      pushAlert('Export failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  function handleSavePreset() {
    const includedKeys = colKeys.filter((k) => included[k]);
    setPresets(savePreset(filename, presetDraft, includedKeys));
    setPresetDraft('');
    pushAlert(tr.presetSaved, 'success', 2000);
  }

  function applyPreset(preset: ColumnPreset) {
    const keep = new Set(preset.columns);
    setIncluded(Object.fromEntries(colKeys.map((k) => [k, keep.has(k)])));
  }

  function handleDeletePreset(pName: string) {
    setPresets(deletePreset(filename, pName));
  }

  if (typeof document === 'undefined') return null;

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-soft)',
    background: 'var(--card)', color: 'var(--fg)', fontSize: text.sm, outline: 'none', width: '100%',
  };
  const sectionLabel: React.CSSProperties = { fontSize: text.xs, fontWeight: 700, color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' };

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: layers.modal, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)', padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 8,
          width: '100%', maxWidth: 460, maxHeight: '88vh', boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column', animation: 'confirmDialogFadeIn 0.15s ease-out',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-soft)' }}>
          <h2 style={{ fontSize: text.md, fontWeight: 700, color: 'var(--fg)', margin: 0 }}>{tr.title}</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {/* Format */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabel}>{tr.format}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {FORMATS.map(({ key, label, icon: Icon }) => {
                const active = format === key;
                return (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    title={label}
                    aria-label={label}
                    className="export-dialog-format-btn"
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: text.sm, fontWeight: 600,
                      border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border-soft)'}`,
                      background: active ? 'var(--card-hover)' : 'var(--card)',
                      color: active ? 'var(--fg)' : 'var(--fg-muted)', transition: 'all .12s',
                    }}
                  >
                    <Icon size={13} /> <span className="export-dialog-format-label">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {canChooseCurrency && (
              <>
                <span style={sectionLabel}>{tr.currency}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([
                    { key: 'try' as CurrencyMode, label: '₺ TL' },
                    { key: 'gbp' as CurrencyMode, label: '£ GBP' },
                    { key: 'both' as CurrencyMode, label: tr.both },
                  ]).map(({ key, label }) => {
                    const active = currencyMode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setCurrencyMode(key)}
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: 6, cursor: 'pointer',
                          fontSize: text.sm, fontWeight: 600,
                          border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border-soft)'}`,
                          background: active ? 'var(--card-hover)' : 'var(--card)',
                          color: active ? 'var(--fg)' : 'var(--fg-muted)', transition: 'all .12s',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: text.sm, color: 'var(--fg)', cursor: 'pointer' }}>
              <CustomCheckbox checked={withTotals} onChange={setWithTotals} />
              {tr.totalsRow}
            </label>
          </div>

          {/* Rows scope */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={sectionLabel}>{tr.rows}</span>
              <span style={{ fontSize: text.xs, fontWeight: 600, color: 'var(--fg)' }}>
                {selectedRowCount} {tr.of} {total} {tr.rowsUnit}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: text.sm, color: 'var(--fg)', cursor: 'pointer' }}>
                <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} />
                {tr.all} ({total})
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: text.sm, color: 'var(--fg)', cursor: 'pointer' }}>
                <input type="radio" checked={scope === 'first'} onChange={() => setScope('first')} />
                {tr.first}
                <input
                  type="number" min={1} max={total} value={firstN}
                  onChange={(e) => { setScope('first'); setFirstN(Math.max(1, Math.min(total, Number(e.target.value) || 1))); }}
                  style={{ ...inputStyle, width: 80 }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: text.sm, color: 'var(--fg)', cursor: 'pointer' }}>
                <input type="radio" checked={scope === 'range'} onChange={() => setScope('range')} />
                {tr.rangeLabel}
                <input type="number" min={1} max={total} value={rangeFrom}
                  onChange={(e) => { setScope('range'); setRangeFrom(Math.max(1, Math.min(total, Number(e.target.value) || 1))); }}
                  style={{ ...inputStyle, width: 65 }} />
                <span style={{ color: 'var(--fg-muted)' }}>{tr.to}</span>
                <input type="number" min={1} max={total} value={rangeTo}
                  onChange={(e) => { setScope('range'); setRangeTo(Math.max(1, Math.min(total, Number(e.target.value) || 1))); }}
                  style={{ ...inputStyle, width: 65 }} />
              </label>
            </div>
          </div>

          {/* Columns */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={sectionLabel}>{tr.columns} ({selectedCols.length}/{columns.length})</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setIncluded(Object.fromEntries(columns.map((c) => [c.key, true])))}
                  style={{ background: 'none', border: 'none', color: 'var(--fg)', fontSize: text.xs, fontWeight: 600, cursor: 'pointer' }}>{tr.selectAll}</button>
                <button onClick={() => setIncluded(Object.fromEntries(columns.map((c) => [c.key, false])))}
                  style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', fontSize: text.xs, fontWeight: 600, cursor: 'pointer' }}>{tr.clear}</button>
              </div>
            </div>
            <div
              className="export-dialog-columns-grid"
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6,
                maxHeight: 240, overflowY: 'auto', padding: 8, borderRadius: 6,
                border: '1px solid var(--border-soft)', background: 'var(--card)',
              }}
            >
              {columns.map((c) => (
                <label
                  key={c.key}
                  className="export-dialog-column-option"
                  title={c.header}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '18px minmax(0, 1fr)',
                    alignItems: 'center',
                    gap: 6,
                    minWidth: 0,
                    padding: '5px 7px',
                    borderRadius: 4,
                    border: '1px solid var(--border-soft)',
                    background: 'var(--card)',
                    fontSize: text.xs,
                    color: 'var(--fg)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  <CustomCheckbox checked={!!included[c.key]} onChange={(v) => setIncluded((p) => ({ ...p, [c.key]: v }))} />
                  <span
                    style={{
                      minWidth: 0,
                      overflowWrap: 'anywhere',
                      wordBreak: 'break-word',
                      lineHeight: 1.2,
                    }}
                  >
                    {c.header}
                  </span>
                </label>
              ))}
            </div>
            {/* Sütun şablonları */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Bookmark size={12} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
              {presets.map((p) => (
                <span key={p.name} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px 2px 8px',
                  borderRadius: 16, border: '1px solid var(--border-soft)', background: 'var(--card)', fontSize: text.xs,
                }}>
                  <button onClick={() => applyPreset(p)} title={tr.apply}
                    style={{ background: 'none', border: 'none', color: 'var(--fg)', fontSize: text.xs, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {p.name}
                  </button>
                  <button onClick={() => handleDeletePreset(p.name)} title="×"
                    style={{ background: 'none', border: 'none', color: 'var(--fg-subtle)', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    <Trash2 size={10} />
                  </button>
                </span>
              ))}
              <input
                value={presetDraft}
                onChange={(e) => setPresetDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && presetDraft.trim()) handleSavePreset(); }}
                placeholder={tr.presetPlaceholder}
                style={{ ...inputStyle, width: 110, padding: '3px 6px', fontSize: text.xs }}
              />
              <button onClick={handleSavePreset} disabled={!presetDraft.trim()} title={tr.save}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-soft)',
                  background: presetDraft.trim() ? 'var(--card-hover)' : 'var(--card)',
                  color: presetDraft.trim() ? 'var(--fg)' : 'var(--fg-subtle)',
                  fontSize: text.xs, fontWeight: 600, cursor: presetDraft.trim() ? 'pointer' : 'not-allowed',
                }}>
                <Save size={11} /> {tr.save}
              </button>
            </div>
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabel}>{tr.sort}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ ...inputStyle, flex: 1, cursor: 'pointer' }}>
                <option value="">{tr.none}</option>
                {columns.map((c) => <option key={c.key} value={c.key}>{c.header}</option>)}
              </select>
              <button
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                disabled={!sortKey}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6,
                  border: '1px solid var(--border-soft)', background: 'var(--card)', color: sortKey ? 'var(--fg)' : 'var(--fg-subtle)',
                  fontSize: text.xs, fontWeight: 600, cursor: sortKey ? 'pointer' : 'not-allowed',
                }}
              >
                {sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {sortDir === 'asc' ? 'A→Z' : 'Z→A'}
              </button>
            </div>
          </div>

          {/* Filename */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabel}>{tr.filename}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
              <span style={{ fontSize: text.xs, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>.{FORMATS.find((f) => f.key === format)!.ext}</span>
            </div>
          </div>

          {/* Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={sectionLabel}>{tr.preview}</span>
            <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)' }}>
              {previewView === null ? (
                <div style={{ padding: 10, fontSize: text.xs, color: 'var(--fg-muted)' }}>…</div>
              ) : previewView.rows.length === 0 || !previewView.columns.length ? (
                <div style={{ padding: 10, fontSize: text.xs, color: 'var(--fg-muted)' }}>{tr.previewEmpty}</div>
              ) : (
                <table style={{ borderCollapse: 'collapse', fontSize: text.xs, whiteSpace: 'nowrap', width: '100%' }}>
                  <thead>
                    <tr>
                      {previewView.columns.map((c) => (
                        <th key={c.key} style={{ textAlign: 'left', padding: '5px 8px', color: 'var(--fg-muted)', fontWeight: 700, borderBottom: '1px solid var(--border-soft)', position: 'sticky', top: 0, background: 'var(--card)' }}>
                          {c.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewView.rows.map((r, i) => (
                      <tr key={i}>
                        {previewView.columns.map((c) => (
                          <td key={c.key} style={{ padding: '4px 8px', color: 'var(--fg)', borderBottom: '1px solid var(--border-soft)' }}>
                            {formatCellText(r[c.key], c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {previewRows !== null && selectedRowCount > previewRows.length && (
              <span style={{ fontSize: text.xs, color: 'var(--fg-subtle)' }}>
                … +{selectedRowCount - previewRows.length} {tr.more}
              </span>
            )}
          </div>
        </div>

        {/* Arka plan export durumu */}
        {bgState !== 'idle' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
            borderTop: '1px solid var(--border-soft)', fontSize: text.sm,
            background: bgState === 'failed' ? 'rgba(239,68,68,0.08)' : 'var(--card)',
          }}>
            {(bgState === 'starting' || bgState === 'running') && (
              <>
                <Loader2 size={13} className="export-dialog-spin" style={{ color: 'var(--fg)', flexShrink: 0 }} />
                <span style={{ color: 'var(--fg)' }}>Rapor hazırlanıyor… Pencereyi kapatabilirsiniz.</span>
              </>
            )}
            {bgState === 'failed' && (
              <>
                <AlertTriangle size={13} style={{ color: '#f43f5e', flexShrink: 0 }} />
                <span style={{ color: '#f43f5e', flex: 1 }}>{bgError ?? 'Rapor oluşturulamadı.'}</span>
                <button
                  onClick={startBackgroundExport}
                  style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: text.xs, fontWeight: 600, cursor: 'pointer' }}
                >
                  Tekrar dene
                </button>
              </>
            )}
            {bgState === 'completed' && bgResult && (
              <>
                <CheckCircle2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                <span style={{ color: 'var(--fg)', flex: 1 }}>Rapor hazır: {bgResult.fileName}</span>
                <button
                  onClick={handleBgDownload}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 4, border: 'none', background: 'var(--fg)', color: 'var(--card)', fontSize: text.xs, fontWeight: 700, cursor: 'pointer' }}
                >
                  <FileDown size={12} /> Dosyanı indir
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', padding: '12px 18px', borderTop: '1px solid var(--border-soft)' }}>
          <button onClick={onClose} style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)', fontSize: text.sm, fontWeight: 600, cursor: 'pointer' }}>
            {tr.cancel}
          </button>
          <button
            onClick={handleDownload}
            disabled={busy || bgState === 'starting' || bgState === 'running' || !selectedCols.length || selectedRowCount === 0}
            title={`${tr.download} (${selectedRowCount})`}
            aria-label={`${tr.download} (${selectedRowCount})`}
            className="export-dialog-download-btn"
            style={{
              padding: '7px 16px', borderRadius: 6, border: 'none',
              background: busy || bgState === 'starting' || bgState === 'running' || !selectedCols.length || selectedRowCount === 0 ? 'var(--card-hover)' : 'var(--fg)',
              color: busy || bgState === 'starting' || bgState === 'running' || !selectedCols.length || selectedRowCount === 0 ? 'var(--fg-muted)' : 'var(--card)',
              fontSize: text.sm, fontWeight: 700,
              cursor: busy || bgState === 'starting' || bgState === 'running' || !selectedCols.length || selectedRowCount === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <FileDown size={13} /> <span className="export-dialog-download-label">{tr.download} ({selectedRowCount})</span>
          </button>
        </div>
        <style>{`
          .export-dialog-spin { animation: exportDialogSpin 0.9s linear infinite; }
          @keyframes exportDialogSpin { to { transform: rotate(360deg); } }
          @keyframes confirmDialogFadeIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        `}</style>
      </div>
    </div>,
    document.body,
  );
}
