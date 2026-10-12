'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  Search,
  Check,
  CheckCheck,
  Trash2,
  X,
  RotateCcw,
  ExternalLink,
  Send,
} from 'lucide-react';
import { notificationApi } from '../../lib/api/notification';
import { subscribeToPush } from '../../lib/push';
import { formatDateTime } from '../../lib/format';
import { queryKeys } from '../../lib/query-keys';
import { toast } from '../../lib/toast';
import { useI18n } from '../../lib/i18n';
import { Select, type SelectOption } from '../../components/ui/Select';
import { useAuthStore } from '../../stores/auth';
import { NotificationTypeSettingsPanel } from './NotificationTypeSettingsPanel';

const ADMIN_ROLES = ['admin', 'superadmin'];

export function NotificationsWorkspace() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();
  const isAdmin = useAuthStore((s) => s.user?.roles?.some((r) => ADMIN_ROLES.includes(r.toLowerCase())) ?? false);

  // Filtre State'leri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');

  // Web Push State'i
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission);
    }
  }, []);

  const isPushGranted = permission === 'granted';

  const handleSubscribePush = async () => {
    setPushBusy(true);
    try {
      await subscribeToPush();
      toast.success(lang === 'tr' ? 'Web Push bildirimleri etkinleştirildi.' : 'Web Push notifications enabled.');
    } catch {
      toast.error(lang === 'tr' ? 'Bildirim izni alınamadı.' : 'Failed to enable push notifications.');
    } finally {
      if (typeof Notification !== 'undefined') {
        setPermission(Notification.permission);
      }
      setPushBusy(false);
    }
  };

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: notifications = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => notificationApi.list(),
    staleTime: 0,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.success(lang === 'tr' ? 'Tüm bildirimler okundu olarak işaretlendi.' : 'All marked as read.');
    },
    onError: () => {
      toast.error(lang === 'tr' ? 'İşlem başarısız.' : 'Action failed.');
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => notificationApi.deleteAll(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.success(lang === 'tr' ? 'Tüm bildirimler temizlendi.' : 'All notifications cleared.');
    },
    onError: () => {
      toast.error(lang === 'tr' ? 'Temizleme başarısız.' : 'Clear failed.');
    },
  });

  const triggerTestMutation = useMutation({
    mutationFn: () => notificationApi.triggerTest(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      toast.success(lang === 'tr' ? 'Test bildirimi size gönderildi.' : 'Test notification sent to you.');
    },
    onError: () => {
      toast.error(lang === 'tr' ? 'Test tetiklenemedi.' : 'Test trigger failed.');
    },
  });

  // ── Filtreleme ─────────────────────────────────────────────────────────────
  const typeOptions: SelectOption<string>[] = useMemo(() => [
    { value: 'all', label: lang === 'tr' ? 'Tüm Türler' : 'All Types' },
    { value: 'Anomaly', label: lang === 'tr' ? 'Anomali' : 'Anomaly' },
    { value: 'ConnectMessage', label: lang === 'tr' ? 'Pazaryeri Mesaj' : 'Messages' },
    { value: 'NexusMail', label: lang === 'tr' ? 'ERP / Mail' : 'Nexus Mail' },
    { value: 'RadarReply', label: lang === 'tr' ? 'Radar' : 'Radar' },
    { value: 'General', label: lang === 'tr' ? 'Genel' : 'General' },
  ], [lang]);

  const severityOptions: SelectOption<string>[] = useMemo(() => [
    { value: 'all', label: lang === 'tr' ? 'Tüm Önem Dereceleri' : 'All Severities' },
    { value: 'Critical', label: lang === 'tr' ? 'Kritik (Critical)' : 'Critical' },
    { value: 'Warning', label: lang === 'tr' ? 'Uyarı (Warning)' : 'Warning' },
    { value: 'Info', label: lang === 'tr' ? 'Bilgi (Info)' : 'Info' },
  ], [lang]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (selectedType !== 'all' && n.type !== selectedType) return false;
      if (selectedSeverity !== 'all' && n.severity !== selectedSeverity) return false;
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          n.type.toLowerCase().includes(q) ||
          n.severity.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [notifications, selectedType, selectedSeverity, readFilter, searchQuery]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-y-auto p-4 space-y-3.5 bg-transparent">
      {/* ── Üst Kontrol & Filtre Barı (Doğal Akışta) ─────────────────────────── */}
      <div data-tour="notifications-filters" className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] px-3.5 py-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sol: Arama ve Dropdown Filtreler */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[320px]">
            {/* Arama Input */}
            <div className="relative w-56 max-w-full">
              <Search
                size={12}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'tr' ? 'Bildirim ara...' : 'Search notifications...'}
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

            {/* Tür Dropdown */}
            <Select
              size="sm"
              value={selectedType}
              options={typeOptions}
              onChange={(val) => setSelectedType(val)}
            />

            {/* Önem Seviyesi Dropdown */}
            <Select
              size="sm"
              value={selectedSeverity}
              options={severityOptions}
              onChange={(val) => setSelectedSeverity(val)}
            />

            {/* Okunma Durumu Butonları */}
            <div className="flex items-center rounded-[3px] border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 p-0.5">
              {(['all', 'unread', 'read'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setReadFilter(s)}
                  className={`h-6.5 px-2 text-[10.5px] font-medium rounded-[2px] transition-colors cursor-pointer ${
                    readFilter === s
                      ? 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800'
                  }`}
                >
                  {s === 'all'
                    ? lang === 'tr'
                      ? 'Tümü'
                      : 'All'
                    : s === 'unread'
                    ? lang === 'tr'
                      ? `Okunmamış (${unreadCount})`
                      : `Unread (${unreadCount})`
                    : lang === 'tr'
                    ? 'Okunmuş'
                    : 'Read'}
                </button>
              ))}
            </div>
          </div>

          {/* Sağ: Toplu Aksiyonlar & Yenile */}
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="flex h-7.5 items-center gap-1.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                title={lang === 'tr' ? 'Tümünü Okundu İşaretle' : 'Mark All Read'}
              >
                <CheckCheck size={13} />
                <span>{lang === 'tr' ? 'Tümünü Oku' : 'Mark All Read'}</span>
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm(lang === 'tr' ? 'Tüm bildirimler silinsin mi?' : 'Clear all notifications?')) {
                    deleteAllMutation.mutate();
                  }
                }}
                disabled={deleteAllMutation.isPending}
                className="flex h-7.5 items-center gap-1.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-2.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 transition-colors cursor-pointer"
                title={lang === 'tr' ? 'Tümünü Sil' : 'Clear All'}
              >
                <Trash2 size={12} />
                <span>{lang === 'tr' ? 'Temizle' : 'Clear'}</span>
              </button>
            )}

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

      {/* ── Web Push & Test Çubuğu ─────────────────────────────────────────── */}
      <div data-tour="notifications-push-bar" className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] px-3.5 py-2.5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {isPushGranted ? <Bell size={13} /> : <BellOff size={13} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                Web Push Bildirimleri:
              </span>
              <span
                className={`text-[10.5px] px-1.5 py-0.2 rounded-[2px] border font-semibold ${
                  isPushGranted
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : permission === 'denied'
                    ? 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    : 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                }`}
              >
                {isPushGranted
                  ? lang === 'tr'
                    ? 'Etkin'
                    : 'Enabled'
                  : permission === 'denied'
                  ? lang === 'tr'
                    ? 'Engellendi'
                    : 'Denied'
                  : lang === 'tr'
                  ? 'Kapalı'
                  : 'Disabled'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {lang === 'tr'
                ? 'Yalnız önemli bildirimler, ayarlarda seçilen kişilere push olarak iletilir.'
                : 'Only important notifications are pushed, to the people chosen in settings.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPushGranted && permission !== 'denied' && (
            <button
              type="button"
              onClick={handleSubscribePush}
              disabled={pushBusy}
              className="flex h-7.5 items-center gap-1.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-3 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-xs"
            >
              <Bell size={12} />
              <span>{pushBusy ? 'İşleniyor...' : 'Web Push Aç'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => triggerTestMutation.mutate()}
            disabled={triggerTestMutation.isPending}
            className="flex h-7.5 items-center gap-1.5 rounded-[3px] border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/40 px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-400 transition-colors cursor-pointer"
            title="Yalnız size bir test bildirimi (ve push) gönderir"
          >
            <Send size={11} />
            <span>{triggerTestMutation.isPending ? 'Gönderiliyor...' : 'Test Gönder'}</span>
          </button>
        </div>
      </div>

      {isAdmin && <NotificationTypeSettingsPanel />}

      {/* ── Bildirim Listesi ─────────────────────────────────────────────────── */}
      <div data-tour="notifications-list" className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {lang === 'tr' ? 'Bildirim Listesi' : 'Notification Stream'}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            {filteredNotifications.length} {lang === 'tr' ? 'bildirim' : 'items'}
          </span>
        </div>

        {isLoading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center text-xs text-zinc-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
            <span>{lang === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center p-6 text-center">
            <Bell className="h-8 w-8 text-zinc-300 dark:text-zinc-700 mb-1.5" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {lang === 'tr' ? 'Seçili filtrede bildirim bulunmuyor' : 'No notifications in this filter'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {filteredNotifications.map((n) => {
              const isCrit = n.severity === 'Critical';
              const isWarn = n.severity === 'Warning';

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markAsReadMutation.mutate(n.id);
                  }}
                  className={`group flex items-start justify-between gap-3 p-3 px-3.5 transition-colors cursor-pointer ${
                    n.isRead
                      ? 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30'
                      : 'bg-zinc-50/70 dark:bg-zinc-800/30 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Sol: Okunmamış Noktası & İçerik */}
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className="pt-1 shrink-0">
                      <span
                        className={`block h-2 w-2 rounded-full ${
                          n.isRead
                            ? 'bg-transparent'
                            : isCrit
                            ? 'bg-rose-500 ring-2 ring-rose-500/20'
                            : 'bg-amber-500 ring-2 ring-amber-500/20'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-xs ${
                            n.isRead
                              ? 'font-medium text-zinc-700 dark:text-zinc-300'
                              : 'font-bold text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {n.title}
                        </span>

                        {/* Tür & Önem Rozetleri */}
                        <span className="rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.2 text-[9.5px] font-medium text-zinc-500 dark:text-zinc-400">
                          {n.type}
                        </span>

                        <span
                          className={`rounded-[2px] border px-1.5 py-0.2 text-[9.5px] font-semibold ${
                            isCrit
                              ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/60 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                              : isWarn
                              ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                              : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {n.severity}
                        </span>
                      </div>

                      <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {n.body}
                      </p>

                      <div className="flex items-center gap-3 pt-0.5 text-[10.5px] text-zinc-400 font-mono">
                        <span>{formatDateTime(n.createdAt, 'tr')}</span>

                        {n.url && (
                          <a
                            href={n.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-0.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline font-sans"
                          >
                            <span>Detay</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sağ: Okundu Eylemi */}
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsReadMutation.mutate(n.id);
                      }}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[2px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer"
                      title={lang === 'tr' ? 'Okundu İşaretle' : 'Mark as read'}
                    >
                      <Check size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
