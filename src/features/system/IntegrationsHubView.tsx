'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronRight, Radio } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { baseChannelMappingApi, integrationConnectionsApi, storeApi } from '../../lib/api';
import type { IntegrationConnection, IntegrationHubSummary, IntegrationKind, IntegrationResource } from '../../lib/api';
import { toIntegrationSlug } from '../../lib/integration-routing';
import {
  type IntegrationStatus,
  resolveStatus, resolveLastSync, resolveBrandIcon, STATUS_LABEL,
} from './integration-status';
import { parseJsonArray, isPreviewRecord, previewValue } from './MarketplaceDataOverview';
import { StoreSourceLinkPanel } from './StoreSourceLinkPanel';

// ── Bu sayfanın tek işi ──────────────────────────────────────────────────────
// "Neyi bağlıyoruz, neler var" tek bakışta bir GRAFİKLE görünsün + gerçekten
// akan veriden küçük bir ÖNİZLEME olsun. Kaynak listesi, oran düzenleme, senkron
// geçmişi gibi HER ŞEY detay sayfasında (IntegrationConnectionDetailView) —
// burada tekrar edilmez. Önceki sürüm aynı kaynak ağacını üç kez (grafik +
// genişleyen kartlar + tablo) gösteriyordu; hepsi tek grafik + tek liste oldu.

export type IntegrationScope = 'all' | 'erp' | 'marketplace';

interface ActiveIntegrationItem {
  connectionId: number;
  name: string;
  category: 'erp' | 'marketplace';
  icon: ReturnType<typeof resolveBrandIcon>;
  status: IntegrationStatus;
  lastSync: string;
  lastError: string | null;
  isActive: boolean;
  resources: IntegrationResource[];
  // Kararlı "{pazaryeri}-{mağaza}" kodu (bkz. backend MarketplaceSourceCodeCatalog) —
  // yalnızca category === 'marketplace' için dolu. ERP↔pazaryeri eşleştirmesi (planlanan
  // sonraki adım) için bu kodun kararlılığına dayanılacağından burada görünür kılınır.
  code: string | null;
}

// ─── Dallanan Topoloji Grafiği ───────────────────────────────────────────────
// Kök (mağaza) → Seviye 2 (ERP/pazaryeri bağlantısı) → Seviye 3 (ERP altında
// keşfedilen pazaryeri hesabı). Bir düğüme tıklamak aşağıdaki önizlemeyi o
// kaynağa çevirir — sayfa değiştirmez, ayrı bir kart açmaz.
const TREE_UNIT_WIDTH = 148;
const TREE_NODE_W = 108;
const TREE_ROOT_Y = 26;
const TREE_LEVEL2_Y = 112;
const TREE_LEVEL3_Y = 196;

interface TreeLeafNode {
  key: string;
  resource: IntegrationResource;
  connectionId: number;
  label: string;
  icon: ReturnType<typeof resolveBrandIcon>;
  x: number;
}

interface TreeConnectionNode {
  item: ActiveIntegrationItem;
  x: number;
  leaves: TreeLeafNode[];
}

interface TreeLayout {
  width: number;
  height: number;
  rootX: number;
  rootLabel: string;
  connections: TreeConnectionNode[];
}

function buildTreeLayout(items: ActiveIntegrationItem[], rootLabel: string): TreeLayout {
  let offsetUnits = 0;
  const connections: TreeConnectionNode[] = items.map((item) => {
    const leafResources = item.category === 'erp' ? item.resources.filter((r) => r.type === 1) : [];
    const slotCount = Math.max(1, leafResources.length);
    const startUnits = offsetUnits;
    offsetUnits += slotCount;
    const connectionX = (startUnits + slotCount / 2) * TREE_UNIT_WIDTH;

    const leaves: TreeLeafNode[] = leafResources.map((resource, index) => ({
      key: `${item.connectionId}-resource-${resource.id}`,
      resource,
      connectionId: item.connectionId,
      label: resource.name,
      icon: resolveBrandIcon(resource.name),
      x: (startUnits + index + 0.5) * TREE_UNIT_WIDTH,
    }));

    return { item, x: connectionX, leaves };
  });

  const totalUnits = Math.max(1, offsetUnits);
  const width = totalUnits * TREE_UNIT_WIDTH;
  const hasLeaves = connections.some((c) => c.leaves.length > 0);
  const height = hasLeaves ? TREE_LEVEL3_Y + 34 : TREE_LEVEL2_Y + 30;

  return { width, height, rootX: width / 2, rootLabel, connections };
}

