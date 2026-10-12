'use client';

import { useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Marker, GeoJSON, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { useI18n } from '../../lib/i18n';
import type { OrderCityPoint, PlatformMarker, WarehousePoint } from '../../types/api';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

// Fix Leaflet's default icon paths broken by webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

// Marka aksanıyla aynı ton (bkz. globals.css --accent). Leaflet'in SVG renderer'ı presentation
// attribute olarak set ettiği için CSS var() burada güvenilir çözülmüyor — literal hex kullanılır.
const ACCENT_LIGHT = '#BF4A42';
const ACCENT_DARK  = '#E08E85';

function fmt(n: number) {
  if (n >= 1_000_000) return '₺' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return '₺' + (n / 1_000).toFixed(1) + 'K';
  return '₺' + n.toLocaleString('tr-TR');
}

// Backend'deki LogisticsController.NormalizeCity ile birebir aynı kural — il sınır
// GeoJSON'undaki isimle (ör. "Afyon") sipariş ShipCity metnini (ör. "Afyonkarahisar")
// eşleştirebilmek için aynı normalizasyon istemci tarafında da uygulanır.
function normalizeCity(c: string): string {
  return c
    .trim()
    .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase();
}

function findOrderForProvince(provinceName: string, orders: OrderCityPoint[]): OrderCityPoint | undefined {
  const normProvince = normalizeCity(provinceName);
  const exact = orders.find((o) => normalizeCity(o.city) === normProvince);
  if (exact) return exact;
  // "Afyon" (il sınırı) ⊂ "Afyonkarahisar" (sipariş adresi) gibi kısa/uzun ad farkları için
  // en uzun (en spesifik) eşleşen adı seçer — backend'deki GetCityCoords fallback'iyle tutarlı.
  let best: OrderCityPoint | undefined;
  let bestLen = -1;
  for (const o of orders) {
    const normCity = normalizeCity(o.city);
    if (!normCity.includes(normProvince) && !normProvince.includes(normCity)) continue;
    if (normCity.length > bestLen) { best = o; bestLen = normCity.length; }
  }
  return best;
}

// UK için il sınırı yok, backend'in bildiği ~54 şehir (bkz. LogisticsController.UkCityCoords)
// İngiltere/İskoçya/Galler'in 11 EER (European Electoral Region) bölgesinden birine düşer —
// tek bir bölgeye çok sayıda şehir denk geldiğinden (ör. North West'te 10 şehir) eşleştirme
// TR'deki gibi "en iyi tek eşleşme" değil, bölgeye düşen TÜM şehirlerin toplamı olur.
// Kuzey İrlanda (Belfast) EER sisteminde yer almadığından kasıtlı olarak haritada boş kalır.
const UK_CITY_REGION: Record<string, string> = {
  newcastle: 'North East', durham: 'North East', sunderland: 'North East', middlesbrough: 'North East',
  manchester: 'North West', liverpool: 'North West', bolton: 'North West', wigan: 'North West',
  warrington: 'North West', rochdale: 'North West', salford: 'North West', chester: 'North West',
  preston: 'North West', blackpool: 'North West',
  leeds: 'Yorkshire and The Humber', sheffield: 'Yorkshire and The Humber', bradford: 'Yorkshire and The Humber',
  york: 'Yorkshire and The Humber', hull: 'Yorkshire and The Humber', doncaster: 'Yorkshire and The Humber',
  barnsley: 'Yorkshire and The Humber', wakefield: 'Yorkshire and The Humber',
  nottingham: 'East Midlands', leicester: 'East Midlands', derby: 'East Midlands', northampton: 'East Midlands',
  birmingham: 'West Midlands', coventry: 'West Midlands', wolverhampton: 'West Midlands',
  walsall: 'West Midlands', 'stoke-on-trent': 'West Midlands',
  norwich: 'Eastern', peterborough: 'Eastern', luton: 'Eastern', cambridge: 'Eastern', ipswich: 'Eastern',
  london: 'London',
  southampton: 'South East', portsmouth: 'South East', reading: 'South East', oxford: 'South East',
  hastings: 'South East', 'milton keynes': 'South East',
  bristol: 'South West', plymouth: 'South West', bournemouth: 'South West',
  glasgow: 'Scotland', edinburgh: 'Scotland', inverness: 'Scotland',
  cardiff: 'Wales', wrexham: 'Wales', newport: 'Wales', swansea: 'Wales',
};

interface RegionTotal { count: number; revenue: number }

function findOrdersForUkRegion(regionName: string, orders: OrderCityPoint[]): RegionTotal | undefined {
  let total: RegionTotal | undefined;
  for (const o of orders) {
    const region = UK_CITY_REGION[normalizeCity(o.city)];
    if (region !== regionName) continue;
    total = { count: (total?.count ?? 0) + o.count, revenue: (total?.revenue ?? 0) + o.revenue };
  }
  return total;
}

function densityRatio(count: number, maxCount: number): number {
  return maxCount > 1 ? Math.log(count + 1) / Math.log(maxCount + 1) : 1;
}

// Tek aksan tonu, sadece opaklık yoğunlukla değişir — sipariş gelmemiş iller/bölgeler de
// sınırı görünsün diye çok düşük bir taban opaklıkla çizilir. Aralık geniş tutulur (0.08–0.92)
// ki düşük/yüksek yoğunluk arasındaki fark net ("keskin") görünsün, soluk bir gradyan değil.
function densityOpacity(count: number, maxCount: number): number {
  return 0.08 + densityRatio(count, maxCount) * 0.84;
}
const NO_ORDER_OPACITY = 0.03;

function makePlatformIcon(dark: boolean, count: number, opacity: number) {
  const accent = dark ? ACCENT_DARK : ACCENT_LIGHT;
  return L.divIcon({
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    tooltipAnchor: [0, -16],
    html: `<div style="
      width:32px;height:32px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      background:${accent};opacity:${opacity};color:white;border:2px solid ${dark ? '#1a1a1a' : '#fff'};
      font:700 11px system-ui,-apple-system,Segoe UI,sans-serif;
    ">${count > 999 ? '999+' : count}</div>`,
  });
}

function makeWarehouseIcon(dark: boolean) {
  const accent = dark ? ACCENT_DARK : ACCENT_LIGHT;
  return L.divIcon({
    className: '',
    iconSize:      [26, 26],
    iconAnchor:    [13, 13],
    tooltipAnchor: [13, 0],
    html: `<svg width="26" height="26" viewBox="0 0 26 26" fill="none">
      <rect x="1" y="1" width="24" height="24" rx="6" fill="${accent}" stroke="${dark ? '#1a1a1a' : 'white'}" stroke-width="2"/>
      <path d="M7 11l6-4 6 4v7a1 1 0 01-1 1H8a1 1 0 01-1-1v-7z" stroke="white" stroke-width="1.4" fill="none" stroke-linejoin="round"/>
      <rect x="10.5" y="14" width="5" height="4.5" rx="1" stroke="white" stroke-width="1.4" fill="none"/>
    </svg>`,
  });
}

// Inner component: re-mounts TileLayer when theme changes (key forces remount)
function ThemeTiles({ dark }: { dark: boolean }) {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [dark, map]);
  return <TileLayer key={dark ? 'dark' : 'light'} url={dark ? TILE_DARK : TILE_LIGHT} attribution={ATTR} subdomains="abcd" maxZoom={19} />;
}

