'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Bell, Smartphone, X } from 'lucide-react';
import { notificationSettingsApi, type UserNotificationPreference } from '../../lib/api/notification';
import { pushAlert } from '../../stores/alert-stack';

// Bir kullanıcının hangi bildirimi hangi kanaldan alacağı.
//
// Tip ayarı (Bildirimler > Ayarlar) kiracı düzeyinde "bu bildirim açık mı, kimler alabilir"
// der; burası kişinin kendi tercihidir ve o kapsamı yalnız DARALTIR. Amaç: herkesin her
// uyarıdan telefon bildirimi almasını bitirmek.
interface Props {
  userId: number;
  email: string;
  lang: 'tr' | 'en';
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, { tr: string; en: string }> = {
  Order: { tr: 'Sipariş', en: 'Orders' },
  Stock: { tr: 'Stok', en: 'Stock' },
  System: { tr: 'Sistem', en: 'System' },
  Ai: { tr: 'AI & Anomali', en: 'AI & Anomaly' },
  Personal: { tr: 'Bana Özel', en: 'Personal' },
};

export function UserNotificationPreferencesModal({ userId, email, lang, onClose }: Props) {
  const isTr = lang === 'tr';
  const [rows, setRows] = useState<UserNotificationPreference[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['user-notification-preferences', userId],
    queryFn: () => notificationSettingsApi.userPreferences(userId),
  });

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (next: UserNotificationPreference[]) =>
      notificationSettingsApi.saveUserPreferences(
        userId,
        next.map((r) => ({ typeKey: r.typeKey, inApp: r.inApp, push: r.push }))
      ),
    onSuccess: () => {
      pushAlert(isTr ? 'Bildirim tercihleri kaydedildi' : 'Notification preferences saved', 'success');
      onClose();
    },
    onError: () =>
      pushAlert(isTr ? 'Tercihler kaydedilemedi' : 'Could not save preferences', 'error'),
  });

  const toggle = (typeKey: string, channel: 'inApp' | 'push') =>
    setRows((prev) =>
      prev.map((row) =>
        row.typeKey === typeKey
          ? {
              ...row,
              [channel]: !row[channel],
              // Uygulama içi kapalıyken push açık kalamaz: bildirimi hiç almayan kişiye
              // telefon bildirimi göndermek anlamsız.
              ...(channel === 'inApp' && row.inApp ? { push: false } : {}),
            }
          : row
      )
    );

  const categories = [...new Set(rows.map((r) => r.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-xs">
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col gap-3 rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
          <div>
            <h2 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
              {isTr ? 'Bildirim Tercihleri' : 'Notification Preferences'}
            </h2>
            <p className="max-w-[260px] truncate text-[11px] text-zinc-500">{email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[3px] p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-700 cursor-pointer"
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex items-center gap-4 px-1 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <Bell size={11} /> {isTr ? 'Uygulama içi' : 'In-app'}
          </span>
          <span className="flex items-center gap-1">
            <Smartphone size={11} /> {isTr ? 'Telefon bildirimi' : 'Push'}
          </span>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto">
          {isLoading ? (
            <p className="p-6 text-center text-xs text-zinc-500">{isTr ? 'Yükleniyor…' : 'Loading…'}</p>
          ) : (
            categories.map((category) => (
              <section key={category} className="space-y-1">
                <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  {CATEGORY_LABELS[category]?.[lang] ?? category}
                </h3>
                {rows
                  .filter((row) => row.category === category)
                  .map((row) => (
                    <div
                      key={row.typeKey}
                      className="flex items-center justify-between gap-3 rounded-[3px] border border-zinc-200 dark:border-zinc-800 px-3 py-2"
                    >
                      <span className="text-xs text-zinc-700 dark:text-zinc-300">{row.label}</span>
                      <div className="flex shrink-0 items-center gap-3">
                        <ChannelToggle
                          icon={<Bell size={12} />}
                          active={row.inApp}
                          onClick={() => toggle(row.typeKey, 'inApp')}
                        />
                        <ChannelToggle
                          icon={<Smartphone size={12} />}
                          active={row.push}
                          disabled={!row.inApp}
                          onClick={() => toggle(row.typeKey, 'push')}
                        />
                      </div>
                    </div>
                  ))}
              </section>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-7.5 rounded-[3px] border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            {isTr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            disabled={save.isPending || isLoading}
            onClick={() => save.mutate(rows)}
            className="h-7.5 rounded-[3px] bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-60 cursor-pointer"
          >
            {isTr ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ChannelToggle({
  icon,
  active,
  disabled = false,
  onClick,
}: {
  icon: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex h-6 w-6 items-center justify-center rounded-[3px] border transition-colors ${
        active
          ? 'border-sky-500 bg-sky-500 text-white'
          : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-400'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      {icon}
    </button>
  );
}
