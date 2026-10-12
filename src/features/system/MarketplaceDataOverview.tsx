'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Braces, CheckCircle2, ExternalLink, FileJson, ListTree, LockKeyhole, Radio, Search } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IntegrationConnection, IntegrationResource } from '../../lib/api';
import { resolveBrandIcon } from './integration-status';

/** Backend'deki DiscoveryPageSize ile aynı olmalıdır (IntegrationHubService). */
const PREVIEW_SAMPLE_LIMIT = 25;

type ProviderGuide = {
  auth: string;
  docsUrl: string;
  readableData: string[];
};

const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  trendyol: {
    auth: 'Supplier ID + API Key + API Secret (Basic Auth ve zorunlu User-Agent)',
    docsUrl: 'https://developers.trendyol.com/',
    readableData: ['Ürün, stok ve fiyat', 'Sipariş, müşteri ve teslimat', 'Marka', 'Kategori ve özellikler'],
  },
  hepsiburada: {
    auth: 'Merchant ID + servis kullanıcı adı/şifresi (Basic Auth ve zorunlu User-Agent)',
    docsUrl: 'https://developers.hepsiburada.com/',
    readableData: ['Listing, stok ve fiyat', 'Sipariş satırları', 'Müşteri ve adres', 'Kargo ve durum'],
  },
  n11: {
    auth: 'App Key + App Secret başlıkları',
    docsUrl: 'https://magazadestek.n11.com/satis-surecleri/api-dokumantasyonu-10491',
    readableData: ['Ürün, stok ve fiyat', 'Sipariş paketleri', 'Müşteri ve adres', 'Kargo, komisyon ve durum'],
  },
  ciceksepeti: {
    auth: 'x-api-key + Satıcı ID tabanlı User-Agent',
    docsUrl: 'https://ciceksepeti.dev/',
    readableData: ['Ürün, varyant, stok ve fiyat', 'Sipariş ve kişiselleştirme', 'Alıcı/gönderici', 'Teslimat, fatura ve iadeler'],
  },
  pazarama: {
    auth: 'Client ID + Client Secret ile OAuth 2.0 client credentials (token 1 saat)',
    docsUrl: 'https://cdn.pazarama.com/asset/entegrasyondokumani/APIEntegrasyonDokumani18.09.2023.pdf',
    readableData: ['Ürün, stok ve fiyat', 'Sipariş, müşteri ve adres', 'Marka', 'Kategori ve özellikler'],
  },
};

function numericCount(resource: IntegrationResource) {
  const count = Number(resource.metadata.count ?? 0);
  return Number.isFinite(count) ? count : 0;
}

export function parseJsonArray(raw: string | undefined): unknown[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

function parsePreview(resource: IntegrationResource): unknown[] {
  return parseJsonArray(resource.metadata.previewJson);
}

/** Backend'in örnek kayıtlardan türettiği gerçek alan envanteri (bkz. discoveredFields). */
type DiscoveredField = { name: string; type: string; count: number };

function isDiscoveredField(value: unknown): value is DiscoveredField {
  if (typeof value !== 'object' || value === null) return false;
  const field = value as Record<string, unknown>;
  return typeof field.name === 'string' && typeof field.type === 'string' && typeof field.count === 'number';
}

function parseDiscoveredFields(resource: IntegrationResource): DiscoveredField[] {
  return parseJsonArray(resource.metadata.discoveredFields).filter(isDiscoveredField);
}

function formatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function isPreviewRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function previewValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
}

function resourceStatusClass(status: string | undefined): string {
  if (status === 'error') return 'bg-rose-500/10 text-rose-600';
  if (status === 'live') return 'bg-emerald-500/10 text-emerald-600';
  return 'bg-amber-500/10 text-amber-600';
}

function resourceStatusLabel(status: string | undefined): string {
  if (status === 'error') return 'Hata';
  if (status === 'live') return 'Canlı';
  return 'Yenileme bekliyor';
}

