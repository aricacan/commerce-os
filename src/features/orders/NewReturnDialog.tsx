'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { returnsApi, type ReturnDocument } from '../../lib/api/returns';
import { request } from '../../lib/api/core';
import { describeError } from '../../lib/errors';

interface ClaimRow {
  id: number;
  platformOrderNumber: string;
  sku: string;
  reason: string;
  status: string;
  claimDate: string;
  refundAmount: number | null;
  currency: string;
  storeName: string;
}

interface ClaimsResponse {
  totalCount: number;
  items: ClaimRow[];
  neverSynced: boolean;
}

interface Props {
  onCreated: (document: ReturnDocument) => void;
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;
const CLAIM_LIMIT = 50;

/**
 * Pazaryeri iade TALEPLERİNDEN belge açma.
 *
 * Elle boş belge açma bilinçli olarak YOK: iade belgesi bir talebe ya da siparişe dayanmalı.
 * Dayanaksız bir belge, tutarı doğrudan cariye yazılan serbest bir metin olurdu.
 */
export function NewReturnDialog({ onCreated, onClose }: Props) {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [neverSynced, setNeverSynced] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const term = search.trim();
        const query = term
          ? `?limit=${CLAIM_LIMIT}&search=${encodeURIComponent(term)}`
          : `?limit=${CLAIM_LIMIT}`;
        const data = await request<ClaimsResponse>(`/claims${query}`);
        if (cancelled) return;
        setClaims(data.items);
        setNeverSynced(data.neverSynced);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(describeError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  async function create(claimId: number) {
    setBusyId(claimId);
    setError(null);
    try {
      onCreated(await returnsApi.createFromClaim(claimId));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col gap-3 rounded-[2px] border border-border bg-card p-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-ui-sm font-bold text-fg">Talepten İade Belgesi Aç</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[2px] p-1 text-fg-subtle hover:text-fg"
            title="Kapat"
          >
            <X size={14} />
          </button>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Sipariş no, SKU veya sebep ara…"
          className="h-8 rounded-[2px] border border-border-soft bg-bg-subtle px-2.5 text-ui-xs text-fg"
        />

        {error && (
          <div className="rounded-[2px] border border-danger/20 bg-danger-soft p-2.5 text-ui-xs text-danger">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <p className="py-8 text-center text-ui-xs text-fg-muted">Yükleniyor…</p>
          ) : claims.length === 0 ? (
            <p className="rounded-[2px] border border-dashed border-border-soft p-8 text-center text-ui-xs text-fg-muted">
              {neverSynced
                ? 'Hiç iade talebi senkronlanmamış. Talepler Sentos’tan 3 saatte bir çekilir; senkron hiç çalışmadıysa ya da uç bu hesapta kullanılamıyorsa liste boş kalır.'
                : 'Bu aramada talep bulunamadı.'}
            </p>
          ) : (
            <ul className="flex list-none flex-col gap-1.5 p-0">
              {claims.map((claim) => (
                <li
                  key={claim.id}
                  className="flex items-center gap-3 rounded-[2px] border border-border-soft bg-bg-subtle/40 p-2.5"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-mono text-ui-xs font-semibold text-fg">
                      {claim.platformOrderNumber}
                    </span>
                    <span className="truncate text-[11px] text-fg-muted">
                      {claim.sku} · {claim.reason} · {claim.storeName}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-ui-xs tabular-nums text-fg">
                    {claim.refundAmount === null
                      ? '—'
                      : `${claim.refundAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ${claim.currency}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => void create(claim.id)}
                    disabled={busyId !== null}
                    className="shrink-0 cursor-pointer rounded-[2px] border border-border-soft bg-card px-2.5 py-1 text-ui-xs font-medium text-fg hover:border-border disabled:opacity-50"
                  >
                    {busyId === claim.id ? 'Açılıyor…' : 'Belge Aç'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
