'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, ContactShadows } from '@react-three/drei';
import { warehouseApi, type WmsLayoutLocation, type WmsLocationStock, type WmsStructure } from '../../lib/api';

// 2D editördeki piksel koordinatlarını 3D dünya birimlerine çevirme oranı.
// EditorTab.tsx'teki CELL=40 ile aynı ızgarayı paylaşır.
const WORLD_SCALE = 20;
const HEIGHT_SCALE = 40;
const WALL_HEIGHT = 2.6;
const SEPARATOR_HEIGHT = 1.1;

const STRUCTURE_COLOR: Record<WmsStructure['type'], string> = {
  Wall: '#78716c',
  Separator: '#a8a29e',
  Aisle: '#fde68a',
  Door: '#92400e',
  Column: '#57534e',
};

function toWorldRect(x: number, y: number, width: number, depth: number) {
  return {
    centerX: (x + width / 2) / WORLD_SCALE,
    centerZ: (y + depth / 2) / WORLD_SCALE,
    w: width / WORLD_SCALE,
    d: depth / WORLD_SCALE,
  };
}

interface WorldRect { x: number; y: number; width: number; depth: number; }

// Sabit [20,20,20] kamera pozisyonu büyük/küçük depolarda ya çok uzak ya çok
// yakın kalıyordu — tüm öğelerin kapladığı alana göre kamera/hedef/döşeme
// boyutunu otomatik hesapla.
function computeBounds(rects: WorldRect[]) {
  if (rects.length === 0) return { cx: 10, cz: 10, size: 20 };
  const minX = Math.min(...rects.map((r) => r.x));
  const minY = Math.min(...rects.map((r) => r.y));
  const maxX = Math.max(...rects.map((r) => r.x + r.width));
  const maxY = Math.max(...rects.map((r) => r.y + r.depth));
  return {
    cx: (minX + maxX) / 2 / WORLD_SCALE,
    cz: (minY + maxY) / 2 / WORLD_SCALE,
    size: Math.max((maxX - minX) / WORLD_SCALE, (maxY - minY) / WORLD_SCALE, 8),
  };
}

function ShelfBox({ loc, selected, onSelect }: { loc: WmsLayoutLocation; selected: boolean; onSelect: (id: number) => void }) {
  const [hovered, setHovered] = useState(false);
  const g = loc.geometry;
  if (!g) return null;
  // g.x/g.y, EditorTab'da kutunun SOL-ÜST köşesi olarak saklanır (CSS left/top).
  // three.js mesh pozisyonu ise kutunun MERKEZİDİR — bu yüzden yarım genişlik/derinlik
  // eklenerek aynı çapa noktasına (sol-üst) dönüştürülür, farklı boyutlu kutularda
  // (raf 40x40 vs duvar 80x20) hizalama kayması olmasın diye.
  const { centerX, centerZ, w, d } = toWorldRect(g.x, g.y, g.width, g.depth);
  const h = g.height / HEIGHT_SCALE;
  const color = selected ? '#f59e0b' : hovered ? '#60a5fa' : '#3b82f6';
  return (
    <group>
      <mesh
        position={[centerX, h / 2, centerZ]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onSelect(loc.locationId); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.6} metalness={0.05} />
      </mesh>
      <Text
        position={[centerX, h + 0.18, centerZ]}
        fontSize={Math.min(w, d) * 0.32}
        color="#1c1917"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.012}
        outlineColor="#ffffff"
      >
        {loc.fullCode}
      </Text>
    </group>
  );
}

