'use client';

import { formatDateTime } from '@/lib/format';
import { useState } from 'react';
import { Database, Globe, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  omnichannelCatalogApi, CATALOG_SITE_KIND,
  type CatalogSiteSourceDto, type CatalogSiteSourceSaveBody, type CatalogSourceDto,
} from '../../lib/api/omnichannel-catalog';
import { CountryFlag } from '../../components/ui/CountryFlag';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { SiteSourceEditor } from './SiteSourceEditor';
import { SiteSyncStatus } from './SiteSyncStatus';
import { useCatalogProfiles } from './useCatalogProfiles';
import { useOmnichannelCountries } from './useOmnichannelCountries';

type EditorState = { mode: 'closed' } | { mode: 'new' } | { mode: 'edit'; source: CatalogSiteSourceDto };

// Hesap geneli › Veri kaynakları: botun ürün/fiyat/stok okuyabileceği kaynaklar.
//  • ERP kaynakları salt okunur (ekleme/düzenleme ERP ekranında).
//  • Web sitesi kaynakları (Shopify) burada yönetilir; ERP ekranlarına hiç karışmaz.
export function CatalogSourcesTab() {
  const { sources, siteSources, loading, error, reload } = useCatalogProfiles();
  const { countries } = useOmnichannelCountries();
  const [editor, setEditor] = useState<EditorState>({ mode: 'closed' });
  const [saving, setSaving] = useState(false);
  const { notify, confirm } = useFeedback();

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      notify.success(success);
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    }
  };

  const handleSave = async (body: CatalogSiteSourceSaveBody) => {
    setSaving(true);
    try {
      if (editor.mode === 'edit') await omnichannelCatalogApi.updateSite(editor.source.id, body);
      else await omnichannelCatalogApi.createSite(body);
      notify.success(editor.mode === 'edit' ? `${body.name} kaydedildi.` : `${body.name} eklendi; ürünler arka planda çekiliyor.`);
      setEditor({ mode: 'closed' });
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (site: CatalogSiteSourceDto) => {
    const ok = await confirm({
      title: `"${site.name}" silinsin mi?`,
      body: 'Siteden çekilen ürün kayıtları da silinir. Bir profil bu kaynağı kullanıyorsa silinmez.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (ok) await run(() => omnichannelCatalogApi.deleteSite(site.id), `${site.name} silindi.`);
  };

  const toggleActive = (site: CatalogSiteSourceDto) => run(
    () => omnichannelCatalogApi.updateSite(site.id, { ...toSaveBody(site), isActive: !site.isActive }),
    site.isActive ? `${site.name} pasife alındı.` : `${site.name} açıldı.`);

  return (
    <div className="flex w-full flex-1 flex-col gap-5 p-4 text-xs sm:p-5">
      <div>
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[var(--fg-muted)]" />
          <h2 className="text-sm font-bold text-[var(--fg)]">Veri Kaynakları</h2>
        </div>
        <p className="mt-0.5 text-[11px] text-[var(--fg-muted)]">
          Botun ürün, fiyat, stok ve link okuyabileceği kaynaklar. Hangi kanalın hangisini kullanacağı Kaynak Profilleri&apos;nde seçilir.
        </p>
      </div>

      {error && <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>}
      {loading && <div className="py-4 text-center text-[var(--fg-muted)]">Kaynaklar yükleniyor…</div>}

      {!loading && (
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--fg)]">
              <Globe size={13} className="text-[var(--fg-muted)]" /> Web sitesi kaynakları
            </h3>
            {editor.mode === 'closed' && (
              <button type="button" onClick={() => setEditor({ mode: 'new' })}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] hover:opacity-90">
                <Plus size={13} /> Site Ekle
              </button>
            )}
          </div>

          {editor.mode !== 'closed' && (
            <SiteSourceEditor
              key={editor.mode === 'edit' ? editor.source.id : 'new'}
              initial={editor.mode === 'edit' ? editor.source : null}
              countries={countries}
              saving={saving}
              onSave={(body) => void handleSave(body)}
              onCancel={() => setEditor({ mode: 'closed' })}
            />
          )}

          {siteSources.length === 0 && editor.mode === 'closed' ? (
            <div className="rounded-[4px] border border-dashed border-[var(--border)] p-6 text-center text-[var(--fg-muted)]">
              Henüz site kaynağı yok. Shopify mağazası ya da web sitesi ekleyince bot fiyat, stok ve linki oradan söyleyebilir.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
              {siteSources.map((site) => (
                <SiteRow
                  key={site.id}
                  site={site}
                  onSync={() => void run(() => omnichannelCatalogApi.syncSite(site.id), 'Çekme başladı; birkaç dakika sürebilir.')}
                  onEdit={() => setEditor({ mode: 'edit', source: site })}
                  onToggle={() => void toggleActive(site)}
                  onDelete={() => void handleDelete(site)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && (
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--fg)]">
            <Database size={13} className="text-[var(--fg-muted)]" /> ERP kaynakları
            <span className="font-normal text-[var(--fg-muted)]">(ekleme ve düzenleme ERP ekranında)</span>
          </h3>
          {sources.length === 0 ? (
            <div className="rounded-[4px] border border-dashed border-[var(--border)] p-6 text-center text-[var(--fg-muted)]">
              Henüz ERP kaynağı yok.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
              {sources.map((s) => <ErpRow key={s.id} source={s} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function toSaveBody(site: CatalogSiteSourceDto): CatalogSiteSourceSaveBody {
  return {
    name: site.name, country: site.country, baseUrl: site.baseUrl, currency: site.currency,
    syncIntervalHours: site.syncIntervalHours, isActive: site.isActive,
    kind: site.kind === CATALOG_SITE_KIND.Website ? CATALOG_SITE_KIND.Website : CATALOG_SITE_KIND.Shopify,
    scrapeConfig: site.scrapeConfig ?? null,
    useForUnprofiledChannels: site.useForUnprofiledChannels ?? false,
  };
}

function formatSync(at: string | null): string {
  return at ? formatDateTime(at, 'tr', { dateStyle: 'short', timeStyle: 'short' }) : 'Hiç çekilmedi';
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-semibold ${
      active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
    }`}>
      {active ? 'Aktif' : 'Pasif'}
    </span>
  );
}

const iconButton =
  'flex h-6.5 w-6.5 items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]';

function SiteRow({ site, onSync, onEdit, onToggle, onDelete }: {
  site: CatalogSiteSourceDto;
  onSync: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const syncing = site.syncStatus === 'Syncing';
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-bold text-[var(--fg)]">
          <CountryFlag code={site.country} size={18} />
          <span className="truncate">{site.name}</span>
          {site.useForUnprofiledChannels && (
            <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)]"
              title="Profil seçilmemiş kanallar da fiyat ve linki buradan söyler">
              Varsayılan
            </span>
          )}
        </span>
        <span className="truncate text-[11px] text-[var(--fg-muted)]">
          {site.kind} · {site.baseUrl} · {site.currency} · {site.activeItems.toLocaleString('tr-TR')} ürün
          {site.lastSkippedCount ? ` · ${site.lastSkippedCount} atlandı (stok kodu yok/tekrar)` : ''}
          {' · '}Son çekme: {syncing ? 'çekiliyor…' : formatSync(site.lastSyncAt)}
        </span>
        <SiteSyncStatus site={site} />
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onToggle} title={site.isActive ? 'Pasife al' : 'Aç'}>
          <StatusBadge active={site.isActive} />
        </button>
        <button type="button" title="Şimdi çek" onClick={onSync} disabled={syncing || !site.isActive}
          className={`${iconButton} disabled:opacity-40`}>
          <RefreshCw size={12} />
        </button>
        <button type="button" title="Düzenle" onClick={onEdit} className={iconButton}>
          <Pencil size={12} />
        </button>
        <button type="button" title="Sil" onClick={onDelete}
          className={`${iconButton} hover:bg-rose-500/10 hover:text-rose-500`}>
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

function ErpRow({ source }: { source: CatalogSourceDto }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2 font-bold text-[var(--fg)]">
          <CountryFlag code={source.country} size={18} />
          <span className="truncate">{source.displayName}</span>
        </span>
        <span className="text-[11px] text-[var(--fg-muted)]">
          {source.kind} · {source.brandName} · {source.activeProducts.toLocaleString('tr-TR')} aktif ürün · Son çekme: {formatSync(source.lastSyncAt)}
        </span>
        {source.lastError && (
          <span className="truncate text-[11px] text-rose-500" title={source.lastError}>{source.lastError}</span>
        )}
      </div>
      <StatusBadge active={source.isActive} />
    </div>
  );
}
