'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DndContext, useDraggable, type DragEndEvent } from '@dnd-kit/core';
import { RotateCw, Trash2 } from 'lucide-react';
import { warehouseApi, type WmsLayoutLocation, type WmsStructure } from '../../lib/api';
import { LocationFormDialog } from './LocationFormDialog';
import { useWmsAlert } from '../../stores/wms-alert';

const GRID_SIZE = 800;
const CELL = 40;

const STRUCTURE_PALETTE: { type: WmsStructure['type']; label: string; color: string }[] = [
  { type: 'Wall',      label: 'Duvar',     color: '#78716c' },
  { type: 'Separator', label: 'Separatör', color: '#a8a29e' },
  { type: 'Aisle',     label: 'Kanal',     color: '#fde68a' },
];

interface Rect { x: number; y: number; width: number; depth: number; }

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y;
}

// Yeni raf/yapı öğesi eklerken veya taşırken üst üste binmeyi engeller — daha önce
// çakışma kontrolü yoktu ve aynı hücreye tekrar tıklamak üst üste raflar yaratıyordu.
function findOverlap(candidate: Rect, others: Rect[]): boolean {
  return others.some((r) => rectsOverlap(candidate, r));
}

// Duvar/separatör 90° döndürülünce genişlik/derinlik yer değiştirir — çakışma
// kontrolü ve render'ın ikisi de bu GERÇEK (döndürülmüş) dikdörtgeni kullanmalı,
// yoksa döndürülmüş bir öğe eski (döndürülmemiş) boyutuyla çakışma sanılır/kaçırılır.
function effectiveRect(s: { x: number; y: number; width: number; depth: number; rotationDeg: number }): Rect {
  const rotated = s.rotationDeg % 180 !== 0;
  return { x: s.x, y: s.y, width: rotated ? s.depth : s.width, depth: rotated ? s.width : s.depth };
}

function DraggableBox({ loc }: { loc: WmsLayoutLocation }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `loc-${loc.locationId}` });
  const g = loc.geometry;
  if (!g) return null;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: g.x + (transform?.x ?? 0),
    top: g.y + (transform?.y ?? 0),
    width: g.width,
    height: g.depth,
    background: isDragging ? 'var(--accent)' : 'var(--accent-soft)',
    border: '1.5px solid var(--accent)',
    borderRadius: 6,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: isDragging ? '#fff' : 'var(--accent)',
    cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none',
    boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.18)' : '0 1px 2px rgba(0,0,0,0.06)',
    zIndex: isDragging ? 5 : 1,
    transition: isDragging ? 'none' : 'box-shadow 0.12s',
  };
  return (
    <div ref={setNodeRef} style={style} onClick={(e) => e.stopPropagation()} {...listeners} {...attributes}>
      {loc.fullCode}
    </div>
  );
}

function DraggableStructure({ structure, onDelete, onRotate }: {
  structure: WmsStructure;
  onDelete: (id: number) => void;
  onRotate: (s: WmsStructure) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `struct-${structure.id}` });
  const [hovered, setHovered] = useState(false);
  const palette = STRUCTURE_PALETTE.find((p) => p.type === structure.type);
  const rect = effectiveRect(structure);
  const style: React.CSSProperties = {
    position: 'absolute',
    left: rect.x + (transform?.x ?? 0),
    top: rect.y + (transform?.y ?? 0),
    width: rect.width,
    height: rect.depth,
    background: palette?.color ?? '#d4d4d4',
    border: '1px solid #57534e',
    borderRadius: 3,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 9.5, fontWeight: 600, color: '#292524',
    cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none',
    boxShadow: isDragging ? '0 6px 16px rgba(0,0,0,0.18)' : 'none',
    zIndex: isDragging ? 5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      {...listeners}
      {...attributes}
    >
      {palette?.label ?? structure.type}
      {hovered && !isDragging && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'absolute', top: -12, right: -8, display: 'flex', gap: 2 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onRotate(structure); }}
            title="90° döndür"
            style={{ width: 18, height: 18, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
          >
            <RotateCw size={11} style={{ color: 'var(--fg-muted)' }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(structure.id); }}
            title="Sil"
            style={{ width: 18, height: 18, borderRadius: 5, border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
          >
            <Trash2 size={11} style={{ color: '#dc2626' }} />
          </button>
        </div>
      )}
    </div>
  );
}

