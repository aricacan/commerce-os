'use client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, FileText, History, Mail, Settings } from 'lucide-react';
import { userMailApi } from '../../lib/api/user-mail';
import { pushAlert } from '../../stores/alert-stack';
import { useI18n } from '../../lib/i18n';
import { MailAccountTab } from './MailAccountTab';
import { MailLogsTab } from './MailLogsTab';
import { MailPreviewTab } from './MailPreviewTab';
import { MailRulesTab } from './MailRulesTab';
import { t } from './mail-ui';
import { AutomationModal } from '../shared/AutomationModal';

interface MailAutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'account' | 'rules' | 'preview' | 'logs';

export function MailAutomationModal({ isOpen, onClose }: MailAutomationModalProps) {
  const { lang } = useI18n();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('account');

  const { data: account } = useQuery({
    queryKey: ['user-mail-account'],
    queryFn: userMailApi.getAccount,
    enabled: isOpen,
    staleTime: 10_000,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['user-mail-rules'],
    queryFn: userMailApi.listRules,
    enabled: isOpen,
    staleTime: 10_000,
  });

  // OAuth akışı tarayıcıyı sağlayıcıya gönderip buraya geri döner; sonucu adres
  // çubuğundan okuyup temizleriz, aksi halde yenilemede tekrar bildirim çıkar.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const result = params.get('mailOAuth');
    if (!result) return;

    if (result === 'success') {
      pushAlert(t(lang, 'Mail hesabı bağlandı', 'Mail account connected'), 'success');
      qc.invalidateQueries({ queryKey: ['user-mail-account'] });
    } else {
      pushAlert(params.get('reason') ?? t(lang, 'Bağlantı başarısız', 'Connection failed'), 'error');
    }

    params.delete('mailOAuth');
    params.delete('reason');
    const query = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (query ? `?${query}` : ''));
  }, [lang, qc]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'account' as const, icon: <Settings className="h-3.5 w-3.5" />, label: t(lang, 'Mail Hesabım', 'Mail Account') },
    {
      id: 'rules' as const,
      icon: <Clock className="h-3.5 w-3.5" />,
      label: t(lang, 'Otomasyon Kuralları', 'Rules'),
      badge: rules.length || undefined,
    },
    { id: 'preview' as const, icon: <FileText className="h-3.5 w-3.5" />, label: t(lang, 'Şablon Önizleme', 'Preview') },
    { id: 'logs' as const, icon: <History className="h-3.5 w-3.5" />, label: t(lang, 'Gönderim Geçmişi', 'Logs') },
  ];

  return (
    <AutomationModal
      icon={<Mail className="h-4 w-4" />}
      title={t(lang, 'Kişisel E-Posta & Rapor Otomasyonu', 'Personal Mail & Report Automation')}
      subtitle={t(
        lang,
        'Kendi hesabınla yöneticilere ve müşterilere zamanlanmış rapor gönder',
        'Send scheduled HTML reports from your own mailbox'
      )}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onClose={onClose}
      closeLabel={t(lang, 'Kapat', 'Close')}
    >
      {activeTab === 'account' && <MailAccountTab lang={lang} account={account} />}
      {activeTab === 'rules' && <MailRulesTab lang={lang} rules={rules} />}
      {activeTab === 'preview' && <MailPreviewTab lang={lang} account={account} />}
      {activeTab === 'logs' && <MailLogsTab lang={lang} />}
    </AutomationModal>
  );
}
