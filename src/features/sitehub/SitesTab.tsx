'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Plug, RefreshCw, PauseCircle, Inbox, BarChart3, Globe } from 'lucide-react';
import { siteHubApi, type SiteConnectionDto } from '../../lib/api/sitehub';
import { ErrorState, StatusDot, formatDateTime } from './shared';
import { SiteFormDialog } from './SiteFormDialog';
import { useFeedback } from '../shared/Feedback';

interface Props {
  onOpenSite: (siteId: number) => void;
}

export function SitesTab({ onOpenSite }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteConnectionDto | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { notify, confirm } = useFeedback();

  const sitesQuery = useQuery({
    queryKey: ['sitehub', 'sites'],
    queryFn: siteHubApi.getSites,
    staleTime: 60_000,
  });
  const sites = sitesQuery.data ?? [];
  const loading = sitesQuery.isLoading;
  const error = sitesQuery.error instanceof Error ? sitesQuery.error.message : null;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['sitehub', 'sites'] });

  const handleDelete = async (site: SiteConnectionDto) => {
    const ok = await confirm({
      title: `"${site.displayName}" bağlantısı silinsin mi?`,
      body: 'Bu siteden yeni talep alınmaz ve API anahtarı silinir. Talebi olan bağlantılar silinemez — bunun yerine pasife alın.',
      confirmLabel: 'Sil',
      danger: true,
    });
    if (!ok) return;

    try {
      await siteHubApi.deleteSite(site.id);
      notify.success('Bağlantı silindi.');
      await refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Bağlantı silinemedi.');
    }
  };

  const handleProbe = async (site: SiteConnectionDto) => {
    setBusyId(site.id);
    try {
      const result = await siteHubApi.probeSite(site.id);
      if (result.success) {
        notify.success(`${site.displayName} bağlantısı çalışıyor. ${result.pendingCount ?? 0} bekleyen talep.`);
      } else {
        notify.error(`${site.displayName}: ${result.error ?? 'Bağlantı kurulamadı.'}`);
      }
      await refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Bağlantı test edilemedi.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSync = async (site: SiteConnectionDto) => {
    setBusyId(site.id);
    try {
      const run = await siteHubApi.syncSite(site.id);
      if (run.success) notify.success(`${site.displayName}: ${run.importedCount} yeni talep alındı.`);
      else notify.error(`${site.displayName}: ${run.error ?? 'Senkron başarısız.'}`);
      await refresh();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Senkron çalıştırılamadı.');
    } finally {
      setBusyId(null);
    }
  };

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (site: SiteConnectionDto) => { setEditing(site); setDialogOpen(true); };

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      {/* Header & New Site Action */}
      <div className="flex flex-wrap items-center justify-between gap-3" data-tour="sitehub-sites-header">
        <div>
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">Bağlı Web Siteleri</h2>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Form ve teklif talebi toplanan e-ticaret ve kurumsal web siteleri.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
        >
          <Plus size={13} />
          <span>Yeni Site Ekle</span>
        </button>
      </div>

      {error && <ErrorState text={error} />}

      {loading && <div className="text-xs text-[var(--fg-muted)] py-6 text-center">Siteler yükleniyor...</div>}

      {!loading && sites.length === 0 && (
        <div className="rounded-[4px] border border-dashed border-[var(--border)] p-12 text-center text-xs text-[var(--fg-muted)]">
          <p className="font-semibold text-sm text-[var(--fg)]">Henüz bağlı web sitesi yok</p>
          <p className="mt-1">Sitenizin API adresini ekleyerek form ve teklif mesajlarını toplamaya başlayın.</p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
          >
            <Plus size={13} /> Yeni Site Ekle
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-tour="sitehub-sites-grid">
        {sites.map((site) => (
          <div
            key={site.id}
            className={`rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs flex flex-col justify-between gap-3 transition ${
              site.isActive ? 'opacity-100' : 'opacity-60'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold text-xs text-[var(--fg)] truncate">{site.displayName}</div>
                  <div className="text-[10.5px] text-[var(--fg-muted)] font-mono truncate mt-0.5">
                    {site.websiteUrl?.replace(/^https?:\/\//, '') ?? site.baseUrl}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleProbe(site)}
                    disabled={busyId === site.id}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
                    title="Bağlantıyı Test Et"
                  >
                    <Plug size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSync(site)}
                    disabled={busyId === site.id}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
                    title="Şimdi Senkronize Et"
                  >
                    <RefreshCw size={12} className={busyId === site.id ? 'animate-spin' : ''} />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(site)}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                    title="Düzenle"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(site)}
                    className="h-6.5 w-6.5 flex items-center justify-center rounded-[3px] border border-[var(--border)] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                    title="Sil"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--border-soft)] pt-2">
                <StatusDot status={site.status} />

                <div className="flex items-center gap-1 text-[10.5px] font-mono text-[var(--fg-muted)]">
                  <Inbox size={11} />
                  <span>{site.pendingRequestCount} yeni talep</span>
                </div>
              </div>

              <div className="text-[10px] text-[var(--fg-muted)] font-mono mt-1">
                Son senkron: {formatDateTime(site.lastSyncedAt)}
              </div>
            </div>

            {site.isPaused && (
              <div className="p-2 rounded-[3px] border border-[var(--border)] bg-[var(--bg-subtle)] text-[10.5px] text-[var(--fg-muted)] flex items-center gap-1.5">
                <PauseCircle size={12} className="shrink-0" />
                <span>{site.pausedReason ?? 'Senkron durduruldu.'}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenSite(site.id)}
              className="w-full h-7 rounded-[3px] border border-[var(--border)] bg-[var(--bg)] text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <BarChart3 size={12} />
              <span>Detay & Trafik İstatistikleri</span>
            </button>
          </div>
        ))}
      </div>

      {dialogOpen && (
        <SiteFormDialog
          site={editing}
          onClose={() => setDialogOpen(false)}
          onSaved={async () => {
            notify.success(editing ? 'Bağlantı güncellendi.' : 'Site eklendi.');
            await refresh();
          }}
        />
      )}
    </div>
  );
}