function StructureMesh({ structure }: { structure: WmsStructure }) {
  const { centerX, centerZ, w, d } = toWorldRect(structure.x, structure.y, structure.width, structure.depth);
  const color = STRUCTURE_COLOR[structure.type] ?? '#a8a29e';

  if (structure.type === 'Aisle') {
    return (
      <mesh position={[centerX, 0.01, centerZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} transparent opacity={0.45} />
      </mesh>
    );
  }

  const h = structure.type === 'Wall' ? WALL_HEIGHT : SEPARATOR_HEIGHT;
  return (
    <mesh position={[centerX, h / 2, centerZ]} castShadow receiveShadow>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

function StockPanel({ locationId, fullCode, onClose }: { locationId: number; fullCode: string; onClose: () => void }) {
  const { data: stock, isError } = useQuery({ queryKey: ['wms-location-stock', locationId], queryFn: () => warehouseApi.getLocationStock(locationId) });
  return (
    <div style={{ position: 'absolute', right: 16, top: 16, bottom: 16, width: 260, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, boxShadow: 'var(--shadow-lg)', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)' }}>{fullCode}</p>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 16 }}>×</button>
      </div>
      {isError ? (
        <p style={{ fontSize: 12, color: 'var(--destructive, #ef4444)' }}>Stok bilgisi alınamadı, tekrar deneyin.</p>
      ) : !stock || stock.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>Bu rafta ürün yok.</p>
      ) : (
        stock.map((s: WmsLocationStock) => (
          <div key={s.productId} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 12.5 }}>
            <p style={{ color: 'var(--fg)' }}>Ürün #{s.productId}</p>
            <p style={{ color: 'var(--fg-muted)' }}>Miktar: {s.quantity}</p>
          </div>
        ))
      )}
    </div>
  );
}

function Scene({ locations, structures, selectedId, onSelect }: {
  locations: WmsLayoutLocation[];
  structures: WmsStructure[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const bounds = useMemo(
    () => computeBounds([...locations.filter((l) => l.geometry).map((l) => l.geometry!), ...structures]),
    [locations, structures],
  );

  const floorSize = bounds.size * 2.5;

  return (
    <>
      <color attach="background" args={['#e7e5e4']} />
      <fog attach="fog" args={['#e7e5e4', bounds.size * 2, bounds.size * 6]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffffff', '#78716c', 0.35]} />
      <directionalLight
        position={[bounds.cx + bounds.size, bounds.size * 1.5, bounds.cz + bounds.size]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-bounds.size * 1.5}
        shadow-camera-right={bounds.size * 1.5}
        shadow-camera-top={bounds.size * 1.5}
        shadow-camera-bottom={-bounds.size * 1.5}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.cx, 0, bounds.cz]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.95} />
      </mesh>
      <gridHelper args={[floorSize, Math.round(floorSize), '#a8a29e', '#c7c3c0']} position={[bounds.cx, 0.001, bounds.cz]} />
      <ContactShadows position={[bounds.cx, 0.002, bounds.cz]} opacity={0.35} scale={floorSize} blur={2} far={bounds.size} />

      {structures.map((s) => <StructureMesh key={s.id} structure={s} />)}
      {locations.map((loc) => (
        <ShelfBox key={loc.locationId} loc={loc} selected={loc.locationId === selectedId} onSelect={onSelect} />
      ))}

      <OrbitControls
        target={[bounds.cx, bounds.size * 0.15, bounds.cz]}
        enableDamping
        dampingFactor={0.08}
        minDistance={bounds.size * 0.4}
        maxDistance={bounds.size * 4}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

export function Viewer3DTab({ warehouseId }: { warehouseId: number }) {
  const { data: layout, isLoading } = useQuery({ queryKey: ['wms-layout', warehouseId], queryFn: () => warehouseApi.getLayout(warehouseId) });
  const [selected, setSelected] = useState<WmsLayoutLocation | null>(null);

  const locations = layout?.locations ?? [];
  const structures = layout?.structures ?? [];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-muted)', fontSize: 13 }}>
        Yükleniyor...
      </div>
    );
  }

  if (locations.length === 0 && structures.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-muted)', fontSize: 13 }}>
        Bu depoda henüz raf veya yapı öğesi yok. Önce "Depo Kur" sekmesinden ekle.
      </div>
    );
  }

  const bounds = computeBounds([...locations.filter((l) => l.geometry).map((l) => l.geometry!), ...structures]);

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [bounds.cx + bounds.size, bounds.size * 1.1, bounds.cz + bounds.size], fov: 45 }}
      >
        <Scene
          locations={locations}
          structures={structures}
          selectedId={selected?.locationId ?? null}
          onSelect={(id) => setSelected(locations.find((l) => l.locationId === id) ?? null)}
        />
      </Canvas>
      {selected && (
        <StockPanel locationId={selected.locationId} fullCode={selected.fullCode} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
