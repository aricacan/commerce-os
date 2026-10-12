'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileDown, Printer, Copy, Image, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { localDateStr } from '../../utils/date';
import { useI18n } from '../../lib/i18n';
import { pushAlert } from '../../stores/alert-stack';
import { downloadExcel, downloadCsvFile, toClipboardTsv, resolveColumns, type ExportColumn } from '../../lib/export';
import { ExportDialog } from './ExportDialog';
import { text } from '../../features/shared/design';

export interface ExportRow {
  [key: string]: string | number;
}

interface Props {
  filename: string;
  getData?: () => ExportRow[];
  getDataAsync?: (opts?: { limit?: number }) => Promise<ExportRow[]>;
  containerRef?: React.RefObject<HTMLElement | null>;
  label?: string;
  columns?: ExportColumn[];
  totalHint?: number;
  mobileExpanded?: boolean;
  /**
   * Yalnız ikon — pano kartlarının başlık çubuğu için. Metinli düğme dar bir kartta
   * başlığın yerini yiyor; `label` yine de PDF başlığı ve erişilebilirlik adı olarak
   * kullanılıyor, sadece görünmüyor.
   */
  compact?: boolean;
  backgroundExport?: { start: () => Promise<{ jobId: string }> };
  className?: string;
}

function resolveCssVars(el: Element) {
  const cs = getComputedStyle(document.documentElement);
  const resolve = (val: string) =>
    val.replace(/var\(([^),]+)[^)]*\)/g, (_, v) =>
      cs.getPropertyValue(v.trim()).trim() || 'inherit'
    );

  ['fill', 'stroke', 'color', 'stop-color'].forEach(attr => {
    const v = el.getAttribute(attr);
    if (v && v.includes('var(')) el.setAttribute(attr, resolve(v));
  });

  const style = el.getAttribute('style');
  if (style && style.includes('var(')) el.setAttribute('style', resolve(style));

  Array.from(el.children).forEach(resolveCssVars);
}

async function exportPng(container: HTMLElement, filename: string, noSvgMessage: string) {
  const svg = container.querySelector('svg');
  if (!svg) {
    // Grafiği olmayan kartlar (sıralama listeleri, sayı tabloları) da PNG verebilmeli:
    // SVG yoksa kartın TAMAMI yakalanır. Eskiden burada uyarı verilip çıkılıyordu ve
    // menüdeki PNG seçeneği o kartlarda hiç çalışmıyordu.
    await exportElementPng(container, filename, noSvgMessage);
    return;
  }

  const rect = svg.getBoundingClientRect();
  const W = Math.round(rect.width) || 600;
  const H = Math.round(rect.height) || 350;

  const clone = svg.cloneNode(true) as SVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(W));
  clone.setAttribute('height', String(H));
  resolveCssVars(clone);

  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = document.createElement('img');
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error('SVG yüklenemedi'));
    img.src = url;
  });

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const bg = getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#18181b';
  ctx.fillStyle = bg || '#18181b';
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  URL.revokeObjectURL(url);

  await new Promise<void>(res => {
    canvas.toBlob(b => {
      if (!b) return res();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `${filename}.png`;
      a.click();
      res();
    }, 'image/png');
  });
}

