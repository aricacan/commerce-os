'use client';

// Maske çizim tuvali — referans fotoğraf üstüne serbest kalem veya düz çizgi ile
// kapalı bölge çizilir, köşeler sonradan sürüklenerek düzeltilebilir. Noktalar
// 0-1 normalize tutulur; aynı maske farklı çözünürlükteki tüm fotoğraflara oransal
// uygulanır.
//
// Sürükleme olayları TUVALDEN DEĞİL window'dan dinlenir: pointer capture +
// pointerleave birlikte kullanıldığında tarayıcı çizimi imleç kenara değdiği anda
// bitiriyordu ("kalemi bırakamıyorum" hatası). window dinleyicisiyle imleç tuvalin
// dışına çıksa bile çizim kullanıcı tuşu bırakana kadar sürer.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ImagePlus, Loader2, Maximize2, MousePointer2, PenLine, Redo2,
  Spline, Trash2, Undo2, Wand2, ZoomIn, ZoomOut,
} from 'lucide-react';
import { palette, icon, softTint } from '../shared/design';
import type { MaskPolygon } from '../../lib/api';

type MaskTool = 'pen' | 'polygon';

interface MaskCanvasProps {
  /** Referans görsel (data/object URL) — yoksa boş durum gösterilir. */
  imageUrl: string | null;
  /** Referansın en-boy oranı (genişlik / yükseklik). */
  aspect: number;
  polygons: MaskPolygon[];
  onChange: (polygons: MaskPolygon[]) => void;
  /** Verilirse araç çubuğunda "Otomatik Tespit" görünür. */
  onAutoDetect?: () => Promise<MaskPolygon[] | null>;
  /** Boş durumdaki "örnek fotoğraf yükle" eylemi. */
  onPickImage?: (file: File) => void;
}

// Kalemde iki nokta arası en küçük ekran mesafesi (px) — her piksele nokta
// koymak maske JSON'unu şişirir, bu aralık görsel fark yaratmadan sadeleştirir.
const PEN_MIN_DISTANCE = 4;
const CLOSE_SNAP_PX = 14;   // ilk noktaya bu kadar yaklaşınca yol kapanır
const VERTEX_HIT_PX = 9;    // köşe tutamacı yakalama yarıçapı
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const CANVAS_PADDING = 28;  // fit ederken kenarlarda bırakılan boşluk

interface View { scale: number; x: number; y: number }
type Drag =
  | { kind: 'pen' }
  | { kind: 'pan'; startX: number; startY: number; ox: number; oy: number }
  | { kind: 'vertex'; poly: number; point: number };

