import { ChevronLeft, ChevronRight, MailX } from 'lucide-react';
import type { OutboundEmailPageDto } from '../../lib/api/omnichannel-email-outbound';
import { OUTBOUND_ROW_GRID, OutboundEmailRow } from './OutboundEmailRow';
import { outboundPageCount } from './outboundEmailRules';

interface Props {
  data: OutboundEmailPageDto | null;
  loading: boolean;
  error: string | null;
  page: number;
  channelNames: ReadonlyMap<number, string>;
  onPageChange: (page: number) => void;
  onOpenConversation?: (conversationId: number) => void;
}

const SKELETON_ROWS = 6;
const HEADERS = ['Zaman', 'Tür', 'Kime', 'Konu', 'Kanal', 'Durum', ''];

function ListSkeleton() {
  return (
    <ul aria-busy="true" aria-label="Yükleniyor" className="m-0 list-none divide-y divide-[var(--border-soft)] p-0">
      {Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <li key={i} className="px-3 py-3"><div className="h-4 animate-pulse rounded-[4px] bg-[var(--bg-subtle)]" /></li>
      ))}
    </ul>
  );
}

function Pager({ page, total, onChange }: { page: number; total: number; onChange: (page: number) => void }) {
  const pages = outboundPageCount(total);
  return (
    <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] px-3 py-2 text-[11px] text-[var(--fg-muted)]">
      <button type="button" aria-label="Önceki sayfa" disabled={page <= 1} onClick={() => onChange(page - 1)}
        className="cursor-pointer rounded-[4px] p-1 hover:bg-[var(--bg-subtle)] disabled:opacity-40"><ChevronLeft size={14} /></button>
      <span>{page} / {pages}</span>
      <button type="button" aria-label="Sonraki sayfa" disabled={page >= pages} onClick={() => onChange(page + 1)}
        className="cursor-pointer rounded-[4px] p-1 hover:bg-[var(--bg-subtle)] disabled:opacity-40"><ChevronRight size={14} /></button>
    </div>
  );
}

// Liste gövdesi: hata, yükleniyor, boş ve dolu durumlar. Hata varken boş liste GÖSTERİLMEZ.
export function OutboundEmailList({ data, loading, error, page, channelNames, onPageChange, onOpenConversation }: Props) {
  if (error) {
    return <div role="alert" className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 p-3 text-rose-500">{error}</div>;
  }

  return (
    <div className="overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs">
      <div className={`hidden border-b border-[var(--border-soft)] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)] ${OUTBOUND_ROW_GRID}`}>
        {HEADERS.map((header, i) => <span key={i}>{header}</span>)}
      </div>

      {loading && !data && <ListSkeleton />}

      {data && data.items.length === 0 && (
        <div className="flex flex-col items-center gap-2 px-3 py-10 text-[var(--fg-muted)]">
          <MailX size={20} aria-hidden />
          <p>Henüz e-posta gönderilmedi</p>
        </div>
      )}

      {data && data.items.length > 0 && (
        <ul className={`m-0 list-none divide-y divide-[var(--border-soft)] p-0 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {data.items.map((email) => (
            <OutboundEmailRow key={email.id} email={email}
              channelName={email.channelId === null ? null : channelNames.get(email.channelId) ?? `Kanal #${email.channelId}`}
              onOpenConversation={onOpenConversation} />
          ))}
        </ul>
      )}

      {data && data.totalCount > 0 && <Pager page={page} total={data.totalCount} onChange={onPageChange} />}
    </div>
  );
}
