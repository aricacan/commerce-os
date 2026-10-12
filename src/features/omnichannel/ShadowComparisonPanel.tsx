'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, GitCompare } from 'lucide-react';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { SHADOW_PAGE_SIZE } from '../../lib/api/omnichannel-eval';
import type { MonitoringQuery } from '../../lib/api/omnichannel-monitoring';
import { formInputClass, secondaryButtonClass } from './formClasses';
import { ShadowComparisonRow } from './ShadowComparisonRow';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useLoad } from './useLoad';
import { useShadowComparisons } from './useShadowComparisons';

interface Props {
  // İzleme başlığındaki ortak tarih aralığı; null = geçersiz seçim (tarih süzgeci uygulanmaz).
  range: MonitoringQuery | null;
  refreshToken: number;
}

// İzleme › "Gölge karşılaştırma": gölge sürüm açık kanallarda aynı müşteri mesajına canlı ve gölge hattın
// cevapları yan yana. Gölge cevap müşteriye gitmez; yeni sürümü canlıya almadan önce gerçek trafikte denemek içindir.
export function ShadowComparisonPanel({ range, refreshToken }: Props) {
  const [channelId, setChannelId] = useState<number | null>(null);
  // Tarih aralığı değişince ilk sayfaya dönülür (eski sayfa numarası yeni aralıkta boş kalabilir).
  const rangeKey = `${range?.from ?? ''}|${range?.to ?? ''}`;
  const [paging, setPaging] = useState({ rangeKey, page: 0 });
  const page = paging.rangeKey === rangeKey ? paging.page : 0;
  const setPage = (next: number) => setPaging({ rangeKey, page: next });
  const { data: channels } = useLoad(omnichannelApi.getChannels);
  const state = useShadowComparisons(range, channelId, page, refreshToken);
  const pageCount = Math.max(1, Math.ceil(state.total / SHADOW_PAGE_SIZE));

  const changeChannel = (value: string) => {
    setChannelId(value ? Number(value) : null);
    setPage(0);
  };

  return (
    <section className="flex min-w-0 flex-col gap-2" aria-busy={state.loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <GitCompare size={14} className="text-fg-muted" aria-hidden />
          <h3 className="m-0 text-ui-sm font-bold text-fg">Gölge karşılaştırma</h3>
        </div>
        <select
          aria-label="Kanal" value={channelId ?? ''} onChange={(e) => changeChannel(e.target.value)}
          className={`${formInputClass} w-auto min-w-40`}
        >
          <option value="">Tüm kanallar</option>
          {(channels ?? []).map((channel) => <option key={channel.id} value={channel.id}>{channel.displayName}</option>)}
        </select>
      </div>

      {state.updatePending && <UpdatePendingNotice />}
      {state.error && <p className="m-0 text-ui-xs text-danger">{state.error}</p>}
      {state.loading && state.items.length === 0 && <p className="m-0 text-ui-xs text-fg-muted">Karşılaştırmalar yükleniyor…</p>}
      {!state.loading && !state.error && !state.updatePending && state.items.length === 0 && (
        <p className="m-0 rounded-xl border border-dashed border-border px-4 py-6 text-center text-ui-xs text-fg-muted">
          Bu dönemde gölge kaydı yok. Kanal Merkezi › Bot bölümünden bir kanala gölge sürüm seçin.
        </p>
      )}

      {state.items.length > 0 && (
        <ul className={`m-0 flex list-none flex-col gap-2 p-0 ${state.loading ? 'opacity-60' : ''}`}>
          {state.items.map((row) => <ShadowComparisonRow key={`${row.live?.traceId ?? 0}-${row.shadow?.traceId ?? 0}-${row.createdAt}`} row={row} />)}
        </ul>
      )}

      {pageCount > 1 && (
        <nav aria-label="Gölge karşılaştırma sayfaları" className="flex items-center justify-between gap-2">
          <button type="button" className={secondaryButtonClass} disabled={page === 0 || state.loading} onClick={() => setPage(page - 1)}>
            <ChevronLeft size={13} aria-hidden /> Önceki
          </button>
          <span aria-live="polite" className="text-ui-xs font-semibold tabular-nums text-fg-muted">Sayfa {page + 1} / {pageCount}</span>
          <button
            type="button" className={secondaryButtonClass} disabled={page + 1 >= pageCount || state.loading}
            onClick={() => setPage(page + 1)}
          >
            Sonraki <ChevronRight size={13} aria-hidden />
          </button>
        </nav>
      )}
    </section>
  );
}