export function MaskCanvas({
  imageUrl, aspect, polygons, onChange, onAutoDetect, onPickImage,
}: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tool, setTool] = useState<MaskTool>('pen');
  // Görünüm = ortalanmış taban + kullanıcının kaydırması. Ortalamayı state'te
  // tutmak yerine her render'da hesaplamak, "kutu boyutu değişti → efekt içinde
  // setState" zincirini tamamen ortadan kaldırıyor.
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draft, setDraft] = useState<MaskPolygon>([]);
  const [cursor, setCursor] = useState<[number, number] | null>(null);
  const [hoverVertex, setHoverVertex] = useState<{ poly: number; point: number } | null>(null);
  const [imageReady, setImageReady] = useState(0);
  const [detecting, setDetecting] = useState(false);
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

  const dragRef = useRef<Drag | null>(null);
  const draftRef = useRef<MaskPolygon>([]);
  const polygonsRef = useRef(polygons);
  const viewRef = useRef<View>({ scale: 1, x: 0, y: 0 });

  /**
   * Taslağın TEK DOĞRU KAYNAĞI draftRef'tir; state yalnız yeniden çizim tetikler.
   * Hızlı çizimde tarayıcı onlarca pointermove'u tek görevde işler, React ise
   * güncellemeleri toplu uygular — state'e güvenilseydi "bırak" anında yol henüz
   * boş görünür ve çizilen şekil kaybolurdu.
   */
  const setDraftPath = useCallback((path: MaskPolygon) => {
    draftRef.current = path;
    setDraft(path);
  }, []);

  // Geçmiş yalnız KAPANMIŞ poligonları tutar (taslak çizim geçmişi kirletmez).
  const historyRef = useRef<MaskPolygon[][]>([[]]);
  const indexRef = useRef(0);

  const commit = useCallback((next: MaskPolygon[]) => {
    const trimmed = historyRef.current.slice(0, indexRef.current + 1);
    trimmed.push(next);
    historyRef.current = trimmed;
    indexRef.current = trimmed.length - 1;
    onChange(next);
  }, [onChange]);

  const undo = useCallback(() => {
    if (indexRef.current > 0) onChange(historyRef.current[--indexRef.current]);
  }, [onChange]);
  const redo = useCallback(() => {
    if (indexRef.current < historyRef.current.length - 1) onChange(historyRef.current[++indexRef.current]);
  }, [onChange]);

  const clearAll = useCallback(() => { setDraftPath([]); commit([]); }, [commit, setDraftPath]);

  // ── Yerleşim ölçüleri: tuval her zaman kutuya sığdırılır ───────────────────
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBoxSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // Referansın tuval içindeki çizim boyutu (en-boy korunarak sığdırılmış).
  const paper = (() => {
    const availW = Math.max(boxSize.w - CANVAS_PADDING * 2, 1);
    const availH = Math.max(boxSize.h - CANVAS_PADDING * 2, 1);
    const w = Math.min(availW, availH * aspect);
    return { w, h: w / aspect };
  })();

  const baseX = (boxSize.w - paper.w * scale) / 2;
  const baseY = (boxSize.h - paper.h * scale) / 2;
  // useMemo: çizim efektinin bağımlılığı — her render'da yeni nesne üretilirse
  // tuval gereksiz yere yeniden çizilir.
  const view = useMemo<View>(
    () => ({ scale, x: baseX + pan.x, y: baseY + pan.y }),
    [scale, baseX, baseY, pan.x, pan.y],
  );

  // Window seviyesindeki sürükleme dinleyicileri her render'da yeniden bağlanmasın
  // diye güncel değerleri ref üzerinden okur; senkronizasyon commit sonrası yapılır.
  useEffect(() => {
    viewRef.current = view;
    polygonsRef.current = polygons;
  });

  const fitView = useCallback(() => { setScale(1); setPan({ x: 0, y: 0 }); }, []);

  useEffect(() => {
    if (!imageUrl) { imageRef.current = null; return; }
    const img = new Image();
    img.onload = () => { imageRef.current = img; setImageReady((n) => n + 1); };
    img.src = imageUrl;
  }, [imageUrl]);

  // ── Koordinat dönüşümleri ─────────────────────────────────────────────────
  const toNorm = useCallback((clientX: number, clientY: number): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return [
      ((clientX - rect.left) - v.x) / (paper.w * v.scale),
      ((clientY - rect.top) - v.y) / (paper.h * v.scale),
    ];
  }, [paper.w, paper.h]);

  const toScreen = useCallback((nx: number, ny: number): [number, number] => {
    const v = viewRef.current;
    return [v.x + nx * paper.w * v.scale, v.y + ny * paper.h * v.scale];
  }, [paper.w, paper.h]);

  // ── Çizim ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || boxSize.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = boxSize.w * dpr;
    canvas.height = boxSize.h * dpr;
    canvas.style.width = `${boxSize.w}px`;
    canvas.style.height = `${boxSize.h}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, boxSize.w, boxSize.h);

    const pw = paper.w * view.scale;
    const ph = paper.h * view.scale;
    ctx.save();
    ctx.translate(view.x, view.y);

    // Kâğıt: fotoğrafın oturduğu alan. Fotoğraf yoksa boş durum ayrı katmanda.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pw, ph);
    if (imageRef.current) ctx.drawImage(imageRef.current, 0, 0, pw, ph);

    const px = (nx: number) => nx * pw;
    const py = (ny: number) => ny * ph;

    // Maske dışını karart (kırpılıp atılacak alan görünür olsun).
    if (polygons.length > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(12, 18, 32, 0.5)';
      ctx.beginPath();
      ctx.rect(0, 0, pw, ph);
      for (const poly of polygons) {
        ctx.moveTo(px(poly[0][0]), py(poly[0][1]));
        for (const [x, y] of poly.slice(1)) ctx.lineTo(px(x), py(y));
        ctx.closePath();
      }
      ctx.fill('evenodd');
      ctx.restore();
    }

    // Kapanmış poligonların kenarı + köşe tutamaçları
    ctx.lineWidth = 1.75;
    ctx.strokeStyle = '#3b82f6';
    polygons.forEach((poly, pi) => {
      ctx.beginPath();
      ctx.moveTo(px(poly[0][0]), py(poly[0][1]));
      for (const [x, y] of poly.slice(1)) ctx.lineTo(px(x), py(y));
      ctx.closePath();
      ctx.stroke();

      // Kalemle çizilen yollarda yüzlerce nokta olur; hepsini tutamaç yapmak
      // ekranı doldurur — yalnız imlecin yakınındaki nokta gösterilir.
      const near = hoverVertex?.poly === pi ? hoverVertex.point : -1;
      if (poly.length <= 24) {
        poly.forEach(([x, y], vi) => drawHandle(ctx, px(x), py(y), vi === near));
      } else if (near >= 0) {
        drawHandle(ctx, px(poly[near][0]), py(poly[near][1]), true);
      }
    });

    // Çizim halindeki taslak
    if (draft.length > 0) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(px(draft[0][0]), py(draft[0][1]));
      for (const [x, y] of draft.slice(1)) ctx.lineTo(px(x), py(y));
      if (tool === 'polygon' && cursor) ctx.lineTo(px(cursor[0]), py(cursor[1]));
      ctx.stroke();
      ctx.setLineDash([]);

      if (tool === 'polygon') {
        draft.forEach(([x, y], i) => {
          ctx.beginPath();
          ctx.arc(px(x), py(y), i === 0 ? 5.5 : 3.5, 0, Math.PI * 2);
          ctx.fillStyle = i === 0 ? '#f59e0b' : '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        });
      }
    }

    // Kâğıt kenarı en üstte — fotoğrafın nerede bittiği net olsun.
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.18)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, pw - 1, ph - 1);
    ctx.restore();
  }, [view, polygons, draft, cursor, tool, boxSize, paper.w, paper.h, imageReady, hoverVertex]);

  // ── Etkileşim ──────────────────────────────────────────────────────────────
  const finishDraft = useCallback((path: MaskPolygon) => {
    if (path.length >= 3) commit([...polygonsRef.current, path]);
    setDraftPath([]);
  }, [commit, setDraftPath]);

  const findVertex = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // getBoundingClientRect DÖNGÜ DIŞINDA: her nokta için çağırmak tarayıcıyı
    // her fare hareketinde yeniden yerleşim yapmaya zorluyor ve kalemle çizilen
    // yüzlerce noktalı maskede arayüzü kilitliyordu.
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const v = viewRef.current;
    for (let pi = polygonsRef.current.length - 1; pi >= 0; pi--) {
      const poly = polygonsRef.current[pi];
      for (let vi = 0; vi < poly.length; vi++) {
        const sx = v.x + poly[vi][0] * paper.w * v.scale;
        const sy = v.y + poly[vi][1] * paper.h * v.scale;
        if (Math.abs(sx - mx) <= VERTEX_HIT_PX && Math.abs(sy - my) <= VERTEX_HIT_PX) {
          return { poly: pi, point: vi };
        }
      }
    }
    return null;
  }, [paper.w, paper.h]);

  // Sürükleme window'da dinlenir: imleç tuvalin dışına çıksa da çizim kopmaz.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        setHoverVertex(findVertex(e.clientX, e.clientY));
        setCursor(toNorm(e.clientX, e.clientY));
        return;
      }
      if (drag.kind === 'pan') {
        setPan({ x: drag.ox + e.clientX - drag.startX, y: drag.oy + e.clientY - drag.startY });
        return;
      }
      const pt = toNorm(e.clientX, e.clientY);
      setCursor(pt);
      if (drag.kind === 'pen') {
        const path = draftRef.current;
        if (path.length === 0) { setDraftPath([pt]); return; }
        const [lx, ly] = path[path.length - 1];
        const v = viewRef.current;
        const dist = Math.hypot((pt[0] - lx) * paper.w * v.scale, (pt[1] - ly) * paper.h * v.scale);
        if (dist >= PEN_MIN_DISTANCE) setDraftPath([...path, pt]);
      } else {
        const next = polygonsRef.current.map((poly, pi) =>
          pi === drag.poly ? poly.map((p, vi) => (vi === drag.point ? pt : p)) : poly);
        onChange(next);
      }
    };

    const onUp = () => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag) return;
      if (drag.kind === 'pen') finishDraft(draftRef.current);
      // Köşe sürüklemesi bittiğinde tek bir geçmiş adımı yazılır (her piksel değil).
      if (drag.kind === 'vertex') commit(polygonsRef.current);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [toNorm, findVertex, finishDraft, commit, onChange, setDraftPath, paper.w, paper.h]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!imageUrl) return;
    // Orta/sağ tuş: kaydırma
    if (e.button === 1 || e.button === 2) {
      dragRef.current = { kind: 'pan', startX: e.clientX, startY: e.clientY, ox: pan.x, oy: pan.y };
      return;
    }
    if (e.button !== 0) return;

    const vertex = findVertex(e.clientX, e.clientY);
    if (vertex && draft.length === 0) { dragRef.current = { kind: 'vertex', ...vertex }; return; }

    const pt = toNorm(e.clientX, e.clientY);
    if (tool === 'pen') {
      dragRef.current = { kind: 'pen' };
      setDraftPath([pt]);
      return;
    }
    // Polygon: ilk noktaya yakın tıklama yolu kapatır.
    if (draft.length >= 3) {
      const [fx, fy] = toScreen(draft[0][0], draft[0][1]);
      const rect = canvasRef.current!.getBoundingClientRect();
      if (Math.hypot(fx - (e.clientX - rect.left), fy - (e.clientY - rect.top)) < CLOSE_SNAP_PX) {
        finishDraft(draft);
        return;
      }
    }
    setDraftPath([...draftRef.current, pt]);
  };

  /** İmlecin altındaki nokta sabit kalacak şekilde yakınlaştırır. */
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => {
    const v = viewRef.current;
    const next = Math.min(Math.max(v.scale * factor, MIN_ZOOM), MAX_ZOOM);
    if (next === v.scale) return;
    const ratio = next / v.scale;
    const targetX = cx - (cx - v.x) * ratio;
    const targetY = cy - (cy - v.y) * ratio;
    setScale(next);
    setPan({
      x: targetX - (boxSize.w - paper.w * next) / 2,
      y: targetY - (boxSize.h - paper.h * next) / 2,
    });
  }, [boxSize.w, boxSize.h, paper.w, paper.h]);

  const onWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
  };

  // Esc: taslağı iptal et. Ctrl+Z / Ctrl+Shift+Z: geri al / yinele.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { dragRef.current = null; setDraftPath([]); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, setDraftPath]);

  const runAutoDetect = async () => {
    if (!onAutoDetect || detecting) return;
    setDetecting(true);
    try {
      const detected = await onAutoDetect();
      if (detected?.length) { setDraftPath([]); commit(detected); }
    } finally {
      setDetecting(false);
    }
  };

  const drawing = draft.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%', minHeight: 0 }}>
      {/* Araç çubuğu: [araç seçimi] [eylemler] ......... [yakınlaştırma] */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={segmentWrap}>
          <SegmentButton active={tool === 'pen'} onClick={() => setTool('pen')} Icon={PenLine} label="Kalem" />
          <SegmentButton active={tool === 'polygon'} onClick={() => setTool('polygon')} Icon={Spline} label="Düz Çizgi" />
        </div>

        {onAutoDetect && (
          <IconButton onClick={runAutoDetect} disabled={detecting || !imageUrl} title="Çerçeveyi otomatik bul" wide>
            {detecting
              ? <Loader2 size={icon.md} strokeWidth={icon.stroke} className="animate-spin" />
              : <Wand2 size={icon.md} strokeWidth={icon.stroke} />}
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>Otomatik</span>
          </IconButton>
        )}

        <div style={divider} />
        <IconButton onClick={undo} title="Geri al (Ctrl+Z)"><Undo2 size={icon.md} strokeWidth={icon.stroke} /></IconButton>
        <IconButton onClick={redo} title="Yinele (Ctrl+Shift+Z)"><Redo2 size={icon.md} strokeWidth={icon.stroke} /></IconButton>
        <IconButton onClick={clearAll} disabled={polygons.length === 0 && !drawing} title="Maskeyi temizle">
          <Trash2 size={icon.md} strokeWidth={icon.stroke} />
        </IconButton>

        <div style={{ flex: 1 }} />

        <IconButton onClick={() => zoomAt(1 / 1.25, boxSize.w / 2, boxSize.h / 2)} title="Uzaklaştır">
          <ZoomOut size={icon.md} strokeWidth={icon.stroke} />
        </IconButton>
        <span style={{ fontSize: 12, fontWeight: 600, color: palette.textMuted, minWidth: 42, textAlign: 'center' }}>
          %{Math.round(view.scale * 100)}
        </span>
        <IconButton onClick={() => zoomAt(1.25, boxSize.w / 2, boxSize.h / 2)} title="Yakınlaştır">
          <ZoomIn size={icon.md} strokeWidth={icon.stroke} />
        </IconButton>
        <IconButton onClick={fitView} title="Ekrana sığdır"><Maximize2 size={icon.md} strokeWidth={icon.stroke} /></IconButton>
      </div>

      {/* Tuval */}
      <div
        ref={boxRef}
        style={{
          position: 'relative', flex: 1, minHeight: 380, borderRadius: 12, overflow: 'hidden',
          background: palette.inputBg, border: `1px solid ${palette.border}`, touchAction: 'none',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onWheel={onWheel}
          style={{
            display: 'block',
            cursor: !imageUrl ? 'default'
              : hoverVertex ? 'grab'
              : tool === 'pen' ? 'crosshair' : 'copy',
          }}
        />

        {!imageUrl && (
          <div
            style={emptyState}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f?.type.startsWith('image/')) onPickImage?.(f);
            }}
          >
            <ImagePlus size={28} strokeWidth={1.6} style={{ color: palette.textFaint }} />
            <p style={{ fontSize: 13.5, fontWeight: 600, color: palette.text, margin: 0 }}>
              Üzerine çizeceğin fotoğrafı seç
            </p>
            <p style={{ fontSize: 12.5, color: palette.textMuted, margin: 0, maxWidth: 320, lineHeight: 1.5 }}>
              ZIP yükle ve gelen fotoğraflardan birini seç, ya da tek bir örnek fotoğrafı buraya sürükle.
            </p>
            {onPickImage && (
              <>
                <button type="button" style={emptyStateBtn} onClick={() => fileRef.current?.click()}>
                  Örnek fotoğraf seç
                </button>
                <input
                  ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickImage(f);
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </div>
        )}

        {drawing && (
          <div style={draftBadge}>
            <MousePointer2 size={12} strokeWidth={2} />
            {tool === 'pen' ? 'Çiziliyor — bırakınca kapanır' : 'İlk noktaya tıkla ya da çift tıkla · Esc iptal'}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Yardımcı çizim ───────────────────────────────────────────────────────────

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, active: boolean) {
  ctx.beginPath();
  ctx.arc(x, y, active ? 5.5 : 3.5, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#3b82f6' : '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ── Araç çubuğu parçaları ────────────────────────────────────────────────────

const segmentWrap: React.CSSProperties = {
  display: 'inline-flex', padding: 3, gap: 2, borderRadius: 9,
  background: palette.chipBg, border: `1px solid ${palette.borderFaint}`,
};

const divider: React.CSSProperties = {
  width: 1, height: 20, background: palette.divider, margin: '0 2px',
};

const emptyState: React.CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center',
  padding: 24, background: palette.inputBg,
};

const emptyStateBtn: React.CSSProperties = {
  marginTop: 2, padding: '8px 16px', borderRadius: 9, cursor: 'pointer',
  border: `1px solid ${palette.accentBorder}`, background: softTint(palette.accent, 10),
  color: palette.accent, fontSize: 12.5, fontWeight: 700,
};

const draftBadge: React.CSSProperties = {
  position: 'absolute', left: 12, bottom: 12, display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 11px', borderRadius: 8, background: 'rgba(15, 23, 42, 0.82)',
  color: '#fff', fontSize: 11.5, fontWeight: 600, pointerEvents: 'none',
};

function SegmentButton({ active, onClick, Icon, label }: {
  active: boolean; onClick: () => void; Icon: typeof PenLine; label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
        borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12.5,
        fontWeight: active ? 700 : 600,
        background: active ? palette.card : 'transparent',
        color: active ? palette.accent : palette.textMuted,
        boxShadow: active ? '0 1px 2px rgba(15, 23, 42, 0.10)' : 'none',
      }}
    >
      <Icon size={icon.md} strokeWidth={icon.stroke} />
      {label}
    </button>
  );
}

function IconButton({ children, onClick, title, disabled, wide }: {
  children: React.ReactNode; onClick: () => void; title: string;
  disabled?: boolean; wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        height: 32, width: wide ? 'auto' : 32, padding: wide ? '0 11px' : 0,
        borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
        border: `1px solid ${palette.borderSoft}`, background: palette.card,
        color: palette.textMuted, opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}