export function MarketplaceDataOverview({ connection, resources }: {
  connection: IntegrationConnection;
  resources: IntegrationResource[];
}) {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'cards' | 'json'>('cards');
  const [jsonSource, setJsonSource] = useState<'clean' | 'raw'>('clean');
  const [resourceQuery, setResourceQuery] = useState('');
  const guide = PROVIDER_GUIDES[connection.providerKey] ?? (connection.kind === 0 ? {
    auth: 'ERP hesabına ait şifreli bağlantı bilgileri ve hesap kodu',
    docsUrl: '',
    readableData: ['Ürün, stok ve fiyat', 'Kategori ve depo', 'Sipariş ve pazaryeri kırılımı', 'İade ve talepler'],
  } : undefined);
  const dataResources = resources.filter((resource) => resource.metadata.resourceKind !== 'account');
  const filteredResources = (() => {
    const query = resourceQuery.trim().toLocaleLowerCase('tr-TR');
    if (!query) return dataResources;
    return dataResources.filter((resource) =>
      `${resource.name} ${resource.metadata.dataFields ?? ''} ${resource.metadata.marketplace ?? ''}`
        .toLocaleLowerCase('tr-TR').includes(query));
  })();
  // selectedResourceId "type-externalId" bileşik anahtarıdır (bkz. nav düğmesi) — sadece
  // externalId ile eşleştirmek, aynı adı farklı türde taşıyan iki kaynak aynı listede
  // olduğunda yanlış olanı seçebilirdi.
  const selectedResource = filteredResources.find((resource) => `${resource.type}-${resource.externalId}` === selectedResourceId)
    ?? filteredResources[0]
    ?? dataResources[0];
  const selectedPreview = selectedResource ? parsePreview(selectedResource) : [];
  const discoveredFields = selectedResource ? parseDiscoveredFields(selectedResource) : [];
  const discoveredSampleCount = Number(selectedResource?.metadata.discoveredFieldSampleCount ?? 0) || 0;
  const rawPreviewJson = selectedResource?.metadata.rawPreviewJson;
  const showRawJson = jsonSource === 'raw' && Boolean(rawPreviewJson);
  const jsonText = showRawJson && rawPreviewJson
    ? formatJson(rawPreviewJson)
    : JSON.stringify(selectedPreview, null, 2);
  // Çekimi başarısız olan kaynaklar grafikten ÇIKARILIR. Backend hata durumunda count=0
  // yazıyor (bkz. IntegrationHubService.ErrorResource); bunları çizmek "gerçekten 0 kayıt"
  // ile "alınamadı"yı aynı görünüme sokuyordu — 0 yüksekliğinde gerçek bir çubuk gibi.
  const chartData = dataResources
    .filter((resource) => resource.metadata.status !== 'error')
    .map((resource) => ({ name: resource.name, count: numericCount(resource) }));
  const liveCount = dataResources.filter((resource) => resource.metadata.status === 'live').length;
  const errorCount = dataResources.filter((resource) => resource.metadata.status === 'error').length;
  const statusData = [
    { name: 'Canlı', value: liveCount, color: '#10b981' },
    // Hata dilimi ayrı gösterilir; önceden başarısız kaynaklar "Bekliyor" içinde eriyordu.
    { name: 'Hata', value: errorCount, color: '#ef4444' },
    { name: 'Bekliyor', value: Math.max(dataResources.length - liveCount - errorCount, 0), color: '#f59e0b' },
  ].filter((item) => item.value > 0);

  const brandIconInfo = useMemo(() => ({ icon: resolveBrandIcon(connection.providerName) }), [connection.providerName]);
  const BrandIcon = brandIconInfo.icon;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]">
      <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
              <BrandIcon size={15} />
            </span>
            <div className="min-w-0">
              <h2
                className="text-xs font-bold"
                title="Her kaynaktan okunan kayıt sayısı. API toplam bildirmiyorsa yalnızca ilk yanıt sayfasını kapsar. Alınamayan kaynaklar grafiğe dahil edilmez."
              >
                Canlı veri görünümü
              </h2>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 sm:self-auto">
            <Radio size={10} /> {liveCount}/{dataResources.length} kaynak canlı
          </span>
        </div>
        {chartData.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-xs text-[var(--fg-muted)]">Verileri yenileyerek canlı kaynakları keşfedin.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
            <div className="h-56 min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 38 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                  <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} height={58} tick={{ fontSize: 9, fill: 'var(--fg-muted)' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: 'var(--fg-muted)' }} label={{ value: 'Kayıt sayısı', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'var(--fg-muted)' } }} />
                  <Tooltip cursor={{ fill: 'var(--bg-subtle)' }} contentStyle={{ fontSize: 11, borderColor: 'var(--border)', background: 'var(--card)' }} formatter={(value) => [Number(value).toLocaleString('tr-TR'), 'Kayıt']} />
                  <Bar dataKey="count" name="Kayıt" fill="#0ea5e9" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex h-48 flex-col self-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={3}>
                    {statusData.map((item) => <Cell key={item.name} fill={item.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderColor: 'var(--border)', background: 'var(--card)' }} formatter={(value, name) => [`${value} kaynak`, name]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} verticalAlign="bottom" height={20} />
                </PieChart>
              </ResponsiveContainer>
              <p className="-mt-1 text-center text-[10px] font-semibold text-[var(--fg-muted)]">Kaynak sağlık dağılımı</p>
            </div>
          </div>
        )}
      </section>

      {guide && (
        <details className="group rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-bold">
            <span className="flex items-center gap-2"><BookOpen size={14} /> {connection.providerName} API rehberi</span>
            <span className="text-[10px] text-[var(--fg-muted)] group-open:hidden">Aç</span>
          </summary>
          <div className="mt-4 space-y-4 text-[11px]">
            <div className="rounded-[4px] bg-[var(--bg-subtle)] p-3">
              <p className="flex items-center gap-1.5 font-bold"><LockKeyhole size={12} /> Kimlik doğrulama</p>
              <p className="mt-1.5 leading-5 text-[var(--fg-muted)]">{guide.auth}</p>
            </div>
            <div>
              <p className="font-bold">Okunabilen veri grupları</p>
              <div className="mt-2 grid gap-1.5">
                {guide.readableData.map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-[var(--fg-muted)]"><CheckCircle2 size={11} className="text-emerald-600" />{item}</span>
                ))}
              </div>
            </div>
            {guide.docsUrl && (
              <a href={guide.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-bold text-sky-600 hover:underline">
                Resmî dokümantasyona git <ExternalLink size={11} />
              </a>
            )}
            <p className="rounded-[4px] border border-amber-500/20 bg-amber-500/5 p-2.5 text-[10px] leading-4 text-amber-700">
              Bu ekran salt okunur; stok, fiyat veya sipariş durumunu değiştirmez.
            </p>
          </div>
        </details>
      )}
      </div>

      <section className="overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2
              className="flex items-center gap-2 text-xs font-bold"
              title={`Her kaynaktan en fazla ${PREVIEW_SAMPLE_LIMIT} örnek kayıt gösterilir. Kişisel bilgiler gizlenir.`}
            >
              <FileJson size={14} /> Canlı veri gezgini
            </h2>
          </div>
          <label className="flex h-8 w-full items-center gap-2 rounded-[4px] border border-[var(--border)] px-2.5 md:w-72">
            <Search size={12} className="text-[var(--fg-muted)]" />
            <input value={resourceQuery} onChange={(event) => setResourceQuery(event.target.value)} placeholder="Kaynak veya alan ara…" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
          </label>
        </div>

        <div className="grid min-h-[420px] lg:grid-cols-[280px_minmax(0,1fr)]">
          <nav className="max-h-[620px] overflow-y-auto border-b border-[var(--border-soft)] p-2 lg:border-r lg:border-b-0">
            {filteredResources.map((resource) => {
              const resourceKey = `${resource.type}-${resource.externalId}`;
              const isSelected = resourceKey === (selectedResource ? `${selectedResource.type}-${selectedResource.externalId}` : null);
              return (
                <button key={resourceKey} type="button" onClick={() => setSelectedResourceId(resourceKey)} className={`mb-1 flex w-full items-start justify-between gap-3 rounded-[4px] px-3 py-2.5 text-left ${isSelected ? 'bg-sky-500/10 text-sky-700' : 'hover:bg-[var(--bg-subtle)]'}`}>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-bold">{resource.name}</span>
                    <span className="mt-0.5 block truncate text-[9.5px] text-[var(--fg-muted)]">{resource.metadata.marketplace ?? resource.metadata.resourceKind}</span>
                  </span>
                  {/* Hatalı kaynakta sayı yerine "—": backend count=0 yazsa da bu "sıfır kayıt"
                      değil "okunamadı" demektir. */}
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${resourceStatusClass(resource.metadata.status)}`}>
                    {resource.metadata.status === 'error' ? '—' : resource.metadata.count ?? '—'}
                  </span>
                </button>
              );
            })}
            {filteredResources.length === 0 && <p className="px-3 py-8 text-center text-xs text-[var(--fg-muted)]">Eşleşen kaynak yok.</p>}
          </nav>

          <div className="min-w-0 p-4">
            {!selectedResource ? (
              <div className="flex h-full items-center justify-center text-xs text-[var(--fg-muted)]">Önizlenecek kaynak bulunmuyor.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold">{selectedResource.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${resourceStatusClass(selectedResource.metadata.status)}`}>{resourceStatusLabel(selectedResource.metadata.status)}</span>
                    </div>
                    <p className="mt-1 text-[10.5px] leading-4 text-[var(--fg-muted)]">{selectedResource.metadata.dataFields || selectedResource.metadata.availableActions}</p>
                    {discoveredFields.length > 0 && (
                      <details className="group/fields mt-2 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-1.5 text-[10px] font-bold">
                          <span className="flex items-center gap-1.5"><ListTree size={11} /> API&apos;nin gerçekten döndürdüğü alanlar</span>
                          <span className="text-[9.5px] font-semibold text-[var(--fg-muted)]">{discoveredFields.length} alan · {discoveredSampleCount} örnek</span>
                        </summary>
                        <ul className="max-h-52 divide-y divide-[var(--border-soft)] overflow-y-auto border-t border-[var(--border-soft)]">
                          {discoveredFields.map((field) => (
                            <li key={field.name} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-2.5 py-1.5">
                              <code className="min-w-0 grow break-all text-[9.5px] text-sky-600">{field.name}</code>
                              <span className="shrink-0 rounded-full bg-[var(--card)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--fg-muted)]">{field.type}</span>
                              <span className="shrink-0 text-[9px] text-[var(--fg-muted)]">{field.count}/{discoveredSampleCount}</span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                    {selectedResource.metadata.readEndpoint && <code className="mt-2 block break-all text-[9.5px] text-sky-600">{selectedResource.metadata.readEndpoint}</code>}
                  </div>
                </div>

                {selectedResource.metadata.error && <div className="rounded-[4px] border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-rose-600">{selectedResource.metadata.error}</div>}

                <details className="group/preview rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[10.5px] font-bold">
                    <span className="flex items-center gap-1.5"><FileJson size={12} /> Ham veriyi / örnek kayıtları göster</span>
                    <span className="text-[9.5px] font-semibold text-[var(--fg-muted)]">{selectedPreview.length} örnek kayıt · <span className="group-open/preview:hidden">Aç</span><span className="hidden group-open/preview:inline">Kapat</span></span>
                  </summary>
                  <div className="border-t border-[var(--border-soft)] p-3">
                    <div className="mb-3 flex shrink-0 rounded-[4px] border border-[var(--border)] p-0.5">
                      <button type="button" onClick={() => setPreviewMode('cards')} className={`inline-flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-[10px] font-bold ${previewMode === 'cards' ? 'bg-[var(--card)]' : ''}`}><Braces size={11} /> Alanlar</button>
                      <button type="button" onClick={() => setPreviewMode('json')} className={`inline-flex h-7 items-center gap-1.5 rounded-[3px] px-2.5 text-[10px] font-bold ${previewMode === 'json' ? 'bg-[var(--card)]' : ''}`}><FileJson size={11} /> JSON</button>
                    </div>
                    {selectedPreview.length === 0 ? (
                      <div className="flex min-h-56 flex-col items-center justify-center gap-1 rounded-[4px] border border-dashed border-[var(--border)] px-4 text-center text-xs text-[var(--fg-muted)]">
                        <span>Bu kaynak için henüz örnek kayıt alınmadı.</span>
                        <span className="text-[10.5px]">Yukarıdaki &quot;Verileri yenile&quot; ile canlı API&apos;den çekebilirsiniz; kaynak gerçekten boşsa bu ekran boş kalır.</span>
                      </div>
                    ) : previewMode === 'json' ? (
                      <div className="space-y-2">
                        {rawPreviewJson && (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex rounded-[4px] border border-[var(--border)] p-0.5">
                              <button type="button" onClick={() => setJsonSource('clean')} className={`h-6 rounded-[3px] px-2 text-[10px] font-bold ${jsonSource === 'clean' ? 'bg-[var(--card)]' : ''}`}>Temiz görünüm</button>
                              <button type="button" onClick={() => setJsonSource('raw')} className={`h-6 rounded-[3px] px-2 text-[10px] font-bold ${jsonSource === 'raw' ? 'bg-[var(--card)]' : ''}`}>Ham yanıt</button>
                            </div>
                            <span className="text-[9.5px] text-[var(--fg-muted)]">Ham yanıt tam olarak gösterilir; sadece kişisel bilgiler gizlenir.</span>
                          </div>
                        )}
                        {selectedResource.metadata.rawPreviewTruncated && (
                          <p className="text-[9.5px] text-amber-600">Ham yanıt boyut sınırını aştığı için saklanmadı; temiz görünüm gösteriliyor.</p>
                        )}
                        <pre className="max-h-[520px] overflow-auto rounded-[4px] bg-zinc-950 p-4 text-[10.5px] leading-5 text-zinc-100">{jsonText}</pre>
                      </div>
                    ) : (
                      <div className="grid gap-3 xl:grid-cols-2">
                        {selectedPreview.map((sample, index) => (
                          <article key={index} className="min-w-0 overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
                            <div className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] px-3 py-2 text-[10px] font-bold">Örnek kayıt {index + 1}</div>
                            {isPreviewRecord(sample) ? (
                              <dl className="divide-y divide-[var(--border-soft)]">
                                {Object.entries(sample).map(([key, value]) => (
                                  <div key={key} className="grid grid-cols-[minmax(110px,0.35fr)_minmax(0,1fr)] gap-3 px-3 py-2">
                                    <dt className="break-words text-[9.5px] font-bold text-[var(--fg-muted)]">{key}</dt>
                                    <dd className="min-w-0 whitespace-pre-wrap break-words text-[10px] leading-4">{previewValue(value)}</dd>
                                  </div>
                                ))}
                              </dl>
                            ) : <p className="break-all p-3 text-[10px]">{previewValue(sample)}</p>}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
