'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity, AlertTriangle, ArrowLeft, Box, Boxes, ChevronDown, ChevronRight, Clock, Database, DatabaseZap, Eye, ExternalLink,
  FolderTree, Loader2, Pencil, Percent, Power, PlugZap, RefreshCw, ShieldQuestion, ShoppingCart, Store, Trash2, X,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { baseChannelMappingApi, INGESTION_POLICY, integrationConnectionsApi, PLATFORM_RATE_SOURCE, platformRatesApi, storeApi } from '../../lib/api';
import type { IntegrationConnection, IntegrationKind, IntegrationResource, IntegrationSyncHistoryPoint, MarketplaceIngestionPolicy, PlatformRateInfo, PlatformRateSource } from '../../lib/api';
import { describeError } from '../../lib/errors';
import { formatDateTime } from '../../lib/format';
import { integrationConnectionSlug } from '../../lib/integration-routing';
import { toast } from '../../lib/toast';
import { resolveBrandIcon, resolveLastSync, resolveStatus, STATUS_LABEL, STATUS_TEXT_CLASS } from './integration-status';
import { MarketplaceDataOverview } from './MarketplaceDataOverview';

interface IntegrationConnectionDetailViewProps {
  kind: IntegrationKind;
  slug: string;
}

function flattenResources(resources: IntegrationResource[]): IntegrationResource[] {
  return resources.flatMap((resource) => [resource, ...flattenResources(resource.children)]);
}

// Bileşen referansı değişkene atanıp <ResourceIcon /> olarak render edilirse
// react-hooks/static-components kuralı "render sırasında bileşen oluşturuluyor" diye
// hata veriyor (her render'da yeni referans = state sıfırlanma riski). Bunun yerine
// sabit, üst seviyede tanımlı bir bileşen kullanıyoruz.
function ResourceKindIcon({ resource, size }: { resource: IntegrationResource; size: number }) {
  const kind = resource.metadata.resourceKind ?? '';
  if (kind === 'account' || resource.type === 1) return <Store size={size} />;
  if (kind.includes('order')) return <ShoppingCart size={size} />;
  return <Box size={size} />;
}

function ResourceMetadata({ resource }: { resource: IntegrationResource }) {
  const metadata = resource.metadata;
  const count = metadata.count;
  const actions = metadata.availableActions;
  // Çekim başarısızsa backend count=0 yazar (bkz. IntegrationHubService.ErrorResource) —
  // bunu "0 kayıt" diye göstermek "gerçekten boş" ile "alınamadı"yı karıştırır.
  const isError = metadata.status === 'error';
  if (!count && !actions && !metadata.dataFields) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--fg-muted)]">
      {isError ? (
        <span className="rounded-[3px] bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-600">Kayıt sayısı alınamadı</span>
      ) : count && (
        // countScope backend'den gelir: "API toplamı varsa toplam, yoksa ilk yanıt sayfası".
        // Sayı çoğu uçta yalnızca ilk sayfa (25) olduğundan kapsamı title'da (tooltip)
        // taşınıyor — aksi halde 40.000 siparişlik kaynak "25" diye okunuyordu, ama satırda
        // her zaman görünmesi gerekmiyor.
        <span
          className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-semibold"
          title={metadata.countScope ?? undefined}
        >
          {count} kayıt
        </span>
      )}
      {/* Aynı kanal hem bu ERP'den hem de doğrudan bir pazaryeri bağlantısından geliyor.
          Çakışma değil ama iki yerden yönetiliyor — kullanıcı hangisini düzenlediğini
          bilmeli, bu yüzden diğer bağlantıya köprü kuruluyor. */}
      {resource.linkedMarketplaceConnectionId !== null && (
        <span className="flex w-full items-center gap-1.5 rounded-[3px] bg-amber-500/10 px-2 py-1 text-[10px] text-amber-700">
          <AlertTriangle size={11} className="shrink-0" />
          <span>
            Bu kanal ayrıca doğrudan bağlantı olarak da tanımlı:{' '}
            <strong>{resource.linkedMarketplaceConnectionName}</strong>. Aynı veri iki yerden
            yönetiliyor — oranları tek yerden düzenlemeniz önerilir.
          </span>
        </span>
      )}
      {actions && <span className="w-full text-[10.5px]">{actions}</span>}
      {metadata.error && <span className="w-full rounded-[3px] bg-rose-500/5 px-2 py-1 text-rose-600">{metadata.error}</span>}
      {metadata.dataFields && <span className="w-full leading-4">{metadata.dataFields}</span>}
      {metadata.docsUrl && (
        <a href={metadata.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:underline">
          API detayı <ExternalLink size={9} />
        </a>
      )}
      {metadata.checkedAt && <span title="Son kontrol">{new Date(metadata.checkedAt).toLocaleString('tr-TR')}</span>}
      {metadata.readEndpoint && (
        <details className="w-full">
          <summary className="cursor-pointer text-[9.5px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]">Teknik detay</summary>
          <code className="mt-1 block max-w-full truncate rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5">{metadata.readEndpoint}</code>
        </details>
      )}
    </div>
  );
}

