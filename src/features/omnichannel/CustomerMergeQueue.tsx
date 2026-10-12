'use client';

import { useCallback, useEffect, useState } from 'react';
import { GitMerge } from 'lucide-react';
import { customerCrmApi, type CustomerMergeSuggestionDto } from '../../lib/api/customer-crm';
import { describeError } from '../../lib/errors';
import { MergeSuggestionCard } from './MergeSuggestionCard';
import { useMergeSuggestionActions } from './useMergeSuggestionActions';

const PAGE_SIZE = 20;

interface Props {
  onOpenProfile: (profileId: number) => void;
  // Bekleyen öneri sayısı (sekme rozeti); uç yoksa null.
  onTotalChange: (total: number | null) => void;
}

// Bekleyen "Aynı kişi mi?" önerileri kuyruğu (gece işi üretir). Her kart iki profili yan yana
// gösterir; onay doğrulama penceresinden geçer. Uç yoksa (eski backend) sakin boş durum çıkar.
export function CustomerMergeQueue({ onOpenProfile, onTotalChange }: Props) {
  const [items, setItems] = useState<CustomerMergeSuggestionDto[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await customerCrmApi.mergeSuggestions({ skip: page * PAGE_SIZE, take: PAGE_SIZE });
      // Son sayfanın son önerisi karara bağlanınca bir önceki sayfaya dön.
      if (result.items.length === 0 && page > 0) {
        setPage(page - 1);
        return;
      }
      setItems(result.items);
      setTotal(result.total);
      onTotalChange(result.total);
    } catch (e) {
      setItems([]);
      setError(describeError(e));
      onTotalChange(null);
    }
  }, [page, onTotalChange]);

  useEffect(() => { void load(); }, [load]);

  const { accept, reject, busyId } = useMergeSuggestionActions({ onAccepted: load, onRejected: load });

  if (!items) return <QueueMessage>Yükleniyor…</QueueMessage>;
  if (error) return <QueueMessage>Öneriler şu an okunamadı. Sunucu güncelleniyor olabilir; biraz sonra tekrar dene.</QueueMessage>;
  if (items.length === 0) {
    return (
      <QueueMessage>
        Bekleyen öneri yok. Aynı adlı ve benzer araç/şehir bilgili profiller her gece taranır; aynı kişi olabilecekler burada listelenir.
      </QueueMessage>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((suggestion) => (
          <li key={suggestion.id} className="rounded-[8px] border border-[var(--border-soft)] bg-[var(--card)] p-3">
            <MergeSuggestionCard suggestion={suggestion} busy={busyId === suggestion.id} onOpenProfile={onOpenProfile}
              onAccept={(targetId) => void accept(suggestion, targetId)} onReject={() => void reject(suggestion)} />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-end gap-2">
        <span className="flex-1 text-[var(--fg-muted)]">{total.toLocaleString('tr-TR')} bekleyen öneri</span>
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Önceki</button>
        <button type="button" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}
          className="h-7 rounded-[4px] border border-[var(--border)] px-2.5 disabled:opacity-40">Sonraki</button>
      </div>
    </div>
  );
}

function QueueMessage({ children }: { children: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[8px] border border-[var(--border-soft)] bg-[var(--card)] p-8 text-center text-[var(--fg-muted)]">
      <GitMerge size={18} aria-hidden />
      <p className="max-w-md">{children}</p>
    </div>
  );
}
