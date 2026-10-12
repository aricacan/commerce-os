'use client';

import { useState } from 'react';
import { CustomerEmailsView } from './CustomerEmailsView';
import { OrderMailTemplatesTab } from './OrderMailTemplatesTab';
import { MailAutomationModal } from '../../components/mail/MailAutomationModal';
import { Info, Mail } from 'lucide-react';

type Tab = 'addresses' | 'templates';

const TABS: ReadonlyArray<{ key: Tab; label: string }> = [
  { key: 'addresses', label: 'Adresler' },
  { key: 'templates', label: 'Şablonlar' },
];

export function CustomerEmailsPageView() {
  const [tab, setTab] = useState<Tab>('addresses');
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [exportElement, setExportElement] = useState<React.ReactNode>(null);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-border-soft bg-card px-4 py-2">
        <div data-tour="emails-tabs" className="flex items-center gap-1.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`cursor-pointer rounded-[4px] px-3 py-1.5 text-ui-xs font-semibold transition-colors ${
                tab === key
                  ? 'bg-bg-subtle text-fg shadow-xs border border-border-soft'
                  : 'text-fg-muted hover:text-fg hover:bg-card-hover border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {tab === 'addresses' && (
            <>
              <div data-tour="emails-export" className="inline-flex">
                {exportElement}
              </div>
              <button
                type="button"
                data-tour="emails-info"
                onClick={() => setShowInfo((prev) => !prev)}
                title="Pazaryeri adresi kapsamı hakkında bilgi"
                className={`flex h-8 w-8 items-center justify-center rounded-[4px] border transition-colors cursor-pointer ${
                  showInfo
                    ? 'border-border bg-bg-subtle text-fg'
                    : 'border-border-soft bg-card text-fg-muted hover:border-border hover:text-fg'
                }`}
              >
                <Info size={14} />
              </button>
            </>
          )}

          <button
            type="button"
            data-tour="emails-smtp"
            onClick={() => setMailModalOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-[4px] border border-border bg-card px-3 text-ui-xs font-semibold text-fg hover:bg-card-hover transition-colors shadow-xs cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>E-Posta Otomasyonu & SMTP</span>
          </button>
        </div>
      </div>

      <div data-tour="emails-content" className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'addresses' ? (
          <CustomerEmailsView
            showInfo={showInfo}
            setShowInfo={setShowInfo}
            onExportReady={setExportElement}
          />
        ) : (
          <OrderMailTemplatesTab />
        )}
      </div>

      {mailModalOpen && (
        <MailAutomationModal isOpen={mailModalOpen} onClose={() => setMailModalOpen(false)} />
      )}
    </div>
  );
}