// Bir kaynağın PASİF / AKTİF kararı.
//
//   Pasif  → veri yalnızca canlı gezginde görünür, hiçbir yere yazılmaz.
//   Aktif  → veri sisteme işlenir: kayıt varsa BOŞ ALANLARI DOLDURUR (upsert/merge),
//            yoksa oluşturur. Var olan doğru veriyi ezmez.
//
// "Hata" bir politika DEĞİLDİR — canlı probun sonucudur (bkz. metadata.status) ve bu
// kontrolden bağımsızdır; uç veri döndürmüyorsa politikayı değiştirmek bir şey çözmez.
//
// Backend üç değer taşımaya devam ediyor (ViewOnly/Ingest/IncrementalOnly) ama kullanıcıya
// İKİ seçenek gösteriliyor: "yalnızca yeni kayıtlar" ayrımı sadece ERP sipariş grubunda
// anlamlı bir PERFORMANS detayı (tam geçmiş taraması saatler sürebiliyor), ayrı bir mod
// değil. Orada Aktif'in altında ikincil bir seçenek olarak duruyor.
//
// Hangi kaynakların gerçekten alınabildiğinin tek kaynağı backend'dedir (bkz.
// MarketplaceIngestionCatalog) — burada o listeyi kopyalamıyoruz: alım uygulaması olmayan
// bir kaynak için backend'in döndürdüğü 400 mesajı toast'ta gösterilir.
function ResourcePolicyControl({
  connectionId,
  resource,
  onChanged,
}: {
  connectionId: number;
  resource: IntegrationResource;
  onChanged: () => Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const isIncrementalOnly = resource.ingestionPolicy === INGESTION_POLICY.IncrementalOnly;
  // AKTİF = yazan her iki politika. IncrementalOnly ayrı bir mod değil, Aktif'in dar kapsamlı
  // hâli — kullanıcıya üçüncü bir seçenek gibi göstermek kafa karıştırıyordu.
  const isActive = resource.ingestionPolicy === INGESTION_POLICY.Ingest || isIncrementalOnly;
  // Tam geçmiş taraması ile dakikalık yeni-sipariş taramasının AYRI iki iş olduğu tek grup
  // sipariş grubudur. Backend hesaplayıp gönderiyor (bkz.
  // MarketplaceIngestionCatalog.SupportsIncrementalOnly) — karar tek yerde kalıyor.
  const supportsIncrementalOnly = resource.supportsIncrementalOnly;

  const setPolicy = async (policy: MarketplaceIngestionPolicy) => {
    if (isSaving || resource.ingestionPolicy === policy) return;
    setIsSaving(true);
    try {
      await integrationConnectionsApi.setResourcePolicy(connectionId, resource.id, policy);
      await onChanged();
      toast.success(
        policy === INGESTION_POLICY.Ingest
          ? `"${resource.name}" aktif — veri sisteme işlenecek, boş alanlar doldurulacak.`
          : policy === INGESTION_POLICY.IncrementalOnly
            ? `"${resource.name}" aktif — yalnızca yeni kayıtlar taranacak.`
            : `"${resource.name}" pasif — veri yalnızca görüntülenecek.`,
      );
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`mt-2.5 flex flex-col gap-2.5 rounded-[4px] border p-2.5 sm:flex-row sm:items-center sm:justify-between ${
        isActive ? 'border-sky-500/25 bg-sky-500/[0.06]' : 'border-[var(--border-soft)] bg-[var(--bg-subtle)]'
      }`}
    >
      <div className="flex items-center gap-2">
        {isActive
          ? <DatabaseZap size={15} className="shrink-0 text-sky-600" />
          : <Eye size={15} className="shrink-0 text-[var(--fg-muted)]" />}
        <p className="text-[11px] leading-4">
          <span className={`block font-bold ${isActive ? 'text-sky-700' : 'text-[var(--fg)]'}`}>
            {isActive ? 'Aktif' : 'Pasif'}
          </span>
          <span className="block text-[var(--fg-muted)]">
            {isActive
              ? isIncrementalOnly
                ? 'Yalnızca yeni kayıtlar işleniyor; boş alanlar dolduruluyor.'
                : 'Veri sisteme işleniyor; boş alanlar dolduruluyor, var olan ezilmiyor.'
              : 'Yalnızca burada görüntüleniyor, hiçbir yere yazılmıyor.'}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-0.5">
          <button
            type="button"
            onClick={() => void setPolicy(INGESTION_POLICY.ViewOnly)}
            disabled={isSaving}
            title="Veri yalnızca bu ekranda görünür; uygulamaya kaydedilmez."
            className={`inline-flex h-8 items-center gap-1.5 rounded-[3px] px-3 text-[11px] font-bold disabled:cursor-wait disabled:opacity-60 ${!isActive ? 'bg-[var(--bg-subtle)] text-[var(--fg)]' : 'text-[var(--fg-muted)]'}`}
          >
            <Eye size={12} /> Pasif
          </button>
          <button
            type="button"
            onClick={() => void setPolicy(INGESTION_POLICY.Ingest)}
            disabled={isSaving}
            title="Veri sisteme işlenir: kayıt varsa boş alanları doldurur, yoksa oluşturur. Bazı veri türleri aktarılamaz; öyleyse bilgi verilir."
            className={`inline-flex h-8 items-center gap-1.5 rounded-[3px] px-3 text-[11px] font-bold disabled:cursor-wait disabled:opacity-60 ${isActive ? 'bg-sky-500/15 text-sky-600' : 'text-[var(--fg-muted)]'}`}
          >
            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <DatabaseZap size={12} />}
            Aktif
          </button>
        </div>

        {/* Tam geçmiş taraması saatler sürebildiği için sipariş grubunda ikincil bir seçenek.
            Ayrı bir MOD değil, Aktif'in kapsam ayarı — o yüzden yalnızca Aktif'ken görünür. */}
        {supportsIncrementalOnly && isActive && (
          <label className="flex cursor-pointer items-center gap-1.5 text-[10.5px] text-[var(--fg-muted)]">
            <input
              type="checkbox"
              checked={isIncrementalOnly}
              disabled={isSaving}
              onChange={(event) =>
                void setPolicy(
                  event.target.checked ? INGESTION_POLICY.IncrementalOnly : INGESTION_POLICY.Ingest,
                )
              }
              className="h-3 w-3 accent-sky-600"
            />
            <RefreshCw size={10} />
            Yalnızca yeni kayıtlar (tam geçmiş taraması kapalı)
          </label>
        )}
      </div>
    </div>
  );
}