// html2canvas yolu — SVG serileştirme yerine kartın kendisini rasterleştirir.
// Modern renk fonksiyonları (oklch, color-mix) html2canvas 1.4 tarafından
// ayrıştırılamıyor; yakalamadan önce klondaki renkler gerçek rgb'ye sabitleniyor.
const UNSUPPORTED_COLOR = /oklch|oklab|color-mix|lab\(|lch\(/;
const COLOR_PROPS = [
  'color', 'backgroundColor', 'borderTopColor', 'borderRightColor',
  'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke',
] as const;

async function exportElementPng(element: HTMLElement, filename: string, failMessage: string) {
  const { default: html2canvas } = await import('html2canvas');

  const canvas = await html2canvas(element, {
    backgroundColor: toRgb(getComputedStyle(document.documentElement).getPropertyValue('--card').trim() || '#ffffff'),
    scale: 2,
    logging: false,
    // Dışa aktar menüsünün kendisi görüntüde olmamalı.
    ignoreElements: (el) => el.classList.contains('export-menu-root'),
    onclone: (_doc, clone) => freezeColors(element, clone),
  });

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error(failMessage);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.png`;
  link.click();
  URL.revokeObjectURL(url);
}

// Klon kaynağın derin kopyası olduğu için `querySelectorAll('*')` sıralaması ikisinde
// aynı; eşleme indeks üzerinden güvenle yapılabiliyor.
function freezeColors(source: HTMLElement, clone: HTMLElement) {
  const sourceNodes = [source, ...source.querySelectorAll<HTMLElement>('*')];
  const cloneNodes = [clone, ...clone.querySelectorAll<HTMLElement>('*')];

  sourceNodes.forEach((node, index) => {
    const target = cloneNodes[index];
    if (!target) return;

    const computed = getComputedStyle(node);
    for (const prop of COLOR_PROPS) {
      const value = computed[prop];
      if (typeof value === 'string' && UNSUPPORTED_COLOR.test(value)) {
        target.style.setProperty(prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), toRgb(value));
      }
    }

    if (UNSUPPORTED_COLOR.test(computed.backgroundImage)) target.style.backgroundImage = 'none';
    if (UNSUPPORTED_COLOR.test(computed.boxShadow)) target.style.boxShadow = 'none';
  });
}

// Renk çevirisi 1x1 piksel BOYAYARAK yapılır: Chrome, fillStyle'a atanan `oklch(...)`
// değerini geri okurken aynen döndürüyor, rasterleştirilmiş piksel ise gerçek rgb.
let converterContext: CanvasRenderingContext2D | null = null;

function toRgb(value: string): string {
  if (converterContext === null) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    converterContext = canvas.getContext('2d', { willReadFrequently: true });
  }
  if (!converterContext) return '#ffffff';

  converterContext.clearRect(0, 0, 1, 1);
  converterContext.fillStyle = '#ffffff';
  converterContext.fillStyle = value;
  converterContext.fillRect(0, 0, 1, 1);

  const [r, g, b, a] = converterContext.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

interface DialogState {
  fetchRows: (opts?: { limit?: number }) => Promise<ExportRow[]>;
  cols: ExportColumn[];
  total: number;
}

export function ExportMenu({ filename, getData, getDataAsync, containerRef, label, columns, totalHint, mobileExpanded = false, compact = false, backgroundExport, className = '' }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pngLoading, setPngLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonLabel = label ?? t('export_menu_label');

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function handlePng() {
    setOpen(false);
    if (!containerRef?.current) {
      pushAlert(t('export_menu_no_container'), 'error');
      return;
    }
    setPngLoading(true);
    try {
      await exportPng(containerRef.current, `${filename}-${localDateStr()}`, t('export_menu_no_svg_found'));
      pushAlert(lang === 'tr' ? `${filename}-${localDateStr()}.png indirildi` : `${filename}-${localDateStr()}.png downloaded`, 'success');
    } catch {
      pushAlert(t('export_menu_png_failed'), 'error');
    } finally {
      setPngLoading(false);
    }
  }

  function handlePrint() {
    setOpen(false);
    window.print();
  }

  async function resolveData(): Promise<ExportRow[]> {
    if (getDataAsync) {
      setLoading(true);
      try {
        return await getDataAsync();
      } catch (err) {
        console.error(err);
        pushAlert(t('export_failed') || 'Export failed', 'error');
        return [];
      } finally {
        setLoading(false);
      }
    }
    return getData ? getData() : [];
  }

  async function handleDownload(type: 'csv' | 'excel') {
    setOpen(false);
    const rows = await resolveData();
    if (!rows.length) return;
    const ext = type === 'csv' ? 'csv' : 'xlsx';
    const downloadName = `${filename}-${localDateStr()}.${ext}`;
    try {
      if (type === 'csv') downloadCsvFile(downloadName, rows, columns);
      else await downloadExcel(downloadName, rows, columns);
      pushAlert(lang === 'tr' ? `${downloadName} indirildi` : `${downloadName} downloaded`, 'success');
    } catch (err) {
      console.error(err);
      pushAlert(t('export_failed') || 'Export failed', 'error');
    }
  }

  async function handleOptions() {
    setOpen(false);
    if (getDataAsync && totalHint != null && columns) {
      setDialog({ fetchRows: (opts) => getDataAsync(opts), cols: columns, total: totalHint });
      return;
    }
    const rows = await resolveData();
    if (!rows.length) return;
    setDialog({ fetchRows: async () => rows, cols: resolveColumns(rows, columns), total: rows.length });
  }

  async function handlePdf() {
    setOpen(false);
    const rows = await resolveData();
    if (!rows.length) return;
    const downloadName = `${filename}-${localDateStr()}.pdf`;
    try {
      const { downloadPdf } = await import('../../lib/export-pdf');
      await downloadPdf(downloadName, rows, columns, buttonLabel);
      pushAlert(`${downloadName} indirildi`, 'success');
    } catch (err) {
      console.error(err);
      pushAlert(t('export_failed') || 'Export failed', 'error');
    }
  }

  async function handleCopy() {
    setOpen(false);
    const rows = await resolveData();
    if (!rows.length) return;
    const text = toClipboardTsv(rows, columns);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      pushAlert(lang === 'tr' ? 'Panoya kopyalandı' : 'Copied to clipboard', 'success', 2500);
    });
  }

  const ITEMS = [
    { icon: SlidersHorizontal, label: t('export_menu_options'),                                        action: handleOptions },
    { icon: FileSpreadsheet, label: t('export_menu_excel'),                                           action: () => handleDownload('excel') },
    { icon: FileText,        label: t('export_menu_csv'),                                            action: () => handleDownload('csv') },
    { icon: FileDown,        label: t('export_menu_pdf'),                                             action: handlePdf },
    { icon: Image,           label: pngLoading ? t('export_menu_generating') : t('export_menu_png'), action: handlePng },
    { icon: Printer,         label: t('export_menu_print'),                                           action: handlePrint },
    { icon: Copy,            label: copied ? t('export_menu_copied') : t('export_menu_copy'),         action: handleCopy },
  ];

  return (
    <div ref={ref} className={`export-menu-root${mobileExpanded ? ' export-menu-mobile-expanded' : ''} ${className}`} style={{ position: 'relative' }}>
      <button
        onClick={() => !loading && setOpen(v => !v)}
        disabled={loading}
        className="export-menu-trigger"
        title={buttonLabel}
        aria-label={buttonLabel}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
          padding: compact ? 0 : '4px 9px',
          width: compact ? 24 : undefined,
          height: compact ? 24 : undefined,
          borderRadius: compact ? 5 : '6px',
          background: open ? 'var(--card-hover)' : 'var(--card)',
          border: '1px solid var(--border-soft)',
          color: open ? 'var(--fg)' : 'var(--fg-muted)',
          fontSize: text.xs, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: 'var(--shadow-xs)',
          transition: 'all .12s',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-hover)'; e.currentTarget.style.color = 'var(--fg)'; }}
        onMouseLeave={e => {
          e.currentTarget.style.background = open ? 'var(--card-hover)' : 'var(--card)';
          e.currentTarget.style.color = open ? 'var(--fg)' : 'var(--fg-muted)';
        }}
      >
        {loading ? (
          <span style={{ fontSize: text.xs, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="spinner-border spinner-border-sm" role="status" style={{ width: 12, height: 12, border: '2px solid currentColor', borderRightColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.75s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            {t('export_menu_generating') || 'Loading...'}
          </span>
        ) : (
          <>
            <Download size={12} />
            {!compact && (
              <>
                <span className="export-menu-trigger-label">{buttonLabel}</span>
                <ChevronDown className="export-menu-trigger-chevron" size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </>
            )}
          </>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', right: 0,
          background: 'var(--card)', border: '1px solid var(--border-soft)',
          borderRadius: 6, boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden', minWidth: 190, zIndex: 100, padding: 4,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          {ITEMS.map(({ icon: Icon, label: lbl, action }) => (
            <button
              key={lbl}
              onClick={action}
              title={lbl}
              aria-label={lbl}
              className="export-menu-item"
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px', background: 'transparent',
                borderRadius: 4,
                border: 'none', color: 'var(--fg)',
                fontSize: text.sm, cursor: 'pointer', textAlign: 'left',
                transition: 'background .1s',
                fontWeight: 500,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Icon size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
              <span className="export-menu-item-label">{lbl}</span>
            </button>
          ))}
        </div>
      )}

      {dialog && (
        <ExportDialog
          filename={filename}
          columns={dialog.cols}
          total={dialog.total}
          fetchRows={dialog.fetchRows}
          onClose={() => setDialog(null)}
          backgroundExport={backgroundExport}
        />
      )}
      <style>{`
        @media (max-width: 640px) {
          .export-menu-trigger {
            width: 32px !important;
            height: 32px !important;
            padding: 0 !important;
            justify-content: center !important;
            gap: 0 !important;
          }
          .export-menu-trigger-label,
          .export-menu-trigger-chevron {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
