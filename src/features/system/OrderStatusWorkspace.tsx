'use client';

import { useEffect, useState } from 'react';
import { Lock, Mail, MessageSquare, Bell, ChevronRight } from 'lucide-react';
import { orderStatusesApi, type OperationStatus } from '@/lib/api/orderStatuses';
import { OldOrderCompletionCard } from './OldOrderCompletionCard';
import { OrderAutoLifecycleCard } from './OrderAutoLifecycleCard';
import { OrderLifecycleTable } from './OrderLifecycleTable';

/** Saf sıralama — test edilebilirlik için bileşenden ayrı (bkz. FAZ 1 `buildCan` kalıbı). */
export function sortStatuses(statuses: readonly OperationStatus[]): OperationStatus[] {
  return [...statuses].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name, 'tr');
  });
}

const NOTIFY_FIELDS = [
  ['notifyEmail', 'E-posta', Mail],
  ['notifySlack', 'Slack', MessageSquare],
  ['notifyPush', 'Push', Bell],
] as const;

export function OrderStatusWorkspace() {
  const [statuses, setStatuses] = useState<OperationStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  async function reload() {
    try {
      setStatuses(sortStatuses(await orderStatusesApi.list()));
      setError(null);
    } catch {
      setError('Durumlar yüklenemedi.');
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  async function toggleNotify(
    status: OperationStatus,
    field: 'notifyEmail' | 'notifySlack' | 'notifyPush',
  ) {
    setSavingId(status.id);
    try {
      await orderStatusesApi.update(status.id, { ...status, [field]: !status[field] });
      await reload();
    } catch {
      setError('Kaydedilemedi.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 md:p-6 gap-4 bg-transparent">
      {/* Top Header */}
      <div data-tour="order-statuses-header" className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-sm font-bold text-[var(--fg)]">Sipariş Durumları & Bildirim Akışı</h1>
          <p className="text-xs text-[var(--fg-muted)] mt-0.5">
            Dahili operasyonel sipariş durumları ve kanallara göre tetiklenen anlık bildirimler.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-[4px] bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-500">
          {error}
        </div>
      )}

      <OrderLifecycleTable />

      <OrderAutoLifecycleCard />

      <OldOrderCompletionCard />

      <button
        type="button"
        aria-expanded={advancedOpen}
        onClick={() => setAdvancedOpen((open) => !open)}
        className="flex max-w-4xl cursor-pointer items-center gap-2 text-left text-xs font-bold text-[var(--fg-muted)] hover:text-[var(--fg)]"
      >
        <ChevronRight size={14} className={advancedOpen ? 'rotate-90 transition' : 'transition'} />
        Gelişmiş: dahili operasyon durumları (şu an siparişlerde kullanılmıyor)
      </button>
      {advancedOpen && (
        <p className="max-w-4xl text-[11px] text-[var(--fg-muted)]">
          Bu liste eski dahili durum sistemidir; siparişler artık yukarıdaki yaşam döngüsüyle ilerler.
          Durumlar silinmedi, istenirse bildirim ayarları burada yönetilmeye devam eder.
        </p>
      )}

      {/* Statuses List */}
      <div data-tour="order-statuses-list" className="flex max-w-4xl flex-col gap-2.5">
        {advancedOpen && statuses.map((status) => (
          <div
            key={status.id}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3.5 shadow-xs transition hover:border-[var(--border)] ${
              status.isActive ? '' : 'opacity-50'
            }`}
          >
            {/* Status Info */}
            <div className="flex items-center gap-3">
              <span
                className="h-3 w-3 rounded-full shrink-0 shadow-xs ring-2 ring-black/5 dark:ring-white/10"
                style={{ backgroundColor: status.color || 'var(--fg-muted)' }}
                aria-hidden
              />
              <span className="text-xs font-bold text-[var(--fg)]">{status.name}</span>

              {status.isDefault && (
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--fg-muted)]">
                  <Lock size={10} />
                  <span>varsayılan</span>
                </span>
              )}

              <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[10.5px] text-[var(--fg-muted)]">
                {status.orderCount} sipariş
              </span>
            </div>

            {/* Notification Channels Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-[var(--fg-muted)] font-medium mr-1 hidden sm:inline">
                Bildirim:
              </span>
              {NOTIFY_FIELDS.map(([field, label, Icon]) => {
                const isEnabled = Boolean(status[field]);
                const isBusy = savingId === status.id;
                return (
                  <button
                    key={field}
                    type="button"
                    disabled={isBusy}
                    onClick={() => void toggleNotify(status, field)}
                    className={`inline-flex items-center gap-1.5 rounded-[4px] px-2.5 py-1 text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${
                      isEnabled
                        ? 'border border-[var(--border)] bg-[var(--card-hover)] text-[var(--fg)] shadow-xs font-bold'
                        : 'border border-dashed border-[var(--border-soft)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--border)]'
                    }`}
                  >
                    <Icon size={12} className={isEnabled ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]'} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
