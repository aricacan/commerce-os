'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ImageUp, Loader2, Eraser } from 'lucide-react';
import { photoStudioApi } from '../../lib/api';

export function RemoveBgTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'ai' | 'white'>('ai');
  const [threshold, setThreshold] = useState(240);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [sourceUrl, resultUrl]);

  const pickFile = useCallback((f: File) => {
    setFile(f);
    setError(null);
    setResultUrl(null);
    setSourceUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return URL.createObjectURL(f);
    });
  }, []);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await photoStudioApi.removeBg(file, mode, threshold);
      setResultUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(blob);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'İşlem başarısız');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col gap-4 text-xs max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <Eraser size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Tekil Arka Plan Temizleme</h2>
        </div>
        <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
          Görsel yükleyin, AI ile arka planını kaldırıp şeffaf PNG olarak indirin.
        </p>
      </div>

      {/* Upload and Options Card */}
      <div className="p-4 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-3 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer flex items-center gap-1.5"
          >
            <ImageUp size={13} />
            <span>{file ? 'Görseli Değiştir' : 'Görsel Seç'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) pickFile(f);
              e.target.value = '';
            }}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--fg-muted)] font-semibold">Mod:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'ai' | 'white')}
              className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
            >
              <option value="ai">AI Segmentasyon</option>
              <option value="white">Beyaz Zemin Temizleme</option>
            </select>
          </div>

          {mode === 'white' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--fg-muted)] font-semibold">Eşik:</span>
              <input
                type="number"
                min={0}
                max={255}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="h-8 w-20 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={!file || busy}
          onClick={run}
          className="h-8 px-4 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Eraser size={13} />}
          <span>{busy ? 'Temizleniyor…' : 'Arka Planı Kaldır'}</span>
        </button>
      </div>

      {error && <div className="p-3 rounded-[4px] bg-rose-500/10 text-rose-500 text-xs">{error}</div>}

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Image */}
        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col gap-2.5">
          <span className="font-bold text-xs text-[var(--fg)]">Orijinal Görsel</span>
          <div className="h-72 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg)] flex items-center justify-center overflow-hidden p-2">
            {sourceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sourceUrl} alt="Orijinal" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-[var(--fg-muted)]">Görsel seçilmedi</span>
            )}
          </div>
        </div>

        {/* Result Image */}
        <div className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-xs text-[var(--fg)]">Temizlenmiş Görsel</span>
            {resultUrl && (
              <a
                href={resultUrl}
                download={file ? `${file.name.replace(/\.[^.]+$/, '')}-nobg.png` : 'nobg.png'}
                className="h-6.5 px-2.5 rounded-[3px] bg-[var(--fg)] text-[11px] font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition inline-flex items-center gap-1"
              >
                <Download size={11} /> İndir
              </a>
            )}
          </div>

          <div
            className="h-72 rounded-[4px] border border-[var(--border-soft)] flex items-center justify-center overflow-hidden p-2"
            style={{
              background: 'repeating-conic-gradient(var(--bg-subtle) 0% 25%, var(--card) 0% 50%) 50% / 16px 16px',
            }}
          >
            {resultUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={resultUrl} alt="Sonuç" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-xs text-[var(--fg-muted)]">
                {busy ? 'İşleniyor...' : 'Arka planı kaldırıldığında burada görünecek'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
