'use client';

import { Fragment, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Zap, Trash2, PlayCircle, Link2, Pencil } from 'lucide-react';
import { adsHubApi, type AdAccountDto } from '../../lib/api/adshub';
import type { PendingAdsHubOAuthSession } from '../../stores/workspace-panel';
import { PlatformBadge, AccountStatusDot, TokenExpiryBadge, formatDateTime, ErrorState } from './shared';
import { AccountFormDialog } from './AccountFormDialog';

interface Props {
  focusAccountId: number | null;
  pendingOAuthSession?: PendingAdsHubOAuthSession | null;
  onOAuthSessionConsumed?: () => void;
}

export function AccountsTab({ focusAccountId, pendingOAuthSession = null, onOAuthSessionConsumed }: Props) {
  const queryClient = useQueryClient();
  const [dialogAccount, setDialogAccount] = useState<AdAccountDto | 'new' | null>(null);
  const [oauthSession, setOauthSession] = useState<PendingAdsHubOAuthSession | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    if (!pendingOAuthSession) return;
    setOauthSession(pendingOAuthSession);
    onOAuthSessionConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingOAuthSession]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adshub', 'accounts'],
    queryFn: () => adsHubApi.listAccounts(),
    staleTime: 30_000,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['adshub'] });
  };

  const probe = useMutation({
    mutationFn: (id: number) => adsHubApi.probeAccount(id),
    onMutate: (id) => {
      setBusyId(id);
      setRowError(null);
    },
    onSuccess: (result, id) => {
      if (!result.success) setRowError({ id, message: result.error ?? 'Bağlantı doğrulanamadı.' });
      invalidate();
    },
    onError: (e, id) => setRowError({ id, message: e instanceof Error ? e.message : 'Bağlantı test edilemedi.' }),
    onSettled: () => setBusyId(null),
  });

  const sync = useMutation({
    mutationFn: (id: number) => adsHubApi.syncAccount(id),
    onMutate: (id) => {
      setBusyId(id);
      setRowError(null);
    },
    onSuccess: (run, id) => {
      if (!run.success) setRowError({ id, message: run.error ?? 'Senkron başarısız.' });
      invalidate();
    },
    onError: (e, id) => setRowError({ id, message: e instanceof Error ? e.message : 'Senkron başlatılamadı.' }),
    onSettled: () => setBusyId(null),
  });

  const remove = useMutation({
    mutationFn: (id: number) => adsHubApi.deleteAccount(id),
    onMutate: (id) => setBusyId(id),
    onSuccess: () => invalidate(),
    onError: (e, id) => setRowError({ id, message: e instanceof Error ? e.message : 'Silinemedi.' }),
    onSettled: () => setBusyId(null),
  });

  const accounts = data ?? [];

  return (
    <div className="w-full flex-1 p-4 sm:p-5 flex flex-col gap-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3" data-tour="adshub-accounts-header">
        <div>
          <div className="flex items-center gap-2">
            <Link2 size={16} className="text-[var(--fg-muted)]" />
            <h3 className="text-sm font-bold text-[var(--fg)]">Bağlı Reklam Hesapları & Entegrasyonlar</h3>
          </div>
          <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
            Meta, Google ve TikTok reklam hesaplarınızı bağlayın, ERP mağaza eşleştirmelerini yönetin.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDialogAccount('new')}
          className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
        >
          <Plus size={13} />
          <span>Yeni Hesap Bağla</span>
        </button>
      </div>

      {isError && <ErrorState />}

      {!isError && (
        <div className="flex-1 min-h-0 flex flex-col rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden" data-tour="adshub-accounts-table">
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-3.5 py-2.5">Hesap Adı</th>
                  <th className="px-3.5 py-2.5">Platform</th>
                  <th className="px-3.5 py-2.5">ERP Kaynağı</th>
                  <th className="px-3.5 py-2.5">Bağlantı Durumu</th>
                  <th className="px-3.5 py-2.5">Son Senkron</th>
                  <th className="px-3.5 py-2.5">Aktif / Toplam Kampanya</th>
                  <th className="px-3.5 py-2.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-[var(--fg-muted)]">
                      Yükleniyor…
                    </td>
                  </tr>
                )}
                {!isLoading && accounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-[var(--fg-muted)]">
                      Henüz bağlı reklam hesabı bulunmuyor. &quot;Yeni Hesap Bağla&quot; butonuna basarak başlayın.
                    </td>
                  </tr>
                )}
                {accounts.map((a) => (
                  <Fragment key={a.id}>
                    <tr
                      className={`hover:bg-[var(--bg-subtle)]/30 transition ${
                        a.id === focusAccountId ? 'bg-[var(--bg-subtle)]/60 font-semibold' : ''
                      }`}
                    >
                      <td className="px-3.5 py-2.5">
                        <div className="font-bold text-[var(--fg)]">{a.displayName}</div>
                        <div className="text-[10.5px] font-mono text-[var(--fg-muted)]">
                          {a.externalAccountId} • {a.currencyCode}
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <PlatformBadge platform={a.platform} />
                      </td>

                      <td className="px-3.5 py-2.5 text-[11.5px] text-[var(--fg)]">
                        {a.erpSourceCodes.length > 0 ? (
                          <span className="font-semibold">{a.erpSourceCodes.join(', ')}</span>
                        ) : (
                          <span className="text-[var(--fg-muted)]">— (Tüm kaynaklar)</span>
                        )}
                      </td>

                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <AccountStatusDot status={a.status} />
                          {a.isPaused && (
                            <span className="text-[10.5px] text-amber-500 font-semibold">({a.pausedReason})</span>
                          )}
                          <TokenExpiryBadge expiresAt={a.tokenExpiresAt} />
                        </div>
                      </td>

                      <td className="px-3.5 py-2.5 text-[var(--fg-muted)] font-mono text-[11px]">
                        {formatDateTime(a.lastSyncedAt)}
                      </td>

                      <td className="px-3.5 py-2.5 font-mono">
                        <span className="font-bold text-[var(--fg)]">{a.activeCampaignCount}</span> /{' '}
                        <span className="text-[var(--fg-muted)]">{a.campaignCount}</span>
                      </td>

                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Bağlantıyı Test Et"
                            onClick={() => probe.mutate(a.id)}
                            disabled={busyId === a.id}
                            className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
                          >
                            <Zap size={12} />
                          </button>
                          <button
                            type="button"
                            title="Şimdi Senkronize Et"
                            onClick={() => sync.mutate(a.id)}
                            disabled={busyId === a.id}
                            className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer disabled:opacity-40"
                          >
                            <RefreshCw size={12} className={busyId === a.id ? 'animate-spin' : ''} />
                          </button>
                          {a.isPaused && (
                            <button
                              type="button"
                              title="Devam Ettir"
                              onClick={() => setDialogAccount(a)}
                              className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition cursor-pointer"
                            >
                              <PlayCircle size={12} />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Düzenle"
                            onClick={() => setDialogAccount(a)}
                            className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          >
                            <Pencil size={11} />
                            <span>Düzenle</span>
                          </button>
                          <button
                            type="button"
                            title="Sil"
                            onClick={() => {
                              if (confirm(`"${a.displayName}" bağlantısını silmek istediğinize emin misiniz?`)) {
                                remove.mutate(a.id);
                              }
                            }}
                            disabled={busyId === a.id}
                            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-40"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {rowError?.id === a.id && (
                      <tr>
                        <td colSpan={7} className="px-3.5 py-1.5 bg-rose-500/10 text-rose-500 text-[11px]">
                          {rowError.message}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dialogAccount !== null && (
        <AccountFormDialog
          account={dialogAccount === 'new' ? null : dialogAccount}
          onClose={() => setDialogAccount(null)}
          onSaved={invalidate}
        />
      )}

      {dialogAccount === null && oauthSession !== null && (
        <AccountFormDialog
          account={null}
          oauthSession={oauthSession}
          onClose={() => setOauthSession(null)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
