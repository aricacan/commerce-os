'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Send,
  Trash2,
  Pencil,
  Plus,
  X,
  Search,
  RotateCcw,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { feedbackApi } from '../../lib/api/feedback';
import { formatDateTime } from '../../lib/format';
import type { FeedbackStatus } from '../../types/api';
import { toast } from '../../lib/toast';
import { useI18n } from '../../lib/i18n';
import { Select, type SelectOption } from '../../components/ui/Select';

const STATUS_OPTIONS: SelectOption<FeedbackStatus>[] = [
  { value: 'New', label: 'Yeni' },
  { value: 'InProgress', label: 'İşleniyor' },
  { value: 'Done', label: 'Tamamlandı' },
  { value: 'Rejected', label: 'Reddedildi' },
];

export function FeedbackWorkspace() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: items = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['feedback'],
    queryFn: () => feedbackApi.list(),
    staleTime: 0,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['feedback'] });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (message: string) => feedbackApi.create(message),
    onSuccess: () => {
      setDraft('');
      setShowCreateModal(false);
      invalidate();
      toast.success(lang === 'tr' ? 'Talebiniz iletildi.' : 'Feedback submitted.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Gönderilemedi.');
    },
  });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: FeedbackStatus }) =>
      feedbackApi.updateStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success(lang === 'tr' ? 'Durum güncellendi.' : 'Status updated.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Güncellenemedi.');
    },
  });

  const editMsgMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      feedbackApi.updateMessage(id, message),
    onSuccess: () => {
      setEditId(null);
      invalidate();
      toast.success(lang === 'tr' ? 'Geri bildirim güncellendi.' : 'Feedback updated.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Güncellenemedi.');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => feedbackApi.remove(id),
    onSuccess: () => {
      invalidate();
      setDeleteConfirmId(null);
      toast.success(lang === 'tr' ? 'Geri bildirim silindi.' : 'Feedback deleted.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Silinemedi.');
    },
  });

  // ── Filtreleme ─────────────────────────────────────────────────────────────
  const filterOptions: SelectOption<string>[] = useMemo(() => [
    { value: 'all', label: lang === 'tr' ? 'Tüm Durumlar' : 'All Statuses' },
    { value: 'New', label: 'Yeni' },
    { value: 'InProgress', label: 'İşleniyor' },
    { value: 'Done', label: 'Tamamlandı' },
    { value: 'Rejected', label: 'Reddedildi' },
  ], [lang]);

  const filteredItems = useMemo(() => {
    return items.filter((f) => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          f.message.toLowerCase().includes(q) ||
          f.authorName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      new: items.filter((i) => i.status === 'New').length,
      inProgress: items.filter((i) => i.status === 'InProgress').length,
      done: items.filter((i) => i.status === 'Done').length,
    };
  }, [items]);

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-y-auto p-4 space-y-3.5 bg-transparent">
      {/* ── Üst Kontrol & Filtre Barı ─────────────────────────────────────────── */}
      <div data-tour="feedback-toolbar" className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] px-3.5 py-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sol: Arama, Durum Dropdown ve Yeni Talep Butonu */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* Arama Input */}
            <div className="relative w-52 max-w-full">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'tr' ? 'Geri bildirim ara...' : 'Search feedback...'}
                className="h-7.5 w-full rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 pl-7.5 pr-6 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Durum Dropdown */}
            <Select
              size="sm"
              value={statusFilter}
              options={filterOptions}
              onChange={(val) => setStatusFilter(val)}
            />

            {/* Yeni Talep Oluştur Butonu (Tüm Durumların Yanında) */}
            <button
              data-tour="feedback-new-btn"
              type="button"
              onClick={() => {
                setDraft('');
                setShowCreateModal(true);
              }}
              className="flex h-7.5 items-center gap-1.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-xs"
            >
              <Plus size={12} />
              <span>{lang === 'tr' ? 'Yeni Talep Oluştur' : 'New Request'}</span>
            </button>
          </div>

          {/* Sağ: Sayaçlar & Yenile */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>
                {lang === 'tr' ? 'Toplam:' : 'Total:'}{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">{counts.total}</strong>
              </span>
              <span>·</span>
              <span>
                {lang === 'tr' ? 'Yeni:' : 'New:'}{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">{counts.new}</strong>
              </span>
              <span>·</span>
              <span>
                {lang === 'tr' ? 'Tamamlanan:' : 'Done:'}{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">{counts.done}</strong>
              </span>
            </div>

            <button
              onClick={() => refetch()}
              className="flex h-7.5 w-7.5 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title={lang === 'tr' ? 'Yenile' : 'Refresh'}
            >
              <RotateCcw size={12} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Geri Bildirim Listesi ────────────────────────────────────────────── */}
      <div data-tour="feedback-list" className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {lang === 'tr' ? 'Geri Bildirimler & Talepler' : 'Feedback & Requests'}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            {filteredItems.length} {lang === 'tr' ? 'kayıt' : 'entries'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-zinc-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
            <span>{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <MessageSquare className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-1.5" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {lang === 'tr' ? 'Kayıt bulunamadı' : 'No feedback found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
            {filteredItems.map((f) => (
              <div
                key={f.id}
                className="flex flex-col justify-between gap-2.5 p-3 rounded-[3px] border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-2xs"
              >
                {/* Kart Başlığı: Yazar + Durum Dropdown */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      {f.authorName}
                    </span>
                    {f.isMine && (
                      <span className="text-[9.5px] font-semibold px-1 py-0.2 rounded-[2px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
                        {lang === 'tr' ? 'Siz' : 'You'}
                      </span>
                    )}
                  </div>

                  <Select
                    size="sm"
                    value={f.status}
                    options={STATUS_OPTIONS}
                    onChange={(newStatus) =>
                      setStatusMutation.mutate({ id: f.id, status: newStatus as FeedbackStatus })
                    }
                  />
                </div>

                {/* Mesaj İçeriği */}
                {editId === f.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="w-full p-2 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
                    />
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditId(null)}
                        className="h-6.5 px-2 rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 text-[11px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 cursor-pointer"
                      >
                        {lang === 'tr' ? 'İptal' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          editText.trim() &&
                          editMsgMutation.mutate({ id: f.id, message: editText.trim() })
                        }
                        disabled={editMsgMutation.isPending}
                        className="h-6.5 px-2.5 rounded-[2px] border border-zinc-300 dark:border-zinc-700 bg-zinc-800 dark:bg-zinc-700 text-[11px] font-semibold text-white cursor-pointer"
                      >
                        {lang === 'tr' ? 'Kaydet' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap flex-1">
                    {f.message}
                  </p>
                )}

                {/* Kart Altı: Zaman & İşlemler */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60 text-[10.5px] text-zinc-400 font-mono">
                  <span>{formatDateTime(f.createdAt, 'tr')}</span>
                  {editId !== f.id && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(f.id);
                          setEditText(f.message);
                        }}
                        className="h-6 w-6 flex items-center justify-center rounded-[2px] text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={lang === 'tr' ? 'Düzenle' : 'Edit'}
                      >
                        <Pencil size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(f.id)}
                        className="h-6 w-6 flex items-center justify-center rounded-[2px] text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title={lang === 'tr' ? 'Sil' : 'Delete'}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL: Yeni Talep Oluştur ───────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                {lang === 'tr' ? 'Yeni Talep / Geri Bildirim Oluştur' : 'Create New Request / Feedback'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) {
                  createMutation.mutate(draft.trim());
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 uppercase mb-1">
                  {lang === 'tr' ? 'Geri Bildirim / Talep Mesajı *' : 'Feedback Message *'}
                </label>
                <textarea
                  required
                  rows={4}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={lang === 'tr' ? 'Bir problem, sistem eksikliği veya öneri yazın...' : 'Describe an issue, feature request, or feedback...'}
                  className="w-full resize-y min-h-[90px] p-2.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  {lang === 'tr' ? 'İptal' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={!draft.trim() || createMutation.isPending}
                  className="flex h-8 items-center gap-1.5 rounded-[3px] border border-zinc-300 dark:border-zinc-700 bg-zinc-800 dark:bg-zinc-700 px-4 text-xs font-semibold text-white hover:bg-zinc-700 dark:hover:bg-zinc-600 transition-colors cursor-pointer shadow-xs disabled:opacity-40"
                >
                  {createMutation.isPending ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Send size={11} />
                  )}
                  <span>{createMutation.isPending ? (lang === 'tr' ? 'Gönderiliyor...' : 'Sending...') : (lang === 'tr' ? 'Talebi Gönder' : 'Submit')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Silme Onayı ──────────────────────────────────────────────── */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-5 shadow-xl space-y-3.5">
            <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {lang === 'tr' ? 'Geri Bildirimi Sil' : 'Delete Feedback'}
            </h2>

            <p className="text-xs text-zinc-500 leading-relaxed">
              {lang === 'tr'
                ? 'Bu geri bildirim kaydını silmek istediğinizden emin misiniz?'
                : 'Are you sure you want to delete this feedback entry?'}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="h-7.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                {lang === 'tr' ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={removeMutation.isPending}
                onClick={() => removeMutation.mutate(deleteConfirmId)}
                className="h-7.5 rounded-[3px] border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
              >
                {removeMutation.isPending
                  ? lang === 'tr'
                    ? 'Siliniyor...'
                    : 'Deleting...'
                  : lang === 'tr'
                  ? 'Sil'
                  : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