export function EditorTab({ warehouseId }: { warehouseId: number }) {
  const { data: layout, refetch } = useQuery({ queryKey: ['wms-layout', warehouseId], queryFn: () => warehouseApi.getLayout(warehouseId) });
  const { data: levelTypes } = useQuery({ queryKey: ['wms-level-types', warehouseId], queryFn: () => warehouseApi.listLevelTypes(warehouseId) });
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  const [placingType, setPlacingType] = useState<WmsStructure['type'] | null>(null);
  const [placingRotated, setPlacingRotated] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const wmsAlert = useWmsAlert();

  // Çakışma kontrolü için mevcut tüm rafların ve yapı öğelerinin dikdörtgenleri —
  // her öğe kendi kimliğiyle etiketlenir ki taşıma sırasında kendisiyle çakışma
  // sayılmasın.
  function occupiedRects(excludeKey?: string): (Rect & { key: string })[] {
    const locs = (layout?.locations ?? [])
      .filter((l) => l.geometry)
      .map((l) => ({ key: `loc-${l.locationId}`, ...l.geometry! }));
    const structs = (layout?.structures ?? [])
      .map((s) => ({ key: `struct-${s.id}`, ...effectiveRect(s) }));
    return [...locs, ...structs].filter((r) => r.key !== excludeKey);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const id = String(event.active.id);
    try {
      if (id.startsWith('loc-')) {
        const locationId = Number(id.slice(4));
        const loc = layout?.locations.find((l) => l.locationId === locationId);
        if (!loc?.geometry) return;
        const next = { x: loc.geometry.x + event.delta.x, y: loc.geometry.y + event.delta.y, width: loc.geometry.width, depth: loc.geometry.depth };
        if (findOverlap(next, occupiedRects(id))) {
          wmsAlert.show('Bu alanda zaten bir raf/öğe var, taşıma iptal edildi.');
          return;
        }
        await warehouseApi.upsertGeometry(locationId, { ...loc.geometry, x: next.x, y: next.y });
      } else if (id.startsWith('struct-')) {
        const structureId = Number(id.slice(7));
        const structure = layout?.structures.find((s) => s.id === structureId);
        if (!structure) return;
        const eff = effectiveRect(structure);
        const next = { x: eff.x + event.delta.x, y: eff.y + event.delta.y, width: eff.width, depth: eff.depth };
        if (findOverlap(next, occupiedRects(id))) {
          wmsAlert.show('Bu alanda zaten bir raf/öğe var, taşıma iptal edildi.');
          return;
        }
        await warehouseApi.updateStructure(structureId, {
          x: next.x, y: next.y, z: structure.z,
          width: structure.width, depth: structure.depth, height: structure.height, rotationDeg: structure.rotationDeg,
        });
      }
      refetch();
    } catch (err) {
      console.error('Konum güncellenemedi:', err);
      wmsAlert.show('Konum güncellenemedi, tekrar deneyin.');
    }
  }

  function gridPos(e: { clientX: number; clientY: number; currentTarget: HTMLDivElement }) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / CELL) * CELL;
    const y = Math.round((e.clientY - rect.top) / CELL) * CELL;
    return { x, y };
  }

  function placingSize(): { width: number; depth: number } {
    if (!placingType) return { width: 40, depth: 40 };
    return placingRotated ? { width: 20, depth: 80 } : { width: 80, depth: 20 };
  }

  async function handleGridClick(e: React.MouseEvent<HTMLDivElement>) {
    const { x, y } = gridPos(e);

    if (placingType) {
      const { width, depth } = placingSize();
      if (findOverlap({ x, y, width, depth }, occupiedRects())) {
        wmsAlert.show('Bu alanda zaten bir raf/öğe var.');
        return;
      }
      try {
        await warehouseApi.createStructure(warehouseId, {
          type: placingType, x, y, z: 0, width: 80, depth: 20, height: 30, rotationDeg: placingRotated ? 90 : 0,
        });
        setPlacingType(null);
        setPlacingRotated(false);
        refetch();
      } catch (err) {
        console.error('Yapı öğesi oluşturulamadı:', err);
        wmsAlert.show('Yapı öğesi eklenemedi, tekrar deneyin.');
      }
      return;
    }
    if (findOverlap({ x, y, width: 40, depth: 40 }, occupiedRects())) {
      wmsAlert.show('Bu alanda zaten bir raf/öğe var.');
      return;
    }
    setPendingPos({ x, y });
  }

  async function handleDeleteStructure(id: number) {
    const ok = await wmsAlert.confirm('Bu yapı öğesi silinsin mi?');
    if (!ok) return;
    try {
      await warehouseApi.deleteStructure(id);
      refetch();
    } catch (err) {
      console.error('Yapı öğesi silinemedi:', err);
      wmsAlert.show('Yapı öğesi silinemedi, tekrar deneyin.');
    }
  }

  async function handleRotateStructure(s: WmsStructure) {
    const nextRotation = (s.rotationDeg + 90) % 180;
    const rotatedRect = { x: s.x, y: s.y, width: nextRotation % 180 !== 0 ? s.depth : s.width, depth: nextRotation % 180 !== 0 ? s.width : s.depth };
    if (findOverlap(rotatedRect, occupiedRects(`struct-${s.id}`))) {
      wmsAlert.show('Döndürülünce başka bir öğeyle çakışıyor.');
      return;
    }
    try {
      await warehouseApi.updateStructure(s.id, {
        x: s.x, y: s.y, z: s.z, width: s.width, depth: s.depth, height: s.height, rotationDeg: nextRotation,
      });
      refetch();
    } catch (err) {
      console.error('Döndürülemedi:', err);
      wmsAlert.show('Döndürülemedi, tekrar deneyin.');
    }
  }

  const hoverSize = placingType ? placingSize() : { width: 40, depth: 40 };
  const hoverInvalid = hoverPos != null && findOverlap({ ...hoverPos, ...hoverSize }, occupiedRects());

  return (
    <div style={{ padding: 24, height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap', width: GRID_SIZE, maxWidth: '100%' }}>
        <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>
          {placingType
            ? `${STRUCTURE_PALETTE.find((p) => p.type === placingType)?.label} yerleştirmek için ızgaraya tıkla.`
            : 'Boş bir alana tıklayarak yeni raf ekle, mevcut kutuları sürükleyerek taşı.'}
        </p>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          {placingType && (
            <button
              onClick={() => setPlacingRotated((v) => !v)}
              title="Yerleştirmeden önce döndür"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg-muted)',
              }}
            >
              <RotateCw size={12} /> {placingRotated ? 'Dikey' : 'Yatay'}
            </button>
          )}
          {STRUCTURE_PALETTE.map((p) => (
            <button
              key={p.type}
              onClick={() => { setPlacingType(placingType === p.type ? null : p.type); setPlacingRotated(false); }}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${placingType === p.type ? p.color : 'var(--border-soft)'}`,
                background: placingType === p.type ? p.color : 'var(--card)',
                color: placingType === p.type ? '#1c1917' : 'var(--fg-muted)',
              }}
            >
              + {p.label}
            </button>
          ))}
        </div>
      </div>
      <DndContext onDragEnd={handleDragEnd}>
        <div
          onClick={handleGridClick}
          onMouseMove={(e) => setHoverPos(gridPos(e))}
          onMouseLeave={() => setHoverPos(null)}
          style={{
            position: 'relative',
            width: GRID_SIZE, height: GRID_SIZE, flexShrink: 0,
            backgroundImage: `linear-gradient(var(--border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--border-soft) 1px, transparent 1px)`,
            backgroundSize: `${CELL}px ${CELL}px`,
            border: '1px solid var(--border)',
            borderRadius: 8,
            cursor: placingType ? 'crosshair' : 'default',
          }}
        >
          {/* Fare konumunda ne yerleşeceğini önceden gösteren hayalet kutu — daha
              önce sadece tıklayıp deneyerek (hata alıp) öğrenilebiliyordu. */}
          {hoverPos && (
            <div
              style={{
                position: 'absolute', left: hoverPos.x, top: hoverPos.y,
                width: hoverSize.width, height: hoverSize.depth,
                border: `1.5px dashed ${hoverInvalid ? '#dc2626' : '#16a34a'}`,
                background: hoverInvalid ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                borderRadius: 4, pointerEvents: 'none',
              }}
            />
          )}
          {layout?.locations.map((loc) => <DraggableBox key={loc.locationId} loc={loc} />)}
          {layout?.structures.map((s) => (
            <DraggableStructure key={s.id} structure={s} onDelete={handleDeleteStructure} onRotate={handleRotateStructure} />
          ))}
        </div>
      </DndContext>
      {pendingPos && levelTypes && (
        <LocationFormDialog
          warehouseId={warehouseId}
          parentId={null}
          levelTypes={levelTypes}
          x={pendingPos.x}
          y={pendingPos.y}
          isFree={(width, depth) => !findOverlap({ x: pendingPos.x, y: pendingPos.y, width, depth }, occupiedRects())}
          onClose={() => setPendingPos(null)}
          onCreated={() => refetch()}
        />
      )}
    </div>
  );
}
