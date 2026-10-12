'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCheck, Trash2, ChevronRight } from 'lucide-react';
import { notificationApi } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useMobile } from '../../hooks/useMobile';
import { useNotificationPanel } from '../../stores/notification-panel';
import type { WorkspaceKey } from '../../stores/workspace-panel';
import { workspaceRoute } from '../../lib/workspace-routes';
import { toast } from '../../lib/toast';
import { describeError } from '../../lib/errors';
import type { NotificationDto } from '../../lib/api/notification';
import { notificationCategory, type NotificationCategory } from './notification-categories';

const WORKSPACE_URL_PREFIX = 'workspace:';
const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function NotificationPanel() {
  const { lang } = useI18n();
  const isTr = lang === 'tr';
  const router = useRouter();
  const isMobile = useMobile();
  const qc = useQueryClient();
  const { open, closePanel } = useNotificationPanel();
  const [filterCat, setFilterCat] = useState<'all' | NotificationCategory>('all');

  function handleNotificationClick(url: string | null | undefined) {
    if (!url) return;
    closePanel();
    if (url.startsWith(WORKSPACE_URL_PREFIX)) {
      // Modülün GERÇEK rotasına gider — eskiden yalnızca panel state'ini
      // değiştirip adresi hiç değiştirmiyordu (yenilemede kaybolan bir panel).
      router.push(workspaceRoute(url.slice(WORKSPACE_URL_PREFIX.length) as WorkspaceKey));
    } else {
      router.push(url);
    }
  }

  const { data: notifications = [] } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: notificationApi.list,
    refetchInterval: 60_000,
  });

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  async function handleMarkAsRead(id: number) {
    try {
      await notificationApi.markAsRead(id);
      qc.setQueryData(NOTIFICATIONS_QUERY_KEY, (prev: NotificationDto[] | undefined) =>
        (prev ?? []).map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (e) {
      console.error('Failed to mark notification as read:', e);
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationApi.markAllAsRead();
      qc.setQueryData(NOTIFICATIONS_QUERY_KEY, (prev: NotificationDto[] | undefined) =>
        (prev ?? []).map((n) => ({ ...n, isRead: true }))
      );
    } catch (e) {
      toast.error(describeError(e));
    }
  }

  async function handleDeleteAll() {
    try {
      await notificationApi.deleteAll();
      qc.setQueryData(NOTIFICATIONS_QUERY_KEY, []);
    } catch (e) {
      console.error('Failed to delete all notifications:', e);
    }
  }

  if (!open) return null;

  return (
    <>
      {/* ── Karartma Katmanı ── */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={closePanel}
      />

      {/* ── Bildirim Çekmecesi (Keskin Kenar, %100 Tailwind) ── */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 flex flex-col border-l border-[var(--border)] bg-[var(--card)] shadow-2xl transition-transform duration-200 ${
          isMobile ? 'w-full' : 'w-[440px]'
        }`}
      >
        {/* ── Başlık ── */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-soft)] px-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            {isTr ? 'BİLDİRİM MERKEZİ' : 'NOTIFICATION CENTER'}
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--fg-muted)]">
              {unreadCount === 0
                ? (isTr ? 'Tümü Okundu' : 'All Read')
                : `${unreadCount} ${isTr ? 'okunmamış' : 'unread'}`}
            </span>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="inline-flex h-6 items-center gap-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 text-[10.5px] font-semibold text-[var(--fg)] transition hover:bg-[var(--card-hover)]"
                title={isTr ? 'Tümünü okundu işaretle' : 'Mark all as read'}
              >
                <CheckCheck size={12} />
                <span>{isTr ? 'Tümü' : 'All'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={closePanel}
              className="flex h-6 w-6 items-center justify-center rounded-[3px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ── Kategori Sekmeleri ── */}
        <div className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 p-2 px-3">
          {([
            { key: 'all', label: isTr ? 'Tümü' : 'All' },
            { key: 'order', label: isTr ? 'Sipariş' : 'Orders' },
            { key: 'stock', label: isTr ? 'Stok' : 'Stock' },
            { key: 'system', label: isTr ? 'Sistem' : 'System' },
            { key: 'ai', label: 'AI & Anomali' },
            { key: 'personal', label: isTr ? 'Bana Özel' : 'Personal' },
          ] as const).map((catItem) => {
            const active = filterCat === catItem.key;
            return (
              <button
                key={catItem.key}
                type="button"
                onClick={() => setFilterCat(catItem.key)}
                className={`shrink-0 rounded-[4px] px-2.5 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] shadow-xs'
                    : 'border border-transparent text-[var(--fg-muted)] hover:text-[var(--fg)]'
                }`}
              >
                {catItem.label}
              </button>
            );
          })}
        </div>

        {/* ── Bildirim Listesi ── */}
        <div className="flex-1 overflow-y-auto p-2">
          {(() => {
            // Kategori tipin KENDİ bilgisinden gelir; başlık metninden tahmin edilmez.
            const filteredNotifications = notifications.filter(
              (n) => filterCat === 'all' || notificationCategory(n.type) === filterCat
            );

            if (filteredNotifications.length === 0) {
              return (
                <div className="p-10 text-center text-xs text-[var(--fg-muted)]">
                  {isTr ? 'Bu kategoride bildirim bulunmuyor.' : 'No notifications in this category.'}
                </div>
              );
            }

            return filteredNotifications.map((n) => {
              const dateText = new Date(n.createdAt).toLocaleTimeString(isTr ? 'tr-TR' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) handleMarkAsRead(n.id);
                    handleNotificationClick(n.url);
                  }}
                  className={`group relative mb-1 flex cursor-pointer gap-2.5 rounded-[4px] border p-2.5 transition ${
                    n.isRead
                      ? 'border-[var(--border-soft)] bg-transparent hover:bg-[var(--bg-subtle)]/50'
                      : 'border-[var(--border)] bg-[var(--bg-subtle)]/70 hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-xs text-[var(--fg)] ${n.isRead ? 'font-medium' : 'font-bold'}`}>
                        {n.title}
                      </p>
                      <span className="shrink-0 font-mono text-[10.5px] text-[var(--fg-muted)]">{dateText}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
                      {n.body}
                    </p>
                  </div>

                  {!n.isRead && (
                    <span className="absolute top-2.5 right-2 h-1.5 w-1.5 rounded-full bg-[var(--fg)]" />
                  )}
                </div>
              );
            });
          })()}
        </div>

        {/* ── Alt Bar ── */}
        <div className="flex h-11 shrink-0 items-center justify-between border-t border-[var(--border-soft)] bg-[var(--card)] px-3">
          <button
            type="button"
            onClick={() => { closePanel(); router.push('/system/notifications'); }}
            className="inline-flex items-center gap-1 text-xs font-bold text-[var(--fg)] transition hover:opacity-80"
          >
            <span>{isTr ? 'Tüm Bildirimleri Gör' : 'See all notifications'}</span>
            <ChevronRight size={13} />
          </button>

          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-red-500"
              title={isTr ? 'Tümünü Temizle' : 'Clear All'}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
