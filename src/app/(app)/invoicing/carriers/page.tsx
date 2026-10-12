'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Truck, Pencil, Trash2, X, Search, RefreshCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { carrierApi, type Carrier } from '../../../../lib/api/carrier';
import { InvoicingSubTabBar } from '../../../../components/layout/InvoicingSubTabBar';
import { toast } from '../../../../lib/toast';
import { useI18n } from '../../../../lib/i18n';

function CarrierFormDialog({ existing, onClose, onSaved }: { existing?: Carrier; onClose: () => void; onSaved: () => void }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [vkn, setVkn] = useState(existing?.vkn ?? '');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [matchKeywords, setMatchKeywords] = useState(existing?.matchKeywords ?? '');
  const [isDefaultFallback, setIsDefaultFallback] = useState(existing?.isDefaultFallback ?? false);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!vkn.trim()) {
      setError(tr ? 'VKN alanı zorunludur.' : 'VKN is required.');
      return;
    }
    if (!title.trim()) {
      setError(tr ? 'Unvan alanı zorunludur.' : 'Title is required.');
      return;
    }

    setSaving(true);
    try {
      const normalizedKeywords = matchKeywords.trim().toLowerCase();
      if (existing) {
        await carrierApi.update(existing.id, {
          vkn: vkn.trim(),
          title: title.trim(),
          matchKeywords: normalizedKeywords,
          isDefaultFallback,
          isActive,
        });
      } else {
        await carrierApi.create({
          vkn: vkn.trim(),
          title: title.trim(),
          matchKeywords: normalizedKeywords,
          isDefaultFallback,
        });
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[var(--fg)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-[var(--fg-muted)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {existing ? (tr ? 'Kargo Firmasını Düzenle' : 'Edit Carrier') : (tr ? 'Yeni Kargo Firması' : 'New Carrier')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 text-xs">
          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs text-rose-600 dark:text-rose-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {tr ? 'VKN *' : 'Tax No. *'}
              </label>
              <input
                value={vkn}
                onChange={(e) => setVkn(e.target.value)}
                placeholder="1234567890"
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
                {tr ? 'Unvan *' : 'Title *'}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Aras Kargo Yurtiçi Taş. A.Ş."
                className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] outline-none focus:border-[var(--fg)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider">
              {tr ? 'Eşleştirme Anahtar Kelimeleri' : 'Match Keywords'}
            </label>
            <input
              value={matchKeywords}
              onChange={(e) => setMatchKeywords(e.target.value)}
              placeholder="aras, aras kargo"
              className="h-8.5 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-3 text-xs text-[var(--fg)] font-mono outline-none focus:border-[var(--fg)]"
            />
            <p className="mt-1 text-[10.5px] text-[var(--fg-muted)]">
              {tr
                ? 'Virgülle ayrılmış, küçük harf — kargo takip verisindeki taşıyıcı adıyla alt dize eşleşmesi için kullanılır.'
                : 'Comma-separated, lowercase — used for substring matching against courier names.'}
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)] pt-1">
            <input
              type="checkbox"
              checked={isDefaultFallback}
              onChange={(e) => setIsDefaultFallback(e.target.checked)}
              className="h-4 w-4 rounded-[3px]"
            />
            <span>{tr ? 'Varsayılan Yedek Taşıyıcı' : 'Default fallback carrier'}</span>
          </label>

          {existing && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[var(--fg)]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded-[3px]"
              />
              <span>{tr ? 'Aktif' : 'Active'}</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-8 items-center rounded-[4px] bg-[var(--fg)] px-4 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : existing ? (tr ? 'Güncelle' : 'Update') : (tr ? 'Kargo Firmasını Kaydet' : 'Save')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function CarriersPage() {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Carrier | null>(null);
  const [deleting, setDeleting] = useState<Carrier | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['carriers', 'all'],
    queryFn: () => carrierApi.list(),
    staleTime: 15_000,
  });

  const carriers = data ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return carriers;
    const lower = search.toLowerCase();
    return carriers.filter(
      (c) => c.vkn.toLowerCase().includes(lower) || c.title.toLowerCase().includes(lower) || c.matchKeywords.toLowerCase().includes(lower)
    );
  }, [data, search]); // eslint-disable-line react-hooks/exhaustive-deps -- `carriers` is a stable derivation of `data`

  const deleteMutation = useMutation({
    mutationFn: (id: number) => carrierApi.remove(id),
    onSuccess: () => {
      toast.success(tr ? 'Kargo firması pasifleştirildi.' : 'Carrier deactivated.');
      void qc.invalidateQueries({ queryKey: ['carriers'] });
      setDeleting(null);
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : (tr ? 'Silinemedi.' : 'Failed to delete.'));
    },
  });

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <InvoicingSubTabBar />

      <div className="flex flex-1 flex-col overflow-y-auto p-5 gap-5">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
          <div className="relative w-64 sm:w-80">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'VKN, Unvan veya Anahtar Kelime Ara...' : 'Search VKN, title or keyword...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder-[var(--fg-muted)] outline-none focus:border-[var(--fg)]"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              title={tr ? 'Yenile' : 'Refresh'}
              className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            >
              <RefreshCw size={13} />
            </button>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-3 text-xs font-bold text-[var(--bg)] shadow-xs hover:opacity-90 transition cursor-pointer"
            >
              <Plus size={13} />
              <span>{tr ? 'Yeni Kargo Firması' : 'New Carrier'}</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/50 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                <tr>
                  <th className="px-4 py-3">{tr ? 'VKN' : 'TAX NO.'}</th>
                  <th className="px-4 py-3">{tr ? 'UNVAN' : 'TITLE'}</th>
                  <th className="px-4 py-3">{tr ? 'ANAHTAR KELİMELER' : 'MATCH KEYWORDS'}</th>
                  <th className="px-4 py-3">{tr ? 'VARSAYILAN' : 'DEFAULT'}</th>
                  <th className="px-4 py-3">{tr ? 'DURUM' : 'STATUS'}</th>
                  <th className="px-4 py-3 text-right">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Kargo firmaları yükleniyor...' : 'Loading carriers...'}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek kargo firması bulunamadı.' : 'No carriers found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-[var(--bg-subtle)]/40 transition">
                      <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">{c.vkn}</td>
                      <td className="px-4 py-3 font-semibold text-[var(--fg)]">{c.title}</td>
                      <td className="px-4 py-3 font-mono text-[var(--fg-muted)]">{c.matchKeywords || '—'}</td>
                      <td className="px-4 py-3">
                        {c.isDefaultFallback && (
                          <span className="inline-flex items-center rounded-[3px] border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10.5px] font-bold text-blue-400">
                            {tr ? 'Varsayılan' : 'Default'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${
                            c.isActive
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                              : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400'
                          }`}
                        >
                          {c.isActive ? (tr ? 'Aktif' : 'Active') : tr ? 'Pasif' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditing(c)}
                            className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
                          >
                            <Pencil size={11} />
                            <span>{tr ? 'Düzenle' : 'Edit'}</span>
                          </button>
                          {c.isActive && (
                            <button
                              type="button"
                              onClick={() => setDeleting(c)}
                              title={tr ? 'Pasifleştir' : 'Deactivate'}
                              className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:text-rose-500 hover:border-rose-500/40 transition cursor-pointer"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {createOpen && (
        <CarrierFormDialog
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            toast.success(tr ? 'Kargo firması eklendi.' : 'Carrier added.');
            void qc.invalidateQueries({ queryKey: ['carriers'] });
          }}
        />
      )}

      {editing && (
        <CarrierFormDialog
          existing={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            toast.success(tr ? 'Kargo firması güncellendi.' : 'Carrier updated.');
            void qc.invalidateQueries({ queryKey: ['carriers'] });
          }}
        />
      )}

      {deleting && (
        <ConfirmDeleteDialog
          carrier={deleting}
          tr={tr}
          pending={deleteMutation.isPending}
          onCancel={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
        />
      )}
    </div>
  );
}

function ConfirmDeleteDialog({
  carrier, tr, pending, onCancel, onConfirm,
}: {
  carrier: Carrier;
  tr: boolean;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-2xl p-5 text-[var(--fg)]"
      >
        <h2 className="text-sm font-bold text-[var(--fg)]">
          {tr ? 'Kargo Firmasını Pasifleştir' : 'Deactivate Carrier'}
        </h2>
        <p className="mt-2 text-xs text-[var(--fg-muted)]">
          {tr
            ? `"${carrier.title}" pasifleştirilecek. Bu firma yeni eşleştirmelerde kullanılmaz, geçmiş kayıtlar etkilenmez.`
            : `"${carrier.title}" will be deactivated. It will no longer be used for new matches; past records are unaffected.`}
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex h-8 items-center rounded-[4px] bg-rose-600 px-4 text-xs font-bold text-white shadow-xs hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {pending ? (tr ? 'Pasifleştiriliyor...' : 'Deactivating...') : tr ? 'Pasifleştir' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
