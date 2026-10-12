'use client';

import type { ReactNode } from 'react';
import { AccountSectionNav } from './AccountSectionNav';
import { AliasTab } from './AliasTab';
import { BankTransactionsTab } from './BankTransactionsTab';
import { BotSettingsTab } from './BotSettingsTab';
import { CatalogSourcesTab } from './CatalogSourcesTab';
import { CategoryTaxonomyTab } from './CategoryTaxonomyTab';
import { CrossSellTab } from './CrossSellTab';
import { FeatureFlagsTab } from './FeatureFlagsTab';
import { HandoffConnectionsSection } from './HandoffConnectionsSection';
import { HandoffRoutesTab } from './HandoffRoutesTab';
import { IgnoredContactsTab } from './IgnoredContactsTab';
import { MenuTab } from './MenuTab';
import { OrderDestinationsTab } from './OrderDestinationsTab';
import { OutboundEmailsSection } from './OutboundEmailsSection';
import { useOmnichannelNav } from './OmnichannelNavContext';
import { PaymentOptionsTab } from './PaymentOptionsTab';
import { VehicleCompatibilityTab } from './VehicleCompatibilityTab';
import { VehicleFitmentQueue } from './VehicleFitmentQueue';
import { SETTINGS_PAGES, resolveSubPage } from './workspace-tabs';

interface Props {
  onOpenConversation: (conversationId: number) => void;
}

const SECTION_VIEWS: Readonly<Record<string, (props: Props) => ReactNode>> = {
  thresholds: () => <BotSettingsTab />,
  menu: () => <MenuTab />,
  bank: () => <BankTransactionsTab />,
  ignored: () => <IgnoredContactsTab />,
  alias: () => <AliasTab />,
  sources: () => <CatalogSourcesTab />,
  fitment: () => (<><VehicleCompatibilityTab /><VehicleFitmentQueue /></>),
  taxonomy: () => <CategoryTaxonomyTab />,
  connections: () => <HandoffConnectionsSection />,
  sentemails: ({ onOpenConversation }) => <OutboundEmailsSection onOpenConversation={onOpenConversation} />,
  flags: () => <FeatureFlagsTab />,
  payments: () => <PaymentOptionsTab />,
  orderdest: () => <OrderDestinationsTab />,
  crosssell: () => <CrossSellTab />,
  routing: () => <HandoffRoutesTab />,
};

// Hesap geneli: kanala bağlı olmayan varsayılanlar/kaynaklar ve "tüm kanallar" görünümü. Bir kanala ait ayarlar
// Kanal Merkezi'ndedir; buradaki toplu görünümler aynı bileşenleri kullanır (tek düzenleme kodu).
// Bölüm adreste (?sub=) durur: yenilenince ve paylaşılınca aynı ekran açılır.
export function AccountSettingsPage({ onOpenConversation }: Props) {
  const { view, go } = useOmnichannelNav();
  const section = resolveSubPage('account', view.sub);

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col md:flex-row">
      <AccountSectionNav
        sections={SETTINGS_PAGES.account}
        active={section}
        ariaLabel="Hesap geneli"
        onChange={(key) => go({ sub: key })}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{SECTION_VIEWS[section]({ onOpenConversation })}</div>
    </div>
  );
}