function parseNumberOrUndefined(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

function RateSourceBadge({ source }: { source: PlatformRateSource }) {
  const isIngested = source === PLATFORM_RATE_SOURCE.Ingested;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${isIngested ? 'bg-sky-500/10 text-sky-600' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'}`}>
      {isIngested ? 'canlı veriden' : 'elle girildi'}
    </span>
  );
}

// Oranlar backend'de KESİR olarak saklanır (0.20 = %20) — FinanceCalculationService'in
// "SalePrice / (1 + VatRate)" formülü buna bağlı, birim değiştirilemez. Ekranda ve giriş
// formunda ise kullanıcı YÜZDE görür/girer, dönüşüm burada yapılır (aynı desen:
// components/finance/PlatformSettingsView.tsx). Math.round(x * 1000) / 10, 0.16 * 100'ün
// 16.000000000000002 üretmesi gibi kayan nokta artıklarını temizler.
const fractionToPercent = (fraction: number) => Math.round(fraction * 1000) / 10;
const percentToFraction = (percent: number) => percent / 100;

function RateChips({ rate }: { rate: PlatformRateInfo }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums">Komisyon %{fractionToPercent(rate.commissionRate).toLocaleString('tr-TR')}</span>
      {/* KDV rozeti kaynak etiketini PAYLAŞMAZ: backend KDV'yi asla canlı finans verisinden
          türetmez (mutabakat satırlarında satır bazında KDV yok), Ingested modda bile manuel
          ayardan okur, o da yoksa sabit %20 yer tutucusu kullanır — bkz.
          PlatformRateResolutionService.DefaultVatRate. Tek bir "canlı veriden" rozetinin altına
          konunca uydurma yer tutucu ölçülmüş veri gibi görünüyordu. */}
      <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums" title="KDV her zaman elle girilen ayardan gelir; girilmemişse varsayılan %20 kullanılır.">
        KDV %{fractionToPercent(rate.vatRate).toLocaleString('tr-TR')}
        <span className="ml-1 font-normal opacity-70">(elle)</span>
      </span>
      {/* Sıfırdan FARKLI her değer gösterilir (negatif de) — önceki "> 0" koşulu negatif bir
          hizmet bedelini sessizce gizliyordu. Para birimi sembolü konmuyor çünkü tutar
          mağazanın para birimindedir (StoreA GBP, StoreB TRY) ve bu bilgi bu uçta gelmiyor;
          uydurmak yerine belirsizlik tooltip'te açıkça yazılıyor. */}
      {rate.serviceFee !== 0 && (
        <span
          className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
          title="Tutar, ilgili mağazanın para birimindedir."
        >
          Hizmet bedeli {rate.serviceFee.toLocaleString('tr-TR')}
        </span>
      )}
      <RateSourceBadge source={rate.source} />
      {rate.effectiveAsOfDate && (
        <span className="text-[10px] text-[var(--fg-muted)]">Geçerlilik: {formatDateTime(rate.effectiveAsOfDate, 'tr')}</span>
      )}
    </div>
  );
}

