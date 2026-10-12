'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import {
  notificationSettingsApi,
  type NotificationTypeSetting,
  type UpdateNotificationTypeSetting,
} from '../../lib/api/notification';
import { userApi } from '../../lib/api/users';
import { queryKeys } from '../../lib/query-keys';
import { toast } from '../../lib/toast';
import { MultiSelect, type MultiSelectOption } from '../../components/ui/MultiSelect';

// Yönetici: hangi bildirim tipi açık, push gitsin mi, kimler alsın.
//
// Varsayılan bilinçli olarak SADE: rutin uyarılar (sipariş durumu, günlük operasyon özeti,
// anomali, sistem izleme) kapalı; açık olanlar da alıcı seçilmemişse yalnız yöneticilere gider.
export function NotificationTypeSettingsPanel() {
  const queryClient = useQueryClient();

  const settings = useQuery({
    queryKey: queryKeys.system.notificationSettings,
    queryFn: notificationSettingsApi.list,
  });
  const users = useQuery({
    queryKey: queryKeys.system.users,
    queryFn: ({ signal }) => userApi.listWithSignal(signal),
  });

  const save = useMutation({
    mutationFn: ({ key, body }: { key: string; body: UpdateNotificationTypeSetting }) =>
      notificationSettingsApi.update(key, body),
    onSuccess: (saved) => {
      queryClient.setQueryData<NotificationTypeSetting[]>(queryKeys.system.notificationSettings,
        (list) => list?.map((s) => (s.key === saved.key ? saved : s)));
    },
    onError: () => toast.error('Bildirim ayarı kaydedilemedi.'),
  });

  const userOptions: MultiSelectOption[] = (users.data ?? [])
    .filter((u) => u.isActive)
    .map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}`.trim() || u.email }));

  function update(setting: NotificationTypeSetting, changes: Partial<UpdateNotificationTypeSetting>) {
    save.mutate({
      key: setting.key,
      body: {
        isEnabled: setting.isEnabled,
        pushEnabled: setting.pushEnabled,
        recipientUserIds: setting.recipientUserIds,
        ...changes,
      },
    });
  }

  return (
    <div className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-xs">
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 px-3.5 py-2">
        <SlidersHorizontal size={13} className="text-zinc-500" />
        <div className="flex flex-col">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">Bildirim Ayarları</span>
          <span className="text-[11px] text-zinc-400">
            Yalnız açık tipler gönderilir. &quot;Alıcılar&quot; boşsa bildirim yalnız yöneticilere gider;
            kişisel bildirimler yalnız ilgili kişiye gider.
          </span>
        </div>
      </div>

      {settings.isLoading ? (
        <p className="px-3.5 py-3 text-xs text-zinc-400">Yükleniyor…</p>
      ) : settings.isError ? (
        <p className="px-3.5 py-3 text-xs text-rose-600">Ayarlar yüklenemedi.</p>
      ) : (
        <div className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
          {(settings.data ?? []).map((setting) => (
            <div key={setting.key} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
              <div className="flex min-w-[220px] flex-1 flex-col">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{setting.label}</span>
                <span className="text-[11px] text-zinc-400">{setting.description}</span>
              </div>

              <Toggle
                label="Açık"
                checked={setting.isEnabled}
                disabled={save.isPending}
                onChange={(isEnabled) => update(setting, { isEnabled })}
              />
              <Toggle
                label="Web push"
                checked={setting.pushEnabled}
                disabled={save.isPending || !setting.isEnabled}
                onChange={(pushEnabled) => update(setting, { pushEnabled })}
              />

              {setting.recipientMode === 'Managed' ? (
                <MultiSelect
                  label="Alıcılar"
                  compact
                  searchable
                  options={userOptions}
                  selected={setting.recipientUserIds}
                  allLabel="Yalnız yöneticiler"
                  emptyLabel="Kullanıcı yok"
                  onChange={(values) => update(setting, { recipientUserIds: values.map(Number) })}
                  className="w-56"
                />
              ) : (
                <span className="w-56 text-[11px] text-zinc-400">Yalnız ilgili kişiye gider</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, disabled, onChange }: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
        checked
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900'
      }`}
    >
      <span className={`relative h-3.5 w-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow transition-all ${checked ? 'left-3' : 'left-0.5'}`}
        />
      </span>
      {label}
    </button>
  );
}
