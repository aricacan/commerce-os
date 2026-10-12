'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronsDown } from 'lucide-react';
import { customerCrmApi, type CustomerTimelineEventDto } from '../../lib/api/customer-crm';
import { describeError } from '../../lib/errors';
import { EmptyLine, PanelSection, ghostButtonClass } from './CustomerPanelParts';
import { CustomerTimelineRow } from './CustomerTimelineRow';

interface Props {
  profileId: number;
  // Profil her yeniden yüklendiğinde değişir; açık çizelge en yeni olaylardan yeniden başlar.
  reloadToken: number;
  onOpenConversation?: (conversationId: number) => void;
}

// Kalıcı zaman çizelgesi (konuşma, ürün sorusu, fiyat, sipariş, devir, not, birleşme…). Kapalı başlar,
// açılınca en yeni 50 olay gelir; "Daha eski" imleçle (beforeId) bir sonraki sayfayı ekler.
export function CustomerTimelineSection({ profileId, reloadToken, onOpenConversation }: Props) {
  return (
    <PanelSection title="Zaman çizelgesi" defaultOpen={false}>
      <TimelineList key={reloadToken} profileId={profileId} onOpenConversation={onOpenConversation} />
    </PanelSection>
  );
}

function TimelineList({ profileId, onOpenConversation }: Omit<Props, 'reloadToken'>) {
  const [items, setItems] = useState<CustomerTimelineEventDto[] | null>(null);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (beforeId: number | null) => {
    setError(null);
    try {
      const page = await customerCrmApi.timeline(profileId, beforeId);
      setItems((prev) => (beforeId && prev ? [...prev, ...page.items] : page.items));
      setNextBeforeId(page.nextBeforeId);
    } catch (e) {
      setError(describeError(e));
    }
  }, [profileId]);

  useEffect(() => { void loadPage(null); }, [loadPage]);

  const loadOlder = async () => {
    setLoadingMore(true);
    await loadPage(nextBeforeId);
    setLoadingMore(false);
  };

  if (error && !items) return <EmptyLine>{error}</EmptyLine>;
  if (!items) return <EmptyLine>Yükleniyor…</EmptyLine>;
  if (items.length === 0) {
    return <EmptyLine>Henüz kayıtlı olay yok. Konuşma, ürün sorusu, sipariş ve notlar burada birikir.</EmptyLine>;
  }

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2.5 border-l border-[var(--border-soft)] pl-3">
        {items.map((event) => (
          <CustomerTimelineRow key={event.id} event={event} onOpenConversation={onOpenConversation} />
        ))}
      </ol>
      {error && <EmptyLine>{error}</EmptyLine>}
      {nextBeforeId !== null && (
        <button type="button" className={`${ghostButtonClass} self-start`} disabled={loadingMore} onClick={() => void loadOlder()}>
          <ChevronsDown size={12} /> {loadingMore ? 'Yükleniyor…' : 'Daha eski'}
        </button>
      )}
    </div>
  );
}
