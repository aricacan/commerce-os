'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ScanBarcode, Keyboard } from 'lucide-react';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { useLabelOcr, extractSkuCandidates } from '../../hooks/useLabelOcr';
import { skuDetailApi } from '../../lib/api/sku-detail';

interface Props {
  open: boolean;
  onClose: () => void;
  onScan: (sku: string) => void;
}

export function BarcodeScannerModal({ open, onClose, onScan }: Props) {
  const [manualSku, setManualSku] = useState('');
  const [mode, setMode]           = useState<'camera' | 'manual'>('camera');
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'reading'>('idle');
  const inputRef                  = useRef<HTMLInputElement>(null);
  // Zxing (barkod) ve OCR (etiket yazısı) AYNI ANDA çalışır — hangisi önce
  // gerçek bir eşleşme bulursa o kazanır. Bu kilit ikisinin aynı anda
  // onScan/onClose tetiklemesini (çifte kapanma) önler.
  const resolvedRef = useRef(false);

  const resolveAndFinish = useCallback((sku: string) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onScan(sku.trim());
    onClose();
  }, [onScan, onClose]);

  const { videoRef, isScanning, hasPermission, startScan, stopScan, isHttps } =
    useBarcodeScanner({
      onScan: (text) => resolveAndFinish(text),
    });

  // Etiket yazısından SKU'ya benzeyen adaylar çıkar, her birini GERÇEK
  // ürün uç noktasına deneyerek doğrula (istemci taraflı format tahmini
  // yerine backend'e bırakılır — bkz. useLabelOcr.extractSkuCandidates
  // yorumu). İlk eşleşen aday kazanır.
  const tryingCandidatesRef = useRef(false);
  const handleOcrText = useCallback((rawText: string) => {
    if (resolvedRef.current || tryingCandidatesRef.current) return;
    const candidates = extractSkuCandidates(rawText);
    if (candidates.length === 0) return;

    tryingCandidatesRef.current = true;
    (async () => {
      for (const candidate of candidates) {
        if (resolvedRef.current) break;
        try {
          const detail = await skuDetailApi.get(candidate);
          if (detail && !resolvedRef.current) {
            resolveAndFinish(candidate);
            break;
          }
        } catch {
          // Bu aday gerçek bir SKU değilmiş (404/hata) — sıradakini dene.
        }
      }
      tryingCandidatesRef.current = false;
    })();
  }, [resolveAndFinish]);

  const { start: startOcr, stop: stopOcr } = useLabelOcr(videoRef, {
    onTextRecognized: handleOcrText,
    onStatusChange: setOcrStatus,
  });

  useEffect(() => {
    if (!open) {
      stopScan();
      stopOcr();
      resolvedRef.current = false;
      setManualSku('');
      setMode('camera');
      return;
    }
    if (isHttps && mode === 'camera') {
      startScan();
      void startOcr();
    } else {
      setMode('manual');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // mod değişince kamerayı/OCR'ı başlat-durdur
  useEffect(() => {
    if (!open) return;
    if (mode === 'camera' && isHttps) {
      startScan();
      void startOcr();
    } else {
      stopScan();
      stopOcr();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!open) return null;

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = manualSku.trim();
    if (!v) return;
    onScan(v);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-2xl bg-[var(--card)] p-4 shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--fg)]">Barkod / SKU Tara</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[var(--border)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Kamera görünümü — yükseklik viewport'a göre esnek (vh), telefon
            döndürüldüğünde sabit bir en-boy oranına ZORLANMAZ; asıl kayma
            fixi useBarcodeScanner'da (akış cihaz yönüne göre istenir). */}
        {mode === 'camera' && isHttps && (
          <div
            className="relative overflow-hidden rounded-xl bg-black"
            style={{ height: 'min(65vh, 480px)', width: '100%' }}
          >
            {/* iOS: playsInline + muted + autoPlay zorunlu */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover"
            />
            {/* Tarama çerçevesi — YALNIZCA görsel kılavuz. Hem barkod hem
                etiket yazısı TÜM kareden okunur, buraya hizalamak şart
                değil. */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-72 rounded-lg border-2 border-white/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {hasPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-white">
                Kamera izni reddedildi. Lütfen tarayıcı ayarlarından izin verin veya SKU&apos;yu manuel girin.
              </div>
            )}
            {isScanning && hasPermission !== false && (
              <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/80">
                {ocrStatus === 'reading' ? 'Etiket okunuyor…' : 'Barkodu veya etiketi kameraya gösterin'}
              </p>
            )}
          </div>
        )}

        {/* HTTPS yok uyarısı */}
        {mode === 'camera' && !isHttps && (
          <div className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
            Kamera için HTTPS gereklidir. SKU&apos;yu manuel girin.
          </div>
        )}

        {/* Manuel giriş */}
        {mode === 'manual' && (
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              value={manualSku}
              onChange={e => setManualSku(e.target.value)}
              placeholder="SKU veya barkod girin…"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--input)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={!manualSku.trim()}
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
            >
              Ara
            </button>
          </form>
        )}

        {/* Mod geçişi */}
        <div className="mt-3 flex justify-center gap-3">
          {mode === 'camera' && (
            <button
              onClick={() => setMode('manual')}
              className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] underline-offset-2 hover:underline"
            >
              <Keyboard size={13} /> Manuel giriş
            </button>
          )}
          {mode === 'manual' && isHttps && (
            <button
              onClick={() => setMode('camera')}
              className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] underline-offset-2 hover:underline"
            >
              <ScanBarcode size={13} /> Kamera ile tara
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
