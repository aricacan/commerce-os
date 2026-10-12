'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { BASE, authHeader, erpisExportPaths, type ErpisQueryFilter } from '@/lib/api';
import { icon } from '../shared/design';

// Ekrandaki filtreyi Excel'e aktarır.
//
// `request()` kullanılmıyor: yanıt JSON değil ikili veri. Yine de fetch şart, çünkü
// düz bir bağlantı yetki başlığını taşıyamaz — dosya blob olarak alınıp indiriliyor.
interface Props {
  filter: ErpisQueryFilter;
  target: 'orderLines' | 'items' | 'planning';
  /** Düğme yazısı. Varsayılan "Excel"; KPI kartlarının içinde yalnız ikon kalır. */
  label?: string;
  /** Yalnız ikon — dar yerlerde (KPI kartının köşesi). */
  iconOnly?: boolean;
  title?: string;
}

export function ExportButton({ filter, target, label = 'Excel', iconOnly = false, title }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`${BASE}${erpisExportPaths[target](filter)}`, {
        headers: authHeader(),
        credentials: 'include',
      });

      if (!response.ok) {
        // Satır sınırı aşıldığında sunucu ne yapılması gerektiğini söylüyor; o mesaj
        // kullanıcıya aynen gösterilmeli.
        const problem = await response.json().catch(() => null);
        throw new Error(problem?.detail ?? problem?.title ?? 'Dışa aktarım başarısız.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileNameOf(response) ?? 'erpis.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Dışa aktarım başarısız.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={(e) => { e.stopPropagation(); void download(); }}
        title={title ?? `${label} olarak indir`}
        aria-label={title ?? `${label} olarak indir`}
        className={`flex items-center justify-center rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] font-bold text-[var(--fg)] disabled:opacity-50 hover:border-[var(--border)] ${
          iconOnly ? 'h-6 w-6' : 'h-8 gap-1.5 px-2.5 text-[12px]'
        }`}
      >
        <Download size={iconOnly ? 12 : icon.md} strokeWidth={icon.stroke} />
        {!iconOnly && (busy ? 'Hazırlanıyor…' : label)}
      </button>

      {error && (
        <span className="max-w-[420px] text-[11px] text-[var(--fg-muted)]" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// Dosya adı sunucudan geliyor (tarih damgalı); başlık okunamazsa varsayılan kullanılır.
function fileNameOf(response: Response): string | null {
  const header = response.headers.get('content-disposition');
  if (!header) return null;

  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}
