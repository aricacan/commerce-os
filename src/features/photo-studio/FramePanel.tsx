'use client';

// Çerçeve paneli: bizim çerçeve görselini yükle + üzerinde ürünün oturacağı
// "güvenli alan"ı sürükleyerek ayarla. Güvenli alan çerçeveye göre 0-1 normalize
// tutulur — çıktı boyutu değişse de aynı oranda uygulanır.

import { useCallback, useEffect, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { palette, btnGhost, icon, label as labelStyle } from '../shared/design';
import type { StudioSafeArea } from '../../lib/api';

interface FramePanelProps {
  frameUrl: string | null;
  onFrameSelect: (file: File | null) => void;
  safeArea: StudioSafeArea;
  onSafeAreaChange: (area: StudioSafeArea) => void;
  outputWidth: number;
  outputHeight: number;
}

const HANDLE_SIZE = 10;
const MIN_AREA = 0.1;

type DragMode = 'move' | 'resize' | null;

export function FramePanel({
  frameUrl, onFrameSelect, safeArea, onSafeAreaChange, outputWidth, outputHeight,
}: FramePanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; start: StudioSafeArea } | null>(null);

  // Önizleme tuvali hedef çıktı oranında çizilir (çerçeve de ona ölçeklenir).
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const cw = container.clientWidth;
    const ch = (cw * outputHeight) / outputWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = `${cw}px`;
    canvas.style.height = `${ch}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Satranç zemin: çerçeve PNG'sinin şeffaf bölgeleri görünür olsun.
    const tile = 10;
    for (let ty = 0; ty < ch; ty += tile) {
      for (let tx = 0; tx < cw; tx += tile) {
        ctx.fillStyle = ((tx / tile + ty / tile) % 2 === 0) ? '#ffffff' : '#f1f1ef';
        ctx.fillRect(tx, ty, tile, tile);
      }
    }
    if (imageRef.current) ctx.drawImage(imageRef.current, 0, 0, cw, ch);

    const x = safeArea.x * cw;
    const y = safeArea.y * ch;
    const w = safeArea.w * cw;
    const h = safeArea.h * ch;

    // Güvenli alan dışı hafif karartılır — ürünün nereye oturacağı tek bakışta belli olsun.
    ctx.fillStyle = 'rgba(12, 18, 32, 0.28)';
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.rect(x, y, w, h);
    ctx.fill('evenodd');

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.75;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);

    // Köşe tutamacı — sürüklenebilir olduğu belli olsun diye beyaz halkalı.
    ctx.beginPath();
    ctx.arc(x + w, y + h, HANDLE_SIZE / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [safeArea, outputWidth, outputHeight]);

  useEffect(() => { draw(); }, [draw]);

  // Görsel yüklemesi asenkron olduğundan render tetiklemez — onload'da doğrudan
  // yeniden çizilir (setState-in-effect kaskadına gerek kalmadan).
  useEffect(() => {
    if (!frameUrl) { imageRef.current = null; draw(); return; }
    const img = new Image();
    img.onload = () => { imageRef.current = img; draw(); };
    img.src = frameUrl;
  }, [frameUrl, draw]);

  const toNorm = (e: React.PointerEvent): [number, number] => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [(e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height];
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const [nx, ny] = toNorm(e);
    const rect = canvasRef.current!.getBoundingClientRect();
    const cornerX = safeArea.x + safeArea.w;
    const cornerY = safeArea.y + safeArea.h;
    const nearCorner =
      Math.abs((nx - cornerX) * rect.width) < HANDLE_SIZE &&
      Math.abs((ny - cornerY) * rect.height) < HANDLE_SIZE;
    const inside =
      nx >= safeArea.x && nx <= cornerX && ny >= safeArea.y && ny <= cornerY;

    if (!nearCorner && !inside) return;
    dragRef.current = { mode: nearCorner ? 'resize' : 'move', startX: nx, startY: ny, start: safeArea };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const [nx, ny] = toNorm(e);
    const dx = nx - drag.startX;
    const dy = ny - drag.startY;
    if (drag.mode === 'move') {
      onSafeAreaChange({
        ...drag.start,
        x: Math.min(Math.max(drag.start.x + dx, 0), 1 - drag.start.w),
        y: Math.min(Math.max(drag.start.y + dy, 0), 1 - drag.start.h),
      });
    } else {
      onSafeAreaChange({
        ...drag.start,
        w: Math.min(Math.max(drag.start.w + dx, MIN_AREA), 1 - drag.start.x),
        h: Math.min(Math.max(drag.start.h + dy, MIN_AREA), 1 - drag.start.y),
      });
    }
  };

  const handlePointerUp = () => { dragRef.current = null; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" style={{ ...btnGhost, height: 34, flex: 1, justifyContent: 'center' }} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus size={icon.md} strokeWidth={icon.stroke} />
          {frameUrl ? 'Çerçeveyi Değiştir' : 'Çerçeve Yükle'}
        </button>
        {frameUrl && (
          <button type="button" style={{ ...btnGhost, height: 34, padding: '0 10px' }} onClick={() => onFrameSelect(null)} title="Çerçeveyi kaldır">
            <X size={icon.md} strokeWidth={icon.stroke} />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            if (file) onFrameSelect(file);
            e.target.value = '';
          }}
        />
      </div>

      <div ref={containerRef} style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${palette.border}` }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', cursor: 'move', touchAction: 'none' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ ...labelStyle, marginBottom: 0 }}>Ürün alanı — sürükle, köşeden boyutlandır</span>
        <span style={{ fontSize: 11.5, color: palette.textFaint, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(safeArea.w * outputWidth)}×{Math.round(safeArea.h * outputHeight)}
        </span>
      </div>
    </div>
  );
}