// Oranı elle kaydeden satır içi form. PlatformRatesController.Upsert her zaman Source=Manual
// üretir/günceller — bu ingest edilmiş oranı DURDURMAZ, sadece manuel geri düşüşü belirler
// (bkz. aşağıdaki açıklama metni). storeId her zaman gerekir (backend PUT şartı); rate zaten
// çözülmüşse (initialStoreId dolu) tekrar sormaya gerek yok, aksi halde kullanıcı seçer.
function PlatformRateEditForm({
  platformId,
  initialStoreId,
  initialRate,
  onSaved,
  onCancel,
}: {
  platformId: number;
  initialStoreId: number | null;
  initialRate: PlatformRateInfo | null;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  // Formda YÜZDE tutulur (kullanıcı "20" yazar), API'ye KESİR gider (0.20) — bkz.
  // fractionToPercent/percentToFraction yorumu. Hizmet bedeli oran değil, mutlak TL
  // tutarıdır; dönüştürülmez.
  const [commissionRate, setCommissionRate] = useState(initialRate ? String(fractionToPercent(initialRate.commissionRate)) : '');
  const [vatRate, setVatRate] = useState(initialRate ? String(fractionToPercent(initialRate.vatRate)) : '');
  const [serviceFee, setServiceFee] = useState(initialRate ? String(initialRate.serviceFee) : '');
  const [storeId, setStoreId] = useState<number | ''>(initialStoreId ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const needsStoreSelection = initialStoreId === null;
  const storesQuery = useQuery({
    queryKey: ['stores-for-platform-rate-edit'],
    queryFn: storeApi.list,
    enabled: needsStoreSelection,
    staleTime: 5 * 60_000,
  });

  const submit = async () => {
    if (isSaving) return;
    if (storeId === '') {
      toast.error('Lütfen mağaza seçin.');
      return;
    }
    setIsSaving(true);
    try {
      const commissionPercent = parseNumberOrUndefined(commissionRate);
      const vatPercent = parseNumberOrUndefined(vatRate);
      await platformRatesApi.save({
        platformId,
        storeId,
        commissionRate: commissionPercent === undefined ? undefined : percentToFraction(commissionPercent),
        vatRate: vatPercent === undefined ? undefined : percentToFraction(vatPercent),
        serviceFee: parseNumberOrUndefined(serviceFee),
      });
      toast.success('Oran kaydedildi.');
      await onSaved();
    } catch (error) {
      toast.error(describeError(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
      {needsStoreSelection && (
        <label className="flex flex-col gap-1 text-[10.5px] font-semibold text-[var(--fg-muted)]">
          Mağaza
          <select
            value={storeId}
            onChange={(event) => setStoreId(event.target.value === '' ? '' : Number(event.target.value))}
            className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs"
          >
            <option value="">Seçin...</option>
            {(storesQuery.data ?? []).map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
        </label>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[10.5px] font-semibold text-[var(--fg-muted)]">
          Komisyon %
          <input
            type="number" step="0.01" value={commissionRate} onChange={(event) => setCommissionRate(event.target.value)}
            placeholder="ör. 15"
            className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs tabular-nums"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-semibold text-[var(--fg-muted)]">
          KDV %
          <input
            type="number" step="0.01" value={vatRate} onChange={(event) => setVatRate(event.target.value)}
            placeholder="ör. 20"
            className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs tabular-nums"
          />
        </label>
        <label className="flex flex-col gap-1 text-[10.5px] font-semibold text-[var(--fg-muted)]">
          Hizmet bedeli
          <input
            type="number" step="0.01" value={serviceFee} onChange={(event) => setServiceFee(event.target.value)}
            placeholder="ör. 0"
            className="h-8 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-2 text-xs tabular-nums"
          />
        </label>
      </div>
      <p className="text-[10px] leading-4 text-[var(--fg-muted)]">
        Bu oranı siz belirliyorsunuz. Sistem daha güncel bir veri bulursa, oranı otomatik olarak güncelleyebilir.
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button" onClick={onCancel} disabled={isSaving}
          className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[var(--border)] px-2 text-[10.5px] font-semibold hover:bg-[var(--card)] disabled:cursor-wait disabled:opacity-60"
        >
          <X size={11} /> Vazgeç
        </button>
        <button
          type="button" onClick={() => void submit()} disabled={isSaving}
          className="inline-flex h-7 items-center gap-1 rounded-[4px] bg-sky-500/15 px-2 text-[10.5px] font-bold text-sky-600 hover:bg-sky-500/25 disabled:cursor-wait disabled:opacity-60"
        >
          {isSaving ? <Loader2 size={11} className="animate-spin" /> : null} Kaydet
        </button>
      </div>
    </div>
  );
}

// MarketplaceAccount kaynağının satır içi oran bloğu. platformId genelde ERP siparişlerinden
// otomatik oluşan kaynaklarda metadata.platformId'den gelir (bkz. backend
// EnsureOrderResourcesAsync); resource.rate zaten doluysa oradan alınır. Hiçbiri yoksa bu
// kaynak için oran bu ekrandan yönetilemez (backend'in hangi platforma ait olduğunu
// bilmediğimiz bir kaynağa oran yazamayız).
function ResourceRateBlock({ resource, onChanged }: { resource: IntegrationResource; onChanged: () => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false);
  const metadataPlatformId = Number(resource.metadata.platformId);
  const platformId = resource.rate?.platformId ?? (Number.isFinite(metadataPlatformId) ? metadataPlatformId : null);

  if (platformId === null) return null;

  if (isEditing) {
    return (
      <PlatformRateEditForm
        platformId={platformId}
        initialStoreId={resource.rate?.storeId ?? null}
        initialRate={resource.rate}
        onSaved={async () => { await onChanged(); setIsEditing(false); }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {resource.rate ? (
        <RateChips rate={resource.rate} />
      ) : (
        <span className="rounded-[3px] bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">Oran girilmemiş</span>
      )}
      <button
        type="button" onClick={() => setIsEditing(true)}
        className="inline-flex h-6 items-center gap-1 rounded-[3px] border border-[var(--border)] px-1.5 text-[10px] font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
      >
        <Pencil size={10} /> Düzenle
      </button>
    </div>
  );
}

// Doğrudan pazaryeri bağlantılarının (kind===Marketplace) sayfa başındaki oran kartı — yalnızca
// connection.rate doluysa gösterilir (bkz. backend IntegrationConnectionDto.Rate yorumu).
function ConnectionRateHeader({ connection, onChanged }: { connection: IntegrationConnection; onChanged: () => Promise<void> }) {
  const [isEditing, setIsEditing] = useState(false);
  if (!connection.rate) return null;
  const rate = connection.rate;

  return (
    <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold"><Percent size={14} /> Komisyon / KDV oranı</div>
        {!isEditing && (
          <button
            type="button" onClick={() => setIsEditing(true)}
            className="inline-flex h-7 items-center gap-1 rounded-[4px] border border-[var(--border)] px-2 text-[10.5px] font-semibold hover:bg-[var(--bg-subtle)]"
          >
            <Pencil size={11} /> Düzenle
          </button>
        )}
      </div>
      {isEditing ? (
        <PlatformRateEditForm
          platformId={rate.platformId}
          initialStoreId={rate.storeId}
          initialRate={rate}
          onSaved={async () => { await onChanged(); setIsEditing(false); }}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <RateChips rate={rate} />
      )}
    </section>
  );
}

const RESOURCE_INDENT_CLASS = ['pl-4', 'pl-8', 'pl-12', 'pl-16'];

// Kaynak ağacını gerçek hiyerarşiyle (children'ı iç içe) çizer — eskiden flattenResources()
// tüm ağacı tek düz listeye eziyor, sabit pl-6 kullanıyordu (Base altındaki Trendyol/
// Hepsiburada gibi otomatik oluşan MarketplaceAccount çocukları görsel olarak ebeveynden
// ayırt edilemiyordu).
function ResourceTreeRow({
  resource,
  connectionId,
  depth,
  onChanged,
}: {
  resource: IntegrationResource;
  connectionId: number;
  depth: number;
  onChanged: () => Promise<void>;
}) {
  const indentClass = RESOURCE_INDENT_CLASS[Math.min(depth, RESOURCE_INDENT_CLASS.length - 1)];
  const isIncrementalOnly = resource.ingestionPolicy === INGESTION_POLICY.IncrementalOnly;
  const isIngest = resource.ingestionPolicy === INGESTION_POLICY.Ingest || isIncrementalOnly;
  // Satır varsayılan olarak KAPALI ve tek satırlık: ad + durum + sayı. Oran düzenleme,
  // aktarım kararı, gelen alanlar ve teknik detay ancak açıldığında görünür. Önceden hepsi
  // aynı anda basılıyordu ve 15-20 kaynaklı bir ERP'de sayfa okunamaz hale geliyordu.
  const [isOpen, setIsOpen] = useState(false);
  const hasError = resource.metadata.status === 'error';
  const count = hasError ? null : resource.metadata.count;

  // TEK DURUM ROZETİ: Hata → veri gelmiyor. Pasif → veri geliyor ama yalnızca görüntüleniyor.
  // Aktif → veri sisteme işleniyor (upsert/merge).
  //
  // Eskiden buradaki "Aktif/Pasif" ucun CEVAP VERİP VERMEDİĞİNİ (resource.isActive) gösteriyor,
  // aktarım kararı ise ayrı bir "Aktarılıyor" rozetinde duruyordu. Sonuç: hiçbir şey
  // aktarılmayan bir kaynak "Aktif" görünüyordu — kullanıcının en çok yanıldığı nokta buydu.
  const statusLabel = hasError ? 'Hata' : isIngest ? 'Aktif' : 'Pasif';
  const statusClass = hasError
    ? 'text-rose-600'
    : isIngest
      ? 'text-emerald-600'
      : 'text-[var(--fg-muted)]';

  return (
    <div>
      <div
        className={`border-b border-l-2 border-[var(--border-soft)] pr-3 ${indentClass} ${
          isIngest ? 'border-l-sky-500 bg-sky-500/[0.03]' : 'border-l-transparent'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          className="flex w-full items-center gap-2 py-2 text-left"
        >
          {isOpen ? <ChevronDown size={12} className="shrink-0 text-[var(--fg-muted)]" /> : <ChevronRight size={12} className="shrink-0 text-[var(--fg-muted)]" />}
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]">
            <ResourceKindIcon resource={resource} size={11} />
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-semibold">{resource.name}</span>

          {/* Özet rozetler — kapalıyken de bir bakışta durum görünsün. */}
          {count && <span className="shrink-0 rounded-full bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-[var(--fg-muted)]">{count}</span>}
          {resource.linkedMarketplaceConnectionId !== null && (
            <AlertTriangle size={11} className="shrink-0 text-amber-600" />
          )}
          {resource.metadata.mappingState === 'unmapped' && (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">Eşlenmedi</span>
          )}
          {/* Aktif'in dar kapsamlı hâli — ayrı bir durum değil, Aktif'in yanında not. */}
          {isIncrementalOnly && !hasError && (
            <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">Sadece yeni</span>
          )}
          <span
            className={`shrink-0 text-[10px] font-bold ${statusClass}`}
            title={
              hasError
                ? 'Uç veri döndürmüyor — ayrıntı için satırı açın.'
                : isIngest
                  ? 'Veri sisteme işleniyor; boş alanlar dolduruluyor.'
                  : 'Veri geliyor ama yalnızca görüntüleniyor. Aktif etmek için satırı açın.'
            }
          >
            {statusLabel}
          </span>
        </button>

        {isOpen && (
          <div className="pb-3 pl-[26px]">
            <p className="truncate text-[10.5px] text-[var(--fg-muted)]">Kaynak kodu: {resource.externalId}</p>
            <ResourceMetadata resource={resource} />
            {resource.type === 1 && <ResourceRateBlock resource={resource} onChanged={onChanged} />}
            {resource.id > 0 && (
              <ResourcePolicyControl connectionId={connectionId} resource={resource} onChanged={onChanged} />
            )}
          </div>
        )}
      </div>
      {/* Alt kaynaklar da üst satır kapalıyken gizlenir — üst satırı "kapalı" yapıp altındaki
          10 alt kaynağı yine de açık bırakmak, sadeleştirmenin amacını (tek bakışta özet) boşa
          çıkarırdı. Bugün ERP kaynakları düz (ParentId=null) geldiği için bunun görünür etkisi
          yok, ama granüler alt-gruplara (Faz 3) geçildiğinde ilk anda ortaya çıkacak bir hataydı. */}
      {isOpen && resource.children.map((child) => (
        <ResourceTreeRow
          key={`${child.id}-${child.externalId}`}
          resource={child}
          connectionId={connectionId}
          depth={depth + 1}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function KpiTile({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[var(--fg-muted)]">
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-lg font-extrabold leading-tight tabular-nums">{value}</p>
        <p className="truncate text-[10.5px] font-semibold text-[var(--fg-muted)]">{label}</p>
      </div>
    </div>
  );
}

function formatHistoryDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function SyncHistoryChart({ history, isLoading }: { history: IntegrationSyncHistoryPoint[] | undefined; isLoading: boolean }) {
  if (isLoading) {
    return <div className="flex h-56 items-center justify-center text-xs text-[var(--fg-muted)]"><Loader2 size={14} className="mr-2 animate-spin" /> Senkron geçmişi yükleniyor...</div>;
  }
  const hasActivity = (history ?? []).some((point) => point.successCount > 0 || point.errorCount > 0);
  if (!history || history.length === 0 || !hasActivity) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-1.5 rounded-[4px] border border-dashed border-[var(--border)] text-center">
        <Activity size={18} className="text-[var(--fg-muted)]" />
        <p className="text-xs font-semibold text-[var(--fg-muted)]">Son 30 günde senkron aktivitesi kaydedilmedi</p>
        <p className="text-[10.5px] text-[var(--fg-muted)]">Bağlantı senkronize edildikçe burada günlük başarı/hata grafiği görünecek.</p>
      </div>
    );
  }
  const chartData = history.map((point) => ({
    date: formatHistoryDate(point.date),
    success: point.successCount,
    error: point.errorCount,
  }));
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="syncSuccessFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="syncErrorFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" minTickGap={24} />
          <YAxis allowDecimals={false} tick={{ fontSize: 9 }} width={28} />
          <Tooltip contentStyle={{ fontSize: 11, borderColor: 'var(--border)', background: 'var(--card)' }} />
          <Legend wrapperStyle={{ fontSize: 10.5 }} />
          <Area type="monotone" dataKey="success" name="Başarılı" stroke="#10b981" fill="url(#syncSuccessFill)" strokeWidth={1.75} />
          <Area type="monotone" dataKey="error" name="Hatalı" stroke="#f43f5e" fill="url(#syncErrorFill)" strokeWidth={1.75} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IntegrationConnectionDetailView({ kind, slug }: IntegrationConnectionDetailViewProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTogglingActive, setIsTogglingActive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const connectionsQuery = useQuery<IntegrationConnection[]>({
    queryKey: ['integration-connections'],
    queryFn: () => integrationConnectionsApi.list(),
    staleTime: 30_000,
  });
  const connection = connectionsQuery.data?.find(
    (item) => item.kind === kind && integrationConnectionSlug(item) === slug,
  );
  const brandIconInfo = useMemo(() => ({ icon: resolveBrandIcon(connection?.providerName ?? '') }), [connection?.providerName]);
  const BrandIcon = brandIconInfo.icon;
  const baseMappingsQuery = useQuery({
    queryKey: ['base-mappings-hub'],
    queryFn: baseChannelMappingApi.overview,
    enabled: connection?.providerKey === 'baselinker',
    staleTime: 10 * 60_000,
  });
  const historyQuery = useQuery<IntegrationSyncHistoryPoint[]>({
    queryKey: ['integration-connection-history', connection?.id],
    queryFn: () => integrationConnectionsApi.history(connection!.id, 30),
    enabled: Boolean(connection),
    staleTime: 60_000,
  });
  // Base (BaseLinker) için kanal→mağaza eşleşmeleri EK bilgidir; backend'in canlı keşfiyle
  // (ürün/kategori/sipariş/iade sayıları + örnek kayıtlar) YER DEĞİŞTİRMEZ. Eskiden bu liste
  // connection.resources'ı komple eziyordu ve metadata boş verildiği için her satır "0 kayıt /
  // bu kaynak boş döndü" görünüyordu — Base'in tamamen boşmuş gibi durmasının sebebi buydu.
  const resources = useMemo<IntegrationResource[]>(() => {
    const discovered = connection?.resources ?? [];
    if (connection?.providerKey !== 'baselinker' || !baseMappingsQuery.data) return discovered;

    const channelResources = baseMappingsQuery.data.channels.map((channel, index): IntegrationResource => ({
      id: -(index + 1),
      type: 1,
      externalId: `${channel.orderSource}:${channel.orderSourceId}`,
      name: `${channel.accountName || channel.orderSource} kanalı`,
      // isMapped "mağazaya eşlendi mi" demektir, "kanal aktif mi" DEĞİL. Buraya isActive
      // olarak bağlanınca sipariş üreten canlı bir eBay kanalı sırf eşlemesi yok diye
      // "Pasif" görünüyordu. Kanalın kendisi her zaman canlıdır; eşleme durumu aşağıdaki
      // mappingState alanında ayrıca gösterilir.
      isActive: true,
      metadata: {
        resourceKind: 'account',
        direction: 'in',
        status: 'live',
        mappingState: channel.isMapped ? 'mapped' : 'unmapped',
        count: String(channel.liveOrderCount),
        countScope: 'Bu kanaldaki canlı sipariş sayısı',
        dataFields: channel.isMapped
          ? `Eşleşen mağaza: ${channel.mapping?.storeName ?? '—'} · Kaynak ID: ${channel.orderSourceId}`
          : `Henüz bir mağazaya eşlenmedi · Kaynak ID: ${channel.orderSourceId}`,
        availableActions: 'Kanal → mağaza eşleşmesini Base ayarlarından yönetin',
      },
      ingestionPolicy: 0 as const,
      policyUpdatedAt: null,
      children: [],
      rate: null,
      // Base kanalları ERP'nin kendi kanal eşlemesinden gelir; doğrudan pazaryeri
      // bağlantısıyla çakışma tespiti bu satırlar için yapılmaz.
      linkedMarketplaceConnectionId: null,
      linkedMarketplaceConnectionName: null,
      supportsIncrementalOnly: false,
      // Base kanalları ERP eşlemesinden türetilen görüntü satırlarıdır; kendi başlarına
      // aktif edilebilir bir veri grubu değildirler.
      isIngestable: false,
    }));

    return [...discovered, ...channelResources];
  }, [connection?.providerKey, connection?.resources, baseMappingsQuery.data]);
  const stores = flattenResources(resources);

  // Aktif EDİLEBİLİR olup da hâlâ Pasif olanlar = kullanıcının onayını bekleyenler.
  // Aktif edilemeyen (salt okunur) gruplar sayılmaz; onlar için yapılabilecek bir şey yok.
  const pendingApprovalCount = stores.filter(
    (resource) => resource.isIngestable && resource.ingestionPolicy === INGESTION_POLICY.ViewOnly,
  ).length;
  const sectionPath = kind === 0 ? '/erp/integrations' : '/marketplace/integrations';

  const refresh = async () => {
    if (!connection || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const updated = await integrationConnectionsApi.discover(connection.id);
      await queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
      if (connection.providerKey === 'baselinker') {
        await queryClient.invalidateQueries({ queryKey: ['base-mappings-hub'] });
      }
      const failedResources = flattenResources(updated.resources)
        .filter((resource) => resource.metadata.status === 'error').length;
      if (failedResources > 0) {
        toast.warning(`${failedResources} kaynak alınamadı; başarılı kaynaklar güncellendi.`);
      } else {
        toast.success('Canlı veriler yenilendi.');
      }
    } catch (error) {
      toast.error(`Veriler yenilenemedi: ${describeError(error)}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const testConnection = async () => {
    if (!connection || isTesting) return;
    setIsTesting(true);
    try {
      const result = await integrationConnectionsApi.test(connection.id);
      if (result.success) {
        // Test yalnızca erişimi doğrular, kaynakları DOLDURMAZ. Kullanıcı "test ettim ama
        // içi boş" durumuyla karşılaşmasın diye başarılı testin ardından keşfi de tetikliyoruz.
        toast.success(result.message || 'Bağlantı testi başarılı.');
        await integrationConnectionsApi.discover(connection.id);
        if (connection.providerKey === 'baselinker') {
          await queryClient.invalidateQueries({ queryKey: ['base-mappings-hub'] });
        }
      } else {
        toast.warning(result.message || 'Bağlantı testi başarısız.');
      }
      await queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
    } catch (error) {
      toast.error(`Bağlantı testi başarısız: ${describeError(error)}`);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleActive = async () => {
    if (!connection || isTogglingActive) return;
    const nextActive = !connection.isActive;
    setIsTogglingActive(true);
    try {
      await integrationConnectionsApi.setActive(connection.id, nextActive);
      await queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
      toast.success(nextActive ? 'Bağlantı aktif edildi.' : 'Bağlantı pasif edildi — artık senkron edilmeyecek.');
    } catch (error) {
      toast.error(`Durum değiştirilemedi: ${describeError(error)}`);
    } finally {
      setIsTogglingActive(false);
    }
  };

  // Silme geri alınamaz, bu yüzden onay isteniyor. Sipariş/ürün kayıtları SİLİNMEZ —
  // bunu kullanıcıya açıkça söylüyoruz ki "verilerim gider mi" tereddüdü kalmasın.
  const deleteConnection = async () => {
    if (!connection || isDeleting) return;
    const confirmed = window.confirm(
      `"${connection.displayName}" bağlantısı silinecek.\n\n`
      + 'Bağlantı ayarları ve kayıtlı API bilgileri kaldırılır. '
      + 'Geçmiş sipariş ve ürün kayıtlarınıza DOKUNULMAZ.\n\nDevam edilsin mi?',
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await integrationConnectionsApi.remove(connection.id);
      await queryClient.invalidateQueries({ queryKey: ['integration-connections'] });
      await queryClient.invalidateQueries({ queryKey: ['stores'] });
      toast.success('Bağlantı silindi.');
      router.push(sectionPath);
    } catch (error) {
      toast.error(`Bağlantı silinemedi: ${describeError(error)}`);
      setIsDeleting(false);
    }
  };

  if (connectionsQuery.isLoading) {
    return <div className="p-6 text-xs text-[var(--fg-muted)]">Bağlantı yükleniyor...</div>;
  }

  if (!connection) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
        <Database size={26} className="text-[var(--fg-muted)]" />
        <p className="text-sm font-semibold text-[var(--fg)]">Bağlantı bulunamadı</p>
        <Link href={sectionPath} className="text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]">
          Genel listeye dön
        </Link>
      </div>
    );
  }

  const status = resolveStatus(connection.syncStatus, connection.status);
  // Test/keşif zamanına düşmüyoruz — bu alan asıl VERİ senkronunu temsil eder
  // (bkz. IntegrationsHubView'daki aynı gerekçe).
  const lastSync = resolveLastSync(connection.syncedAt, false);

  return (
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[var(--bg)] p-5 text-[var(--fg)]">
      <div className="flex min-h-full flex-col gap-5 pb-8">
      {/* ── Başlık ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={sectionPath}
            aria-label="Genel listeye dön"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            <ArrowLeft size={15} />
          </Link>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
            <BrandIcon size={24} />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold">{connection.displayName}</h1>
              <span className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_TEXT_CLASS[status]} ${status === 'error' ? 'border-rose-500/20 bg-rose-500/10' : status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10' : status === 'syncing' ? 'border-amber-500/20 bg-amber-500/10' : 'border-[var(--border)] bg-[var(--bg-subtle)]'}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${STATUS_LABEL[status].dot}`} />
                {STATUS_LABEL[status].tr}
              </span>
              {!connection.isActive && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">Pasif</span>
              )}
            </div>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--fg-muted)]">
              <span>{kind === 0 ? 'ERP bağlantı detayı' : 'Pazaryeri bağlantı detayı'} · {connection.providerName}</span>
              <span className="inline-flex items-center gap-1"><Clock size={11} /> Son senkron: {lastSync}</span>
            </p>
            {connection.lastError && (
              <p className="mt-1 max-w-xl truncate text-[10.5px] text-rose-600">Son hata: {connection.lastError}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void testConnection()}
            disabled={isTesting}
            className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold hover:bg-[var(--bg-subtle)] disabled:cursor-wait disabled:opacity-60"
          >
            {isTesting ? <Loader2 size={13} className="animate-spin" /> : <PlugZap size={13} />}
            Test et
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isRefreshing}
            title="Canlı verileri ERP'den/API'den yeniden çeker"
            className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold hover:bg-[var(--bg-subtle)] disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Yenile
          </button>
          <button
            type="button"
            onClick={() => void toggleActive()}
            disabled={isTogglingActive}
            title={connection.isActive ? 'Pasif edildiğinde bu bağlantı hiçbir senkrona/rapora girmez' : 'Bağlantıyı yeniden aktif et'}
            className={`inline-flex h-8 items-center gap-2 rounded-[4px] border px-3 text-xs font-semibold disabled:cursor-wait disabled:opacity-60 ${
              connection.isActive
                ? 'border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)]'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
            }`}
          >
            {isTogglingActive ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
            {connection.isActive ? 'Pasif Et' : 'Aktif Et'}
          </button>
          <button
            type="button"
            onClick={() => void deleteConnection()}
            disabled={isDeleting}
            title="Bağlantıyı ve kayıtlı API bilgilerini kaldırır. Sipariş/ürün kayıtlarına dokunulmaz."
            className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-rose-500/30 bg-rose-500/5 px-3 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-60"
          >
            {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Sil
          </button>
        </div>
      </div>

      {/* ── KPI satırı ── */}
      <div className="grid grid-cols-3 gap-3">
        <KpiTile icon={Boxes} label="Ürün" value={connection.productCount.toLocaleString('tr-TR')} />
        <KpiTile icon={ShoppingCart} label="Sipariş" value={connection.orderCount.toLocaleString('tr-TR')} />
        <KpiTile icon={FolderTree} label="Kaynak" value={stores.length} />
      </div>

      <ConnectionRateHeader
        connection={connection}
        onChanged={() => queryClient.invalidateQueries({ queryKey: ['integration-connections'] })}
      />

      {/* ── Kaynak ağacı (komisyon/KDV oranları + sisteme aktarım kararı) ── */}
      <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-bold"><FolderTree size={14} /> {kind === 0 ? 'Bağlı mağazalar ve hesaplar' : 'Keşfedilen canlı API kaynakları'}</div>
          <span className="text-[11px] font-semibold text-[var(--fg-muted)]">{stores.length} kayıt</span>
        </div>

        {/* ONAY BEKLEYENLER. Her kaynak Pasif başlar; aktif edilebilir olup da hâlâ Pasif olan
            gruplar burada sayılır. Bu uyarı olmadan "veri neden akmıyor?" sorusunun cevabı
            ekranda hiçbir yerde görünmezdi. */}
        {pendingApprovalCount > 0 && (
          <div className="flex items-start gap-2 border-b border-amber-500/25 bg-amber-500/[0.07] px-4 py-2.5">
            <ShieldQuestion size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-4 text-amber-800 dark:text-amber-300">
              <strong>{pendingApprovalCount} veri grubu onay bekliyor.</strong>{' '}
              Bu gruplar sisteme yazılabilir ama şu an Pasif — veriniz akmıyor. Satırı açıp{' '}
              <strong>Aktif</strong> derseniz işlenmeye başlar.
            </p>
          </div>
        )}
        {stores.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-[var(--fg-muted)]">
            {kind === 0
              ? 'Henüz keşfedilmiş mağaza veya hesap bulunmuyor. "Verileri yenile" ile ERP\'den çekebilirsiniz.'
              : 'Bu doğrudan pazaryeri hesabında henüz keşfedilmiş alt kaynak bulunmuyor.'}
          </div>
        ) : (
          <div>
            {resources.map((resource) => (
              <ResourceTreeRow
                key={`${resource.id}-${resource.externalId}`}
                resource={resource}
                connectionId={connection.id}
                depth={0}
                onChanged={() => queryClient.invalidateQueries({ queryKey: ['integration-connections'] })}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Senkron geçmişi grafiği ── */}
      <section className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold"><Activity size={14} /> Son 30 gün</div>
        <SyncHistoryChart history={historyQuery.data} isLoading={historyQuery.isLoading} />
      </section>

      <MarketplaceDataOverview connection={connection} resources={resources} />
      </div>
    </div>
  );
}
