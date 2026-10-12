'use client';

import { BASE, authHeader, throwIfNotOk } from './core';

// ── Photo Studio — tipler ────────────────────────────────────────────────────
// Maske noktaları 0-1 normalize (resolution-independent): aynı çizim her
// çözünürlükteki fotoğrafa oransal uygulanır.

export type MaskPolygon = [number, number][];

export interface StudioSafeArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type StudioBgMode = 'none' | 'white' | 'ai';

export interface StudioOptions {
  output_width: number;
  output_height: number;
  feather_px: number;
  bg_mode: StudioBgMode;
  white_threshold: number;
  safe_area: StudioSafeArea;
  output_format: 'png' | 'jpeg';
  jpeg_quality: number;
  mask_aspect: number | null;
}

/** Maske çizmek için gönderilen referans: küçültülmüş görüntü + GERÇEK boyut. */
export interface StudioPreviewImage {
  path: string;
  width: number;
  height: number;
  base64: string;
}

export interface StudioInspectResult {
  totalImages: number;
  folders: { name: string; count: number }[];
  previews: StudioPreviewImage[];
}

export interface StudioPreviewItem {
  path: string;
  warnings: string[];
  imageBase64: string;
}

export interface StudioPreviewResult {
  totalImages: number;
  items: StudioPreviewItem[];
  errors: { path: string; error: string }[];
}

export interface StudioPreset {
  id: number;
  name: string;
  maskJson: string;
  optionsJson: string;
  hasFrame: boolean;
  updatedAt: string;
}

/** Bu görsel sayısının üstündeki batch'ler arka plan işine devredilir (backend ile aynı eşik). */
export const ASYNC_THRESHOLD_IMAGES = 120;

/**
 * Servisten dönen base64 görseli data URL'e çevirir. Bayt imzasından mime seçilir
 * (JPEG base64 "/9j/", PNG "iVBOR" ile başlar) — yanlış mime bazı tarayıcılarda
 * data: URL'in hiç render edilmemesine yol açabilir.
 */
export function base64ImageUrl(b64: string): string {
  const mime = b64.startsWith('/9j/') ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${b64}`;
}

// ── İstek yardımcıları ───────────────────────────────────────────────────────

// Batch işleme dakikalar sürebilir; core.ts'teki 25sn'lik request() bilinçli
// olarak KULLANILMIYOR — dosya akışları için uzun zaman aşımlı manuel fetch.
const LONG_TIMEOUT_MS = 30 * 60 * 1000;

async function postForm(path: string, form: FormData): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LONG_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/photo-studio/${path}`, {
      method: 'POST',
      headers: authHeader(),
      body: form,
      credentials: 'include',
      signal: controller.signal,
    });
    await throwIfNotOk(res);
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildStudioForm(
  mask: MaskPolygon[],
  options: StudioOptions,
  frame: File | null,
): FormData {
  const form = new FormData();
  form.append('mask', JSON.stringify({ polygons: mask }));
  form.append('options', JSON.stringify(options));
  if (frame) form.append('frame', frame);
  return form;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const photoStudioApi = {
  async inspect(archive: File): Promise<StudioInspectResult> {
    const form = new FormData();
    form.append('archive', archive);
    const res = await postForm('inspect', form);
    return res.json();
  },

  /** Tek görsel işler; sonuç blob + servis uyarıları döner (canlı önizleme). */
  async processSingle(
    image: Blob,
    mask: MaskPolygon[],
    options: StudioOptions,
    frame: File | null,
  ): Promise<{ blob: Blob; warnings: string[] }> {
    const form = buildStudioForm(mask, options, frame);
    form.append('image', image, 'preview.png');
    const res = await postForm('process-single', form);
    const warnings: string[] = JSON.parse(res.headers.get('X-Warnings') ?? '[]');
    return { blob: await res.blob(), warnings };
  },

  async previewBatch(
    archive: File,
    mask: MaskPolygon[],
    options: StudioOptions,
    frame: File | null,
  ): Promise<StudioPreviewResult> {
    const form = buildStudioForm(mask, options, frame);
    form.append('archive', archive);
    const res = await postForm('preview-batch', form);
    return res.json();
  },

  /** Tüm ZIP'i işler; aynı klasör yapısıyla işlenmiş ZIP blob'u döner. */
  async processBatch(
    archive: File,
    mask: MaskPolygon[],
    options: StudioOptions,
    frame: File | null,
  ): Promise<Blob> {
    const form = buildStudioForm(mask, options, frame);
    form.append('archive', archive);
    const res = await postForm('process-batch', form);
    return res.blob();
  },

  /** Eşik üstü batch: arka plan işi kuyruklar; sonuç bildirimle gelir. */
  async processBatchAsync(
    archive: File,
    mask: MaskPolygon[],
    options: StudioOptions,
    frame: File | null,
  ): Promise<{ jobId: string }> {
    const form = buildStudioForm(mask, options, frame);
    form.append('archive', archive);
    const res = await postForm('process-batch-async', form);
    return res.json();
  },

  /** Bildirimdeki ?result={jobId} ile gelinen sonucu indirir. */
  async downloadResult(jobId: string): Promise<Blob> {
    const res = await fetch(`${BASE}/photo-studio/results/${jobId}`, {
      headers: authHeader(),
      credentials: 'include',
    });
    await throwIfNotOk(res);
    return res.blob();
  },

  /** Referans görselde çerçeve bandlarını tespit edip maske taslağı önerir. */
  async detectFrame(image: Blob): Promise<MaskPolygon[]> {
    const form = new FormData();
    form.append('image', image, 'reference.png');
    const res = await postForm('detect-frame', form);
    const data: { polygon: [number, number][] } = await res.json();
    return [data.polygon];
  },

  // ── Preset'ler ─────────────────────────────────────────────────────────────

  async getPresets(): Promise<StudioPreset[]> {
    const res = await fetch(`${BASE}/photo-studio/presets`, {
      headers: authHeader(),
      credentials: 'include',
    });
    await throwIfNotOk(res);
    return res.json();
  },

  async getPresetFrame(id: number): Promise<Blob> {
    const res = await fetch(`${BASE}/photo-studio/presets/${id}/frame`, {
      headers: authHeader(),
      credentials: 'include',
    });
    await throwIfNotOk(res);
    return res.blob();
  },

  async savePreset(
    name: string,
    mask: MaskPolygon[],
    options: StudioOptions,
    frame: File | null,
  ): Promise<StudioPreset> {
    const form = new FormData();
    form.append('name', name);
    form.append('mask', JSON.stringify({ polygons: mask }));
    form.append('options', JSON.stringify(options));
    if (frame) form.append('frame', frame);
    const res = await postForm('presets', form);
    return res.json();
  },

  async deletePreset(id: number): Promise<void> {
    const res = await fetch(`${BASE}/photo-studio/presets/${id}`, {
      method: 'DELETE',
      headers: authHeader(),
      credentials: 'include',
    });
    await throwIfNotOk(res);
  },

  /** Grafiker paneli: tek görsel → şeffaf PNG. */
  async removeBg(image: File, mode: 'ai' | 'white', whiteThreshold: number): Promise<Blob> {
    const form = new FormData();
    form.append('image', image);
    form.append('mode', mode);
    form.append('white_threshold', String(whiteThreshold));
    const res = await postForm('remove-bg', form);
    return res.blob();
  },
};
