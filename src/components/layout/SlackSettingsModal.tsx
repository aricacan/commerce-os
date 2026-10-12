'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, FileText, Hash, History, Link2, MessageSquare } from 'lucide-react';
import { notificationRoutesApi } from '../../lib/api/notification-routes';
import { useI18n } from '../../lib/i18n';
import { SlackRoutesPanel } from '../../features/system/SlackRoutesPanel';
import { AutomationModal } from '../shared/AutomationModal';
import { t } from '../shared/automation-ui';
import { SlackLogsTab } from '../slack/SlackLogsTab';
import { SlackPreviewTab } from '../slack/SlackPreviewTab';
import { SlackWebhooksTab } from '../slack/SlackWebhooksTab';
import { TenantLinksTab } from '../slack/TenantLinksTab';

interface SlackSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'webhooks' | 'routes' | 'preview' | 'logs' | 'links';

/**
 * Slack otomasyon paneli — mail modalıyla AYNI kabuk ve aynı dört sekme:
 * kanal/hesap → kural → önizleme → gönderim geçmişi.
 */
export function SlackSettingsModal({ isOpen, onClose }: SlackSettingsModalProps) {
  const { lang } = useI18n();
  const [activeTab, setActiveTab] = useState<TabType>('webhooks');

  const { data: routes = [] } = useQuery({
    queryKey: ['notification-routes'],
    queryFn: notificationRoutesApi.list,
    enabled: isOpen,
    staleTime: 30_000,
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ['notification-event-types'],
    queryFn: notificationRoutesApi.eventTypes,
    enabled: isOpen,
    staleTime: 300_000,
  });

  const routeCountByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of routes) map.set(r.eventType, (map.get(r.eventType) ?? 0) + 1);
    return map;
  }, [routes]);

  if (!isOpen) return null;

  const tabs = [
    {
      id: 'webhooks' as const,
      icon: <Hash className="h-3.5 w-3.5" />,
      label: t(lang, 'Webhooklar', 'Webhooks'),
      badge: routes.length || undefined,
    },
    { id: 'routes' as const, icon: <Clock className="h-3.5 w-3.5" />, label: t(lang, 'Yönlendirmeler', 'Routes') },
    { id: 'preview' as const, icon: <FileText className="h-3.5 w-3.5" />, label: t(lang, 'Mesaj Önizleme', 'Preview') },
    { id: 'logs' as const, icon: <History className="h-3.5 w-3.5" />, label: t(lang, 'Gönderim Geçmişi', 'Logs') },
    { id: 'links' as const, icon: <Link2 className="h-3.5 w-3.5" />, label: t(lang, 'Şirket Bağlantıları', 'Company Links') },
  ];

  return (
    <AutomationModal
      icon={<MessageSquare className="h-4 w-4" />}
      title={t(lang, 'Slack Bildirimleri', 'Slack Notifications')}
      subtitle={t(
        lang,
        'Olay tipine göre webhook yönlendirmesi, mesaj önizlemesi ve gönderim geçmişi',
        'Webhook routing per event type, message preview and delivery history'
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onClose={onClose}
      closeLabel={t(lang, 'Kapat', 'Close')}
    >
      {activeTab === 'webhooks' && (
        <SlackWebhooksTab lang={lang} routes={routes} eventTypes={eventTypes} />
      )}
      {activeTab === 'routes' && <SlackRoutesPanel />}
      {activeTab === 'preview' && (
        <SlackPreviewTab lang={lang} eventTypes={eventTypes} routeCountByType={routeCountByType} />
      )}
      {activeTab === 'logs' && <SlackLogsTab lang={lang} eventTypes={eventTypes} />}
      {activeTab === 'links' && <TenantLinksTab lang={lang} />}
    </AutomationModal>
  );
}
