'use client';

import { useRef, useCallback, useEffect } from 'react';

// Bazı ürün etiketlerinde barkod YOK ya da SKU barkoda değil düz yazıya
// basılı — zxing (useBarcodeScanner) bu durumda hiçbir şey bulamaz. Bu hook
// aynı kamera akışından PERİYODİK kare yakalayıp OCR ile etikette yazan HER
// ŞEYİ okur; barkod aranırken PARALEL çalışır, hangisi önce sonuç bulursa
// o kazanır (bkz. BarcodeScannerModal).
//
// Kutuya hizalama beklenmez: her tur TÜM video karesini okur, kullanıcı
// telefonu etikete doğru tutar tutmaz taramaya başlar.
export interface UseLabelOcr {
  onTextRecognized: (rawText: string) => void;
  onStatusChange?: (status: 'idle' | 'reading') => void;
  /** İki OCR turu arasındaki bekleme — Tesseract bir kareyi işlerken CPU'yu
   *  meşgul eder, çok sık çalıştırmak pil/performansı boşuna tüketir. */
  intervalMs?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TesseractWorker = any;

export function useLabelOcr(videoRef: React.RefObject<HTMLVideoElement | null>, {
  onTextRecognized,
  onStatusChange,
  intervalMs = 1800,
}: UseLabelOcr) {
  const workerRef = useRef<TesseractWorker | null>(null);
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef    = useRef(false);
  const activeRef  = useRef(false);

  const runOnce = useCallback(async () => {
    if (!activeRef.current || busyRef.current) return;
    const video = videoRef.current;
    const worker = workerRef.current;
    if (!video || !worker || video.readyState < 2 || video.videoWidth === 0) return;

    busyRef.current = true;
    onStatusChange?.('reading');
    try {
      if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
      const canvas = canvasRef.current;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const { data } = await worker.recognize(canvas);
      const text = (data?.text ?? '').trim();
      if (text) onTextRecognized(text);
    } catch {
      // Tek bir OCR turunun başarısız olması normal (bulanık kare, ışık vb.) —
      // bir sonraki tur zaten deniyor, burada kullanıcıya hata gösterilmez.
    } finally {
      busyRef.current = false;
      onStatusChange?.('idle');
    }
  }, [videoRef, onTextRecognized, onStatusChange]);

  const start = useCallback(async () => {
    activeRef.current = true;
    if (!workerRef.current) {
      // Lazy import — SSR'de yüklenmez, kamera açılana kadar WASM/traineddata
      // indirilmesin.
      const { createWorker } = await import('tesseract.js');
      workerRef.current = await createWorker('eng');
    }

    const tick = () => {
      if (!activeRef.current) return;
      void runOnce().finally(() => {
        if (activeRef.current) timerRef.current = setTimeout(tick, intervalMs);
      });
    };
    timerRef.current = setTimeout(tick, intervalMs);
  }, [runOnce, intervalMs]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  // Unmount'ta worker'ı tamamen kapat — arka planda WASM instance'ı asılı kalmasın.
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      void workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  return { start, stop };
}

// ── Etiket metninden SKU ADAYI çıkarma ──────────────────────────────────────
//
// SKU biçimi ERP'ye göre değişiyor (Sentos/Base/vb.) — istemci tarafında tek
// bir regex'e güvenmek yanlış pozitif/negatif üretir. Bunun yerine metindeki
// "SKU'ya benzeyen" tüm token'lar aday olarak çıkarılır ve gerçek doğrulama
// backend'e (mevcut tekil-eşleşme uç noktasına) bırakılır — bkz.
// resolveSkuFromCandidates.
export function extractSkuCandidates(rawText: string): string[] {
  const tokens = rawText
    .split(/[\s\n]+/)
    .map((t) => t.trim().replace(/^[^\w]+|[^\w]+$/g, ''))
    .filter(Boolean);

  const seen = new Set<string>();
  const candidates: { token: string; score: number }[] = [];

  for (const token of tokens) {
    if (token.length < 4 || token.length > 24) continue;
    if (seen.has(token.toUpperCase())) continue;

    const hasDigit  = /\d/.test(token);
    const hasLetter = /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(token);
    const hasSeparator = /[-_/.]/.test(token);
    // Sadece harf olan (muhtemelen sıradan kelime) token'lar SKU adayı değil —
    // ürün adı/marka gibi metin de etikette bol miktarda var, bunları eleriz.
    if (!hasDigit) continue;

    let score = 0;
    if (hasLetter && hasDigit) score += 2;
    if (hasSeparator) score += 2;
    if (/^[A-Z0-9-_./]+$/.test(token)) score += 1; // tamamı büyük harf/rakam — tipik SKU görünümü

    seen.add(token.toUpperCase());
    candidates.push({ token, score });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((c) => c.token);
}