function ResizeFix() {
  const map = useMap();
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const invalidate = () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      frame.current = window.requestAnimationFrame(() => map.invalidateSize());
    };
    invalidate();
    const ro = new ResizeObserver(invalidate);
    ro.observe(map.getContainer());
    window.addEventListener('resize', invalidate);
    window.addEventListener('orientationchange', invalidate);
    return () => {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      ro.disconnect();
      window.removeEventListener('resize', invalidate);
      window.removeEventListener('orientationchange', invalidate);
    };
  }, [map]);

  return null;
}

// Component to dynamically fit bounds of all markers on the map
function ChangeView({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [bounds, map]);
  return null;
}

interface Props {
  orders: OrderCityPoint[];
  platforms: PlatformMarker[];
  warehouses: WarehousePoint[];
  loading: boolean;
  viewMode: 'city' | 'platform' | 'warehouse';
}

export default function MapChart({ orders, platforms, warehouses, loading, viewMode }: Props) {
  const { t, lang } = useI18n();
  const { resolvedTheme, theme } = useTheme();
  // resolvedTheme is undefined during SSR hydration; fall back to theme setting
  const dark = (resolvedTheme ?? theme) === 'dark';
  const accent = dark ? ACCENT_DARK : ACCENT_LIGHT;

  const whIcon = useMemo(() => makeWarehouseIcon(dark), [dark]);

  const { data: provinces } = useQuery({
    queryKey: ['tr-provinces-geojson'],
    queryFn: async () => {
      const res = await fetch('/tr-provinces.geo.json');
      return (await res.json()) as FeatureCollection<Geometry, { name: string }>;
    },
    staleTime: Infinity,
    enabled: viewMode === 'city',
  });

  const { data: ukRegions } = useQuery({
    queryKey: ['uk-regions-geojson'],
    queryFn: async () => {
      const res = await fetch('/uk-regions.geo.json');
      return (await res.json()) as FeatureCollection<Geometry, { name: string }>;
    },
    staleTime: Infinity,
    enabled: viewMode === 'city',
  });

  const activeData  = viewMode === 'city' ? orders : viewMode === 'platform' ? platforms : [];
  const maxCount    = activeData.length > 0 ? Math.max(...activeData.map(d => d.count)) : 1;

  const points: [number, number][] = [];
  if (viewMode === 'platform') {
    platforms.forEach((p) => {
      if (p.lat !== 0 || p.lng !== 0) points.push([p.lat, p.lng]);
    });
  } else if (viewMode === 'warehouse') {
    warehouses.forEach((w) => {
      if (w.lat && w.lng) points.push([w.lat, w.lng]);
    });
  }

  const bounds = points.length > 0 ? L.latLngBounds(points) : null;

  function provinceStyle(feature?: Feature<Geometry, { name: string }>) {
    const name = feature?.properties.name ?? '';
    const match = findOrderForProvince(name, orders);
    return {
      fillColor: accent,
      fillOpacity: match ? densityOpacity(match.count, maxCount) : NO_ORDER_OPACITY,
      color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.22)',
      weight: 1,
    };
  }

  function onEachProvince(feature: Feature<Geometry, { name: string }>, layer: L.Layer) {
    const name = feature.properties.name;
    const match = findOrderForProvince(name, orders);
    const html = match
      ? `<div style="line-height:1.6"><p style="font-weight:700;color:${accent};margin-bottom:3px">${name}</p><p>${match.count} ${t('logistics_tooltip_orders')}</p><p style="opacity:.7;font-size:11px">${fmt(match.revenue)}</p></div>`
      : `<div style="line-height:1.6"><p style="font-weight:700;color:${accent};margin-bottom:3px">${name}</p><p style="opacity:.6">${t('logistics_no_city_data')}</p></div>`;
    layer.bindTooltip(html, { sticky: true, direction: 'top' });
  }

  function ukRegionStyle(feature?: Feature<Geometry, { name: string }>) {
    const name = feature?.properties.name ?? '';
    const total = findOrdersForUkRegion(name, orders);
    return {
      fillColor: accent,
      fillOpacity: total ? densityOpacity(total.count, maxCount) : NO_ORDER_OPACITY,
      color: dark ? 'rgba(255,255,255,0.28)' : 'rgba(15,23,42,0.22)',
      weight: 1,
    };
  }

  function onEachUkRegion(feature: Feature<Geometry, { name: string }>, layer: L.Layer) {
    const name = feature.properties.name;
    const total = findOrdersForUkRegion(name, orders);
    const html = total
      ? `<div style="line-height:1.6"><p style="font-weight:700;color:${accent};margin-bottom:3px">${name}</p><p>${total.count} ${t('logistics_tooltip_orders')}</p><p style="opacity:.7;font-size:11px">${fmt(total.revenue)}</p></div>`
      : `<div style="line-height:1.6"><p style="font-weight:700;color:${accent};margin-bottom:3px">${name}</p><p style="opacity:.6">${t('logistics_no_city_data')}</p></div>`;
    layer.bindTooltip(html, { sticky: true, direction: 'top' });
  }

  return (
    <>
      <style>{`
        .leaflet-container{background:${dark ? '#0f172a' : '#dbe9f4'} !important}
        .leaflet-tile-pane{filter:${dark ? 'brightness(0.82) contrast(1.05)' : 'none'}}
        .leaflet-control-attribution{display:none}
        .leaflet-control-zoom a{
          background:${dark ? '#1e293b' : '#fff'} !important;
          color:${dark ? '#e2e8f0' : '#374151'} !important;
          border-color:${dark ? '#334155' : '#d1d5db'} !important;
          font-size:16px !important;
        }
        .leaflet-control-zoom a:hover{background:${dark ? '#334155' : '#f3f4f6'} !important}
        .leaflet-tooltip{
          background:${dark ? '#1e293b' : '#fff'} !important;
          border:1px solid ${dark ? '#334155' : '#e2e8f0'} !important;
          color:${dark ? '#e2e8f0' : '#09090b'} !important;
          border-radius:8px !important;
          padding:8px 12px !important;
          font-family:inherit !important;
          font-size:12px !important;
          box-shadow:0 4px 16px rgba(0,0,0,.2) !important;
          pointer-events:none !important;
        }
        .leaflet-tooltip::before,.leaflet-tooltip-top::before{display:none !important}
      `}</style>

      <MapContainer
        center={[39.0, 35.5]}
        zoom={6}
        minZoom={2}
        maxZoom={16}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      >
        <ThemeTiles dark={dark} />
        <ResizeFix />
        <ChangeView bounds={bounds} />

        {/* İl sınırları: gerçek şehir sınırı çizilir, sipariş yoğunluğuna göre tek aksan
            tonunda opaklık artar — nokta/kutu yok, sipariş olmayan iller de sınırıyla görünür. */}
        {!loading && viewMode === 'city' && provinces && (
          <GeoJSON
            key={`tr-${dark}-${lang}-${orders.map((o) => `${o.city}:${o.count}`).join(',')}`}
            data={provinces}
            style={provinceStyle}
            onEachFeature={onEachProvince}
          />
        )}

        {/* UK bölgeleri: Base/UK siparişleri için aynı mantık, 11 EER bölgesi üzerinden. */}
        {!loading && viewMode === 'city' && ukRegions && (
          <GeoJSON
            key={`uk-${dark}-${lang}-${orders.map((o) => `${o.city}:${o.count}`).join(',')}`}
            data={ukRegions}
            style={ukRegionStyle}
            onEachFeature={onEachUkRegion}
          />
        )}

        {/* Platform rozetleri: tek aksan tonu, yoğunlukla opaklık değişir. */}
        {!loading && viewMode === 'platform' && platforms.map((d) => (
          <Marker
            key={d.platform}
            position={[d.lat, d.lng]}
            icon={makePlatformIcon(dark, d.count, 0.35 + densityRatio(d.count, maxCount) * 0.65)}
          >
            <Tooltip sticky direction="top" offset={[0, -8]}>
              <div style={{ lineHeight: 1.6 }}>
                <p style={{ fontWeight: 700, color: accent, marginBottom: 3 }}>{d.platform}</p>
                <p>{d.count} {t('logistics_tooltip_orders')}</p>
                <p style={{ opacity: 0.7, fontSize: 11 }}>{fmt(d.revenue)}</p>
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* Warehouse pins — only render those with real coordinates */}
        {!loading && warehouses.filter(w => w.lat !== 0 || w.lng !== 0).map((w) => (
          <Marker
            key={`wh-${w.id}`}
            position={[w.lat, w.lng]}
            icon={whIcon}
          >
            <Tooltip>
              <div style={{ lineHeight: 1.6 }}>
                <p style={{ fontWeight: 700, color: accent, marginBottom: 3 }}>{w.name}</p>
                <p>{w.city}</p>
                <p style={{ opacity: 0.65, fontSize: 11 }}>{t('logistics_view_warehouse')}</p>
              </div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </>
  );
}
