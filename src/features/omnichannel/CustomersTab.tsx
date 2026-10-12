'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { customerCrmApi } from '../../lib/api/customer-crm';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { useMobile } from '../../hooks/useMobile';
import { CustomerPanel, CustomerPanelDock } from './CustomerPanel';
import { CustomerDirectory } from './CustomerDirectory';
import { CustomerMergeQueue } from './CustomerMergeQueue';

type CustomersView = 'list' | 'merge';

interface Props {
  onOpenConversation?: (conversationId: number) => void;
}

// Müşteriler ekranı: liste (arama + süzgeç) ve "Aynı kişi mi?" öneri kuyruğu iki görünüm.
// Seçilen müşterinin 360 paneli sağda (mobilde ayrı ekranda) açılır.
export function CustomersTab({ onOpenConversation }: Props) {
  const isMobile = useMobile();
  const [view, setView] = useState<CustomersView>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [pendingMerges, setPendingMerges] = useState<number | null>(null);

  // Rozet için yalnız toplam; uç yoksa (eski backend) rozet gizli kalır.
  useEffect(() => {
    customerCrmApi.mergeSuggestions({ take: 1 })
      .then((result) => setPendingMerges(result.total))
      .catch(() => setPendingMerges(null));
  }, [reloadToken]);

  const closePanel = () => {
    setSelectedId(null);
    setReloadToken((t) => t + 1);
  };

  const panel = selectedId !== null && (
    <CustomerPanel key={selectedId} profileId={selectedId} onOpenConversation={onOpenConversation} onClose={closePanel} />
  );

  if (isMobile && panel) return <div className="h-full">{panel}</div>;

  const mergeLabel = pendingMerges ? `Birleştirme önerileri (${pendingMerges})` : 'Birleştirme önerileri';

  return (
    <div className="relative flex h-full min-h-0 w-full">
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4 text-xs sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Users size={16} className="text-[var(--fg-muted)]" />
          <h2 className="flex-1 text-sm font-bold text-[var(--fg)]">Müşteriler</h2>
          <SegmentedControl size="sm" value={view} onChange={setView}
            options={[{ value: 'list', label: 'Liste' }, { value: 'merge', label: mergeLabel }]} />
        </div>

        {view === 'list' ? (
          <CustomerDirectory selectedId={selectedId} onSelect={setSelectedId} reloadToken={reloadToken} />
        ) : (
          <CustomerMergeQueue onOpenProfile={setSelectedId} onTotalChange={setPendingMerges} />
        )}
      </div>

      {panel && <CustomerPanelDock>{panel}</CustomerPanelDock>}
    </div>
  );
}
