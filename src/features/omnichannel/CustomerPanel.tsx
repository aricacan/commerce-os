'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { UserRound, X } from 'lucide-react';
import { customersApi, type CustomerProfileDto } from '../../lib/api/customers';
import { describeError } from '../../lib/errors';
import { iconButtonClass } from './CustomerPanelParts';
import { CustomerPanelHeader } from './CustomerPanelHeader';
import { CustomerMergeBanner } from './CustomerMergeBanner';
import { CustomerIdentitySection } from './CustomerIdentitySection';
import { CustomerVehiclesSection } from './CustomerVehiclesSection';
import { CustomerInterestsSection } from './CustomerInterestsSection';
import { CustomerChatOrdersSection } from './CustomerChatOrdersSection';
import { CustomerFactsSection } from './CustomerFactsSection';
import { CustomerAddressesSection } from './CustomerAddressesSection';
import { CustomerTagsSection } from './CustomerTagsSection';
import { CustomerNotesSection } from './CustomerNotesSection';
import { CustomerTasksSection } from './CustomerTasksSection';
import { CustomerShopifyOrdersSection } from './CustomerShopifyOrdersSection';
import { CustomerErpOrdersSection } from './CustomerErpOrdersSection';
import { CustomerTimelineSection } from './CustomerTimelineSection';
import { CustomerPrivacySection } from './CustomerPrivacySection';

interface Props {
  // Sohbetten açılışta kanal kaydı (profil yoksa o an oluşturulur), Müşteriler ekranından profil.
  contactId?: number;
  profileId?: number;
  conversationId?: number;
  onOpenConversation?: (conversationId: number) => void;
  onClose?: () => void;
}

// "Müşteri 360": kimlik kartı, aynı-kişi önerisi, kanallar/iletişim, araçlar, ilgilendiği ürünler,
// siparişler, bilgiler, adresler, etiket/not/görev, dış siparişler, zaman çizelgesi ve KVKK tek panelde.
// Verisi silinmiş müşteri salt okunur gösterilir.
export function CustomerPanel({ contactId, profileId, conversationId, onOpenConversation, onClose }: Props) {
  const [profile, setProfile] = useState<CustomerProfileDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Birleşmeden sonra açık profil silinmiş olabilir; panel kalan profille devam eder.
  const [survivorId, setSurvivorId] = useState<number | null>(null);
  // Her yüklemede artar; ayrı uçtan okunan zaman çizelgesi de tazelenir.
  const [version, setVersion] = useState(0);

  const fetchProfile = useCallback(() => {
    if (survivorId !== null) return customersApi.get(survivorId);
    if (contactId !== undefined) return customersApi.forContact(contactId);
    if (profileId !== undefined) return customersApi.get(profileId);
    return null;
  }, [survivorId, contactId, profileId]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await fetchProfile();
      if (next) setProfile(next);
      setVersion((v) => v + 1);
    } catch (e) {
      setError(describeError(e));
    }
  }, [fetchProfile]);

  useEffect(() => { void load(); }, [load]);

  const replaceProfile = useCallback((survivor: CustomerProfileDto) => {
    setProfile(survivor);
    setSurvivorId(survivor.id);
  }, []);

  if (error) return <PanelShell onClose={onClose}><p className="p-4 text-xs text-[var(--fg-muted)]">{error}</p></PanelShell>;
  if (!profile) return <PanelShell onClose={onClose}><p className="p-4 text-xs text-[var(--fg-muted)]">Yükleniyor…</p></PanelShell>;

  const readOnly = profile.anonymizedAt !== null;
  const common = { profile, readOnly, onChanged: load };

  return (
    <PanelShell onClose={onClose}>
      <CustomerPanelHeader {...common} />
      {!readOnly && <CustomerMergeBanner profile={profile} onChanged={load} onReplaced={replaceProfile} />}
      <CustomerIdentitySection {...common} onOpenConversation={onOpenConversation} onSwitchProfile={setSurvivorId} />
      <CustomerVehiclesSection {...common} />
      <CustomerInterestsSection {...common} onOpenConversation={onOpenConversation} />
      <CustomerChatOrdersSection orders={profile.chatOrders} onOpenConversation={onOpenConversation} />
      <CustomerFactsSection {...common} />
      <CustomerAddressesSection {...common} />
      <CustomerTagsSection {...common} />
      <CustomerNotesSection {...common} />
      <CustomerTasksSection profileId={profile.id} conversationId={conversationId} readOnly={readOnly} />
      <CustomerShopifyOrdersSection profileId={profile.id} />
      <CustomerErpOrdersSection profileId={profile.id} />
      <CustomerTimelineSection profileId={profile.id} reloadToken={version} onOpenConversation={onOpenConversation} />
      <CustomerPrivacySection {...common} />
    </PanelShell>
  );
}

// Geniş ekranda sağ sütun; xl altında (dizüstü, dar pencere) içeriğin üstüne açılan
// çekmece — liste + sohbet + panel yan yana sığmadığında panel ekran dışına taşıyordu.
export function CustomerPanelDock({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-y-0 right-0 z-20 w-80 max-w-full border-l border-[var(--border-soft)] shadow-xl xl:static xl:z-auto xl:shrink-0 xl:shadow-none">
      {children}
    </div>
  );
}

// Varsayılan: panel yalnız yan yana sığıyorsa açık başlar (Tailwind xl = 1280px).
export function customerPanelFitsBeside(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches;
}

function PanelShell({ onClose, children }: { onClose?: () => void; children: ReactNode }) {
  return (
    <aside className="flex h-full min-h-0 flex-col bg-[var(--card)]">
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border-soft)] px-4 py-2.5">
        <UserRound size={15} className="text-[var(--fg-muted)]" />
        <span className="flex-1 text-xs font-bold text-[var(--fg)]">Müşteri</span>
        {onClose && (
          <button type="button" className={iconButtonClass} onClick={onClose} aria-label="Paneli kapat">
            <X size={14} />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </aside>
  );
}
