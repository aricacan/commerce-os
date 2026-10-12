'use client';

import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { ManualOrderDraftStatus, type ManualOrderDraft } from '../../lib/api/manual-orders';
import { useI18n } from '../../lib/i18n';
import { FilterSelect } from '../../components/ui/FilterSelect';
import { draftStatus, money } from './manual-order-ui';

interface Props {
  drafts: ManualOrderDraft[];
  selectedId: string | null;
  onSelect: (draft: ManualOrderDraft) => void;
  onNew: () => void;
}

export function ManualOrderDraftList({ drafts, selectedId, onSelect, onNew }: Props) {
  const { lang } = useI18n();
  const isTr = lang === 'tr';

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const filterOptions = useMemo(() => [
    { label: isTr ? 'Tüm Durumlar' : 'All Statuses', value: '' },
    { label: isTr ? 'Taslak' : 'Draft', value: String(ManualOrderDraftStatus.Draft) },
    { label: isTr ? 'Onay bekleyen' : 'Awaiting approval', value: String(ManualOrderDraftStatus.AwaitingApproval) },
    { label: isTr ? 'Onaylanan' : 'Approved', value: String(ManualOrderDraftStatus.Approved) },
    { label: isTr ? 'Gönderime hazır' : 'Ready to dispatch', value: String(ManualOrderDraftStatus.ReadyToDispatch) },
    { label: isTr ? 'Kuyruk' : 'Queued', value: String(ManualOrderDraftStatus.Queued) },
    { label: isTr ? 'Reddedilen' : 'Rejected', value: String(ManualOrderDraftStatus.Rejected) },
    { label: isTr ? 'İptal' : 'Cancelled', value: String(ManualOrderDraftStatus.Cancelled) },
  ], [isTr]);

  const visibleDrafts = useMemo(() => {
    const query = search.trim().toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US');
    const targetStatus = statusFilter === '' ? null : Number(statusFilter);
    return drafts.filter((draft) =>
      (targetStatus == null || draft.status === targetStatus) &&
      (!query || `${draft.draftNumber} ${draft.customerName} ${draft.storeName}`.toLocaleLowerCase(isTr ? 'tr-TR' : 'en-US').includes(query)));
  }, [drafts, search, statusFilter, isTr]);

  return (
    <aside style={{
      display: 'flex', flexDirection: 'column', height: '100%', minHeight: 480, minWidth: 0,
      overflow: 'hidden', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--card)',
    }}>
      {/* Header */}
      <div style={{ padding: 12, borderBottom: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              {isTr ? 'Sipariş Akışı' : 'Order Flow'}
            </h2>
            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--fg-muted)' }}>
              {drafts.length} {isTr ? 'kayıt' : 'records'}
            </p>
          </div>
          <button
            type="button"
            onClick={onNew}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 30, padding: '0 10px',
              borderRadius: 4, border: 'none', background: 'var(--fg)', color: 'var(--card)',
              fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            }}
          >
            <Plus size={13} /> {isTr ? 'Yeni' : 'New'}
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isTr ? 'No veya müşteri ara…' : 'Search no or customer…'}
            style={{
              width: '100%', height: 32, padding: '0 8px 0 28px', borderRadius: 4,
              border: '1px solid var(--border-soft)', background: 'var(--card)', color: 'var(--fg)',
              fontSize: 11.5, outline: 'none',
            }}
          />
        </div>

        {/* Custom FilterSelect Dropdown */}
        <div>
          <FilterSelect
            value={statusFilter}
            options={filterOptions}
            placeholder={isTr ? 'Tüm Durumlar' : 'All Statuses'}
            onChange={(v) => setStatusFilter(v)}
            minWidth={120}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {visibleDrafts.length === 0 ? (
          <p style={{ padding: 24, textAlign: 'center', fontSize: 11.5, color: 'var(--fg-muted)', margin: 0 }}>
            {isTr ? 'Bu filtrede kayıt yok.' : 'No records in this filter.'}
          </p>
        ) : (
          visibleDrafts.map((draft) => {
            const status = draftStatus(draft.status, lang);
            const isSelected = selectedId === draft.id;
            return (
              <button
                key={draft.id}
                type="button"
                onClick={() => onSelect(draft)}
                style={{
                  width: '100%', padding: '8px 10px', borderRadius: 4, textAlign: 'left', cursor: 'pointer',
                  border: isSelected ? '1px solid var(--border-strong)' : '1px solid var(--border-soft)',
                  background: isSelected ? 'var(--card-hover)' : 'var(--card)',
                  transition: 'all 0.1s ease', display: 'flex', flexDirection: 'column', gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {draft.draftNumber}
                  </span>
                  <span className={status.className} style={{ padding: '1px 6px', fontSize: 9.5, fontWeight: 600, flexShrink: 0 }}>
                    {status.label}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 500, color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {draft.customerName || (isTr ? 'İsimsiz müşteri' : 'Unnamed customer')}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--fg-muted)' }}>
                  <span>{draft.lines.length} {isTr ? 'kalem' : 'items'} · {draft.storeName}</span>
                  <span style={{ fontWeight: 700, color: 'var(--fg)' }}>{money(draft.totalAmount, draft.currency, lang)}</span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