function TreeNodeBadge({
  Icon, label, statusDot, onClick, isSelected,
}: {
  Icon: ReturnType<typeof resolveBrandIcon>;
  label: string;
  statusDot?: string;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[4px] border px-2 py-1.5 text-center transition ${
        isSelected
          ? 'border-sky-500/50 bg-sky-500/[0.08]'
          : 'border-[var(--border-soft)] bg-[var(--card)] hover:border-[var(--border)] hover:bg-[var(--bg-subtle)]'
      }`}
    >
      <span className="flex items-center gap-1.5">
        {statusDot && <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${statusDot}`} />}
        <Icon size={13} className="shrink-0" />
        <span className="max-w-[76px] truncate text-[11px] font-bold text-[var(--fg)]">{label}</span>
      </span>
    </button>
  );
}

function TopologyTree({
  layout, onSelectConnection, onSelectResource, selectedKey,
}: {
  layout: TreeLayout;
  onSelectConnection: (item: ActiveIntegrationItem) => void;
  onSelectResource: (leaf: TreeLeafNode) => void;
  selectedKey: string | null;
}) {
  const hasLeaves = layout.connections.some((c) => c.leaves.length > 0);

  return (
    <div className="w-full overflow-x-auto">
      <div className="relative mx-auto" style={{ width: Math.max(layout.width, TREE_NODE_W), height: layout.height, minWidth: TREE_NODE_W }}>
        <svg width={Math.max(layout.width, TREE_NODE_W)} height={layout.height} className="absolute inset-0" aria-hidden="true">
          {layout.connections.map((conn) => (
            <path
              key={`branch-root-${conn.item.connectionId}`}
              d={`M ${layout.rootX} ${TREE_ROOT_Y + 14} C ${layout.rootX} ${(TREE_ROOT_Y + TREE_LEVEL2_Y) / 2}, ${conn.x} ${(TREE_ROOT_Y + TREE_LEVEL2_Y) / 2}, ${conn.x} ${TREE_LEVEL2_Y - 13}`}
              fill="none" stroke="var(--border)" strokeWidth={1.5}
            />
          ))}
          {hasLeaves && layout.connections.flatMap((conn) =>
            conn.leaves.map((leaf) => (
              <path
                key={`branch-leaf-${leaf.key}`}
                d={`M ${conn.x} ${TREE_LEVEL2_Y + 13} C ${conn.x} ${(TREE_LEVEL2_Y + TREE_LEVEL3_Y) / 2}, ${leaf.x} ${(TREE_LEVEL2_Y + TREE_LEVEL3_Y) / 2}, ${leaf.x} ${TREE_LEVEL3_Y - 11}`}
                fill="none" stroke="var(--border-soft)" strokeWidth={1.25}
              />
            ))
          )}
        </svg>

        <div
          className="absolute flex h-8 -translate-x-1/2 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-3.5"
          style={{ left: layout.rootX, top: TREE_ROOT_Y - 13 }}
        >
          <span className="text-xs font-extrabold tracking-tight text-[var(--fg)]">{layout.rootLabel}</span>
        </div>

        {layout.connections.map((conn) => {
          const Icon = conn.item.icon;
          const key = `connection-${conn.item.connectionId}`;
          return (
            <div key={`node-${conn.item.connectionId}`} className="absolute h-9 w-[96px] -translate-x-1/2" style={{ left: conn.x, top: TREE_LEVEL2_Y - 18 }}>
              <TreeNodeBadge
                Icon={Icon}
                label={conn.item.name}
                statusDot={STATUS_LABEL[conn.item.status].dot}
                onClick={() => onSelectConnection(conn.item)}
                isSelected={selectedKey === key}
              />
            </div>
          );
        })}

        {layout.connections.flatMap((conn) =>
          conn.leaves.map((leaf) => (
            <div key={`leaf-${leaf.key}`} className="absolute h-8 w-[88px] -translate-x-1/2" style={{ left: leaf.x, top: TREE_LEVEL3_Y - 16 }}>
              <TreeNodeBadge
                Icon={leaf.icon}
                label={leaf.label}
                onClick={() => onSelectResource(leaf)}
                isSelected={selectedKey === leaf.key}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Canlı Önizleme ──────────────────────────────────────────────────────────
// Grafikte seçilen düğümün ÖRNEK verisini gösterir — "önizleme de anasayfasında
// olacak" isteğinin karşılığı. Ayrıntı yok, yalnızca birkaç örnek kayıt; tam
// alan listesi/JSON görünümü detay sayfasındaki Canlı Veri Gezgini'nde.
function LivePreviewCard({ resource, isEn }: { resource: IntegrationResource | null; isEn: boolean }) {
  if (!resource) {
    return (
      <p className="py-6 text-center text-xs text-[var(--fg-muted)]">
        {isEn ? 'Select a node above to preview its data.' : 'Önizlemek için yukarıdan bir düğüm seçin.'}
      </p>
    );
  }

  const sample = parseJsonArray(resource.metadata.previewJson).slice(0, 3);
  const isError = resource.metadata.status === 'error';

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-rose-600">
        <AlertTriangle size={13} className="shrink-0" />
        {resource.metadata.error || (isEn ? 'Could not read this source.' : 'Bu kaynak okunamadı.')}
      </div>
    );
  }

  if (sample.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-[var(--fg-muted)]">
        {isEn ? 'No sample data yet — discover this connection first.' : 'Henüz örnek veri yok — önce bu bağlantıyı keşfedin.'}
      </p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {sample.map((record, index) => (
        <div key={index} className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] p-2.5">
          <dl className="space-y-1">
            {isPreviewRecord(record)
              ? Object.entries(record).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-2 text-[10.5px]">
                    <dt className="truncate text-[var(--fg-muted)]">{key}</dt>
                    <dd className="truncate text-right font-medium text-[var(--fg)]">{previewValue(value)}</dd>
                  </div>
                ))
              : <dd className="truncate text-[10.5px] text-[var(--fg)]">{previewValue(record)}</dd>}
          </dl>
        </div>
      ))}
    </div>
  );
}

export function IntegrationsHubView({ scope = 'all' }: { scope?: IntegrationScope }) {
  const { lang } = useI18n();
  const isEn = lang === 'en';

  const { data: connections = [], isLoading } = useQuery<IntegrationConnection[]>({
    queryKey: ['integration-connections'],
    queryFn: () => integrationConnectionsApi.list(),
    staleTime: 30_000,
  });
  const { data: baseMappingData } = useQuery({
    queryKey: ['base-mappings-hub'],
    queryFn: baseChannelMappingApi.overview,
    enabled: scope !== 'marketplace',
    staleTime: 10 * 60_000,
  });
  const summaryKind: IntegrationKind | undefined = scope === 'erp' ? 0 : scope === 'marketplace' ? 1 : undefined;
  const { data: summary } = useQuery<IntegrationHubSummary>({
    queryKey: ['integration-connections-summary', summaryKind],
    queryFn: () => integrationConnectionsApi.summary(summaryKind),
    staleTime: 30_000,
  });
  const { data: stores } = useQuery({ queryKey: ['stores'], queryFn: storeApi.list, staleTime: 5 * 60_000 });
  const rootLabel = useMemo(() => {
    const activeStores = (stores ?? []).filter((s) => s.isActive);
    if (activeStores.length === 1) return activeStores[0].name;
    if (activeStores.length > 1) return isEn ? 'All Stores' : 'Tüm Mağazalar';
    return isEn ? 'Store' : 'Mağaza';
  }, [stores, isEn]);

  const items = useMemo<ActiveIntegrationItem[]>(() => {
    return connections
      .map((connection) => {
        const channelResources: IntegrationResource[] = connection.providerKey === 'baselinker'
          ? (baseMappingData?.channels ?? []).map((channel, index) => ({
              id: -(index + 1),
              type: 1 as const,
              externalId: `${channel.orderSource}:${channel.orderSourceId}`,
              name: `${channel.accountName || channel.orderSource} kanalı`,
              isActive: true,
              metadata: { mappingState: channel.isMapped ? 'mapped' : 'unmapped' },
              ingestionPolicy: 0 as const,
              policyUpdatedAt: null,
              children: [],
              rate: null,
              linkedMarketplaceConnectionId: null,
              linkedMarketplaceConnectionName: null,
              supportsIncrementalOnly: false,
              // ERP kanal eşlemesinden türetilen görüntü satırı — kendi başına aktif
              // edilebilir bir veri grubu değil.
              isIngestable: false,
            }))
          : [];
        return {
          connectionId: connection.id,
          name: connection.displayName,
          category: (connection.kind === 0 ? 'erp' : 'marketplace') as 'erp' | 'marketplace',
          icon: resolveBrandIcon(connection.providerName),
          status: resolveStatus(connection.syncStatus, connection.status),
          lastSync: resolveLastSync(connection.syncedAt, isEn),
          lastError: connection.lastError,
          isActive: connection.isActive,
          resources: [...connection.resources, ...channelResources],
          code: connection.code,
        };
      })
      .filter((item) => scope === 'all' || item.category === scope);
  }, [baseMappingData, connections, isEn, scope]);

  const treeLayout = useMemo(() => buildTreeLayout(items, rootLabel), [items, rootLabel]);

  // Seçili önizleme düğümü. Varsayılan: örnek verisi olan İLK kaynak — sayfa açılır
  // açılmaz boş bir "seç" mesajı yerine gerçek veri görünsün.
  const [selectedPreview, setSelectedPreview] = useState<{ key: string; resource: IntegrationResource } | null>(null);
  const previewResource = useMemo(() => {
    if (selectedPreview) return selectedPreview.resource;
    for (const item of items) {
      const withPreview = flattenResources(item.resources).find((r) => Boolean(r.metadata.previewJson));
      if (withPreview) return withPreview;
    }
    return null;
  }, [items, selectedPreview]);

  const errorCount = items.filter((item) => item.status === 'error').length;

  return (
    <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <div className="flex flex-1 min-h-0 flex-col overflow-y-auto overscroll-contain p-5 gap-4">

        {/* Tek satır özet — 5 kutulu KPI şeridi yerine. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--fg-muted)]">
          <span className="font-bold text-[var(--fg)]">
            {summary ? `${summary.activeConnections}/${summary.totalConnections}` : '—'} {isEn ? 'connections' : 'bağlantı'}
          </span>
          {summary && <span>{summary.totalProductCount.toLocaleString('tr-TR')} {isEn ? 'products' : 'ürün'}</span>}
          {summary && <span>{summary.totalOrderCount.toLocaleString('tr-TR')} {isEn ? 'orders' : 'sipariş'}</span>}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 font-semibold text-rose-600">
              <AlertTriangle size={11} /> {errorCount} {isEn ? 'with errors' : 'hatalı'}
            </span>
          )}
        </div>

        {/* Aynı mağaza eşleşmeleri — hem ERP hem Pazaryeri sayfasında görünür, çünkü her
            aday zaten çift taraflı (bir ERP kanalı + bir pazaryeri bağlantısı). */}
        <StoreSourceLinkPanel isEn={isEn} />

        {/* Grafik — "neyi bağlıyoruz, neler var" tek bakışta. */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-5">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-[var(--fg-muted)]">{isEn ? 'Loading…' : 'Yükleniyor…'}</div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--fg-muted)]">
              {isEn ? 'No integration configured yet.' : 'Henüz yapılandırılmış entegrasyon yok.'}
            </p>
          ) : (
            <TopologyTree
              layout={treeLayout}
              selectedKey={selectedPreview?.key ?? null}
              onSelectConnection={(item) => {
                const withPreview = flattenResources(item.resources).find((r) => Boolean(r.metadata.previewJson));
                if (withPreview) setSelectedPreview({ key: `connection-${item.connectionId}`, resource: withPreview });
              }}
              onSelectResource={(leaf) => setSelectedPreview({ key: leaf.key, resource: leaf.resource })}
            />
          )}
        </div>

        {/* Canlı önizleme — seçili düğümün örnek verisi. */}
        {items.length > 0 && (
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
            <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold text-[var(--fg)]">
              <Radio size={12} className="text-emerald-600" />
              {isEn ? 'Live preview' : 'Canlı önizleme'}
              {previewResource && <span className="font-normal text-[var(--fg-muted)]">— {previewResource.name}</span>}
            </div>
            <LivePreviewCard resource={previewResource} isEn={isEn} />
          </div>
        )}

        {/* Bağlantı listesi — yalnızca kimlik + durum + detay. Kaynak/oran/senkron
            geçmişi gibi her şey detay sayfasında. */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] divide-y divide-[var(--border-soft)]">
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-[var(--fg-muted)]">
              {isEn ? 'No records to display' : 'Görüntülenecek kayıt yok'}
            </p>
          ) : (
            items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.connectionId}
                  href={`/${item.category}/${toIntegrationSlug(item.name)}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs transition hover:bg-[var(--bg-subtle)]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="truncate font-bold text-[var(--fg)]">{item.name}</span>
                      {item.code && (
                        <span
                          className="shrink-0 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1 py-0.5 font-mono text-[9.5px] text-[var(--fg-muted)]"
                          title={isEn ? 'Marketplace source code' : 'Pazaryeri kaynak kodu'}
                        >
                          {item.code}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10.5px] text-[var(--fg-muted)]">
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_LABEL[item.status].dot}`} />
                      {isEn ? STATUS_LABEL[item.status].en : STATUS_LABEL[item.status].tr}
                      {!item.isActive && <span className="text-amber-600">· {isEn ? 'inactive' : 'pasif'}</span>}
                    </span>
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-[var(--fg-muted)]" />
                </Link>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}

function flattenResources(resources: IntegrationResource[]): IntegrationResource[] {
  return resources.flatMap((resource) => [resource, ...flattenResources(resource.children)]);
}
