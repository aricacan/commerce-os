'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, FolderArchive, Loader2, PlayCircle } from 'lucide-react';
import {
  photoStudioApi, ASYNC_THRESHOLD_IMAGES,
  type MaskPolygon, type StudioInspectResult, type StudioSafeArea,
  type StudioPreset, type StudioPreviewResult, type StudioOptions,
} from '../../lib/api';
import { MaskCanvas } from './MaskCanvas';
import { ReferenceStrip, type ReferenceChoice } from './ReferenceStrip';
import { FramePanel } from './FramePanel';
import { PresetBar } from './PresetBar';
import { StudioControls, DEFAULT_SETTINGS, type StudioSettings } from './StudioControls';
import { PreviewGrid } from './PreviewGrid';

const DEFAULT_SAFE_AREA: StudioSafeArea = { x: 0.06, y: 0.06, w: 0.88, h: 0.88 };

export function StudioTab() {
  const zipInputRef = useRef<HTMLInputElement>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [inspect, setInspect] = useState<StudioInspectResult | null>(null);
  const [inspecting, setInspecting] = useState(false);

  const [reference, setReference] = useState<ReferenceChoice | null>(null);
  const [uploadedRef, setUploadedRef] = useState<ReferenceChoice | null>(null);
  const [polygons, setPolygons] = useState<MaskPolygon[]>([]);

  const [frameFile, setFrameFile] = useState<File | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [safeArea, setSafeArea] = useState<StudioSafeArea>(DEFAULT_SAFE_AREA);
  const [settings, setSettings] = useState<StudioSettings>(DEFAULT_SETTINGS);

  const [preview, setPreview] = useState<StudioPreviewResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'batch' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asyncInfo, setAsyncInfo] = useState<string | null>(null);
  const [maskResetKey, setMaskResetKey] = useState(0);

  useEffect(() => () => { if (frameUrl) URL.revokeObjectURL(frameUrl); }, [frameUrl]);
  useEffect(() => () => { if (uploadedRef) URL.revokeObjectURL(uploadedRef.url); }, [uploadedRef]);

  useEffect(() => {
    const jobId = new URLSearchParams(window.location.search).get('result');
    if (!jobId) return;
    window.history.replaceState(null, '', window.location.pathname);
    (async () => {
      try {
        const blob = await photoStudioApi.downloadResult(jobId);
        triggerDownload(blob, `photo-studio-${jobId.slice(0, 8)}.zip`);
      } catch {
        setError('İşlem sonucu indirilemedi — süresi dolmuş olabilir.');
      }
    })();
  }, []);

  const aspect = useMemo(() => {
    if (!reference || reference.height === 0) return 1;
    return reference.width / reference.height;
  }, [reference]);

  const buildOptions = (): StudioOptions => ({
    output_width: settings.outputWidth,
    output_height: settings.outputHeight,
    feather_px: settings.featherPx,
    bg_mode: settings.bgMode,
    white_threshold: settings.whiteThreshold,
    safe_area: safeArea,
    output_format: settings.outputFormat,
    jpeg_quality: 92,
    mask_aspect: aspect,
  });

  const handleZipSelect = async (file: File) => {
    setZipFile(file);
    setInspecting(true);
    setError(null);
    setPreview(null);
    try {
      const res = await photoStudioApi.inspect(file);
      setInspect(res);
      if (res.previews.length > 0) {
        const first = res.previews[0];
        setReference({
          label: first.path,
          url: `data:image/jpeg;base64,${first.base64}`,
          width: first.width,
          height: first.height,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ZIP dosyası okunamadı');
      setZipFile(null);
    } finally {
      setInspecting(false);
    }
  };

  const handlePickImageFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const choice: ReferenceChoice = {
        label: file.name,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      };
      setUploadedRef(choice);
      setReference(choice);
    };
    img.src = url;
  };

  const handleFrameSelect = (file: File | null) => {
    setFrameFile(file);
    setFrameUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  const autoDetect = async (): Promise<MaskPolygon[] | null> => {
    if (!reference) return null;
    setError(null);
    try {
      const blob = await fetch(reference.url).then((r) => r.blob());
      const detected = await photoStudioApi.detectFrame(blob);
      setPolygons(detected);
      return detected;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Otomatik tespit başarısız oldu');
      return null;
    }
  };

  const runPreview = async () => {
    if (!zipFile || polygons.length === 0) return;
    setBusy('preview');
    setError(null);
    try {
      const res = await photoStudioApi.previewBatch(
        zipFile, polygons, buildOptions(), frameFile,
      );
      setPreview(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Önizleme oluşturulamadı');
    } finally {
      setBusy(null);
    }
  };

  const runBatch = async () => {
    if (!zipFile || polygons.length === 0) return;
    setBusy('batch');
    setError(null);
    setAsyncInfo(null);
    try {
      const options = buildOptions();
      const total = inspect?.totalImages ?? 0;
      if (total > ASYNC_THRESHOLD_IMAGES) {
        const { jobId } = await photoStudioApi.processBatchAsync(zipFile, polygons, options, frameFile);
        setAsyncInfo(`İşlem arka planda başlatıldı (İş No: ${jobId.slice(0, 8)}). Sonuç bildirimle iletilecek.`);
      } else {
        const blob = await photoStudioApi.processBatch(zipFile, polygons, options, frameFile);
        triggerDownload(blob, 'photo-studio-processed.zip');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toplu işlem başarısız oldu');
    } finally {
      setBusy(null);
    }
  };

  const buildPresetSnapshot = () => {
    if (polygons.length === 0) return null;
    return {
      mask: JSON.stringify({ polygons }),
      options: JSON.stringify({ settings, safeArea }),
      frame: frameFile,
    };
  };

  const applyPreset = (preset: StudioPreset, frame: File | null) => {
    try {
      const maskData: { polygons: MaskPolygon[] } = JSON.parse(preset.maskJson);
      const optionsData: { settings: StudioSettings; safeArea: StudioSafeArea } = JSON.parse(preset.optionsJson);
      setPolygons(maskData.polygons);
      setSettings({ ...DEFAULT_SETTINGS, ...optionsData.settings });
      setSafeArea(optionsData.safeArea ?? DEFAULT_SAFE_AREA);
      handleFrameSelect(frame);
      setMaskResetKey((n) => n + 1);
      setError(null);
    } catch {
      setError('Preset verisi çözümlenemedi.');
    }
  };

  const ready = polygons.length > 0 && zipFile !== null;
  const statusText = !zipFile ? 'İşlemek için önce bir ZIP yükleyin'
    : polygons.length === 0 ? 'Fotoğraf üzerinde kesim maskesini çizin'
    : `${inspect?.totalImages ?? 0} görsel işlenecek`;

  return (
    <div className="w-full flex-1 flex flex-col gap-3.5 text-xs">
      {/* 1 — Kaynak: ZIP + preset */}
      <section className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              disabled={inspecting}
              className="h-8 px-3 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              {inspecting
                ? <Loader2 size={13} className="animate-spin" />
                : <FolderArchive size={13} />}
              <span>{zipFile ? 'ZIP Değiştir' : 'ZIP Yükle'}</span>
            </button>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleZipSelect(f);
                e.target.value = '';
              }}
            />

            {inspect && (
              <div className="flex items-center gap-2 text-xs text-[var(--fg-muted)]">
                <span className="font-bold text-[var(--fg)]">{inspect.folders.length}</span> SKU klasörü ·{' '}
                <span className="font-bold text-[var(--fg)]">{inspect.totalImages}</span> görsel
              </div>
            )}
          </div>

          <PresetBar buildSnapshot={buildPresetSnapshot} onLoad={applyPreset} />
        </div>
      </section>

      {/* 2 — Tuval (sol) + Çerçeve/Ayarlar (sağ) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        <section className="lg:col-span-8 p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs flex flex-col gap-3 h-[580px]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-xs text-[var(--fg)]">Kesim Maskesi</h2>
              <p className="text-[11px] text-[var(--fg-muted)] mt-0.5 truncate">
                {reference ? `${reference.label} (${reference.width}×${reference.height})` : 'Referans görsel seçilmedi'}
              </p>
            </div>

            <ReferenceStrip
              previews={inspect?.previews ?? []}
              uploaded={uploadedRef}
              activeLabel={reference?.label ?? null}
              onSelect={setReference}
              onUpload={handlePickImageFile}
            />
          </div>

          <div className="flex-1 min-h-0">
            <MaskCanvas
              key={maskResetKey}
              imageUrl={reference?.url ?? null}
              aspect={aspect}
              polygons={polygons}
              onChange={setPolygons}
              onAutoDetect={reference ? autoDetect : undefined}
              onPickImage={handlePickImageFile}
            />
          </div>
        </section>

        <div className="lg:col-span-4 flex flex-col gap-3.5">
          <section className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs space-y-2.5">
            <h2 className="font-bold text-xs text-[var(--fg)]">Bizim Çerçeve</h2>
            <FramePanel
              frameUrl={frameUrl}
              onFrameSelect={handleFrameSelect}
              safeArea={safeArea}
              onSafeAreaChange={setSafeArea}
              outputWidth={settings.outputWidth}
              outputHeight={settings.outputHeight}
            />
          </section>

          <section className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs space-y-2.5">
            <h2 className="font-bold text-xs text-[var(--fg)]">Çıktı Standartları</h2>
            <StudioControls settings={settings} onChange={setSettings} />
          </section>
        </div>
      </div>

      {/* 3 — Eylemler */}
      <section className="p-3.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs text-[var(--fg-muted)]">{statusText}</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!ready || busy !== null}
              onClick={runPreview}
              className="h-8 px-3 rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              {busy === 'preview'
                ? <Loader2 size={13} className="animate-spin" />
                : <Eye size={13} />}
              <span>Örnekleri Önizle</span>
            </button>

            <button
              type="button"
              disabled={!ready || busy !== null}
              onClick={runBatch}
              className="h-8 px-3.5 rounded-[4px] bg-[var(--fg)] text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
            >
              {busy === 'batch'
                ? <Loader2 size={13} className="animate-spin" />
                : <PlayCircle size={13} />}
              <span>{busy === 'batch' ? 'İşleniyor…' : 'Tümünü İşle ve İndir'}</span>
            </button>
          </div>
        </div>

        {error && <div className="mt-2.5 p-2.5 rounded-[3px] bg-rose-500/10 text-rose-500 text-xs">{error}</div>}
        {asyncInfo && <div className="mt-2.5 p-2.5 rounded-[3px] bg-blue-500/10 text-blue-600 text-xs font-semibold">{asyncInfo}</div>}
        {preview && <div className="mt-3"><PreviewGrid result={preview} /></div>}
      </section>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
