'use client';

import { useEffect, useState, useCallback } from 'react';
import { Link2, Check, X, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  storeSourceLinksApi,
  StoreSourceLinkStatus,
  type StoreSourceLinkCandidate,
  type StoreSourceLink,
} from '../../lib/api/integrations';
import { describeError } from '../../lib/errors';

// "Bu ERP kanalı ile şu pazaryeri bağlantısı aynı gerçek mağaza mı?" — otomatik tespit
// edilmiş ama HENÜZ ONAYLANMAMIŞ adayları gösterir ve tek tıkla onay/red almayı sağlar.
// Hiçbir eşleşme burada onaylanmadan kalıcı sayılmaz (bkz. backend StoreSourceLink yorumu).
//
// Bilerek IntegrationsHubView'dan BAĞIMSIZ veri çeker — hem ERP hem Pazaryeri sayfasında
// aynı panel gösterilir, ikisi de aynı global aday/karar listesini görür (adaylar zaten
// çift taraflı: bir ERP kanalı + bir pazaryeri bağlantısı).
export function StoreSourceLinkPanel({ isEn }: { isEn: boolean }) {
  const [candidates, setCandidates] = useState<StoreSourceLinkCandidate[] | null>(null);
  const [decided, setDecided] = useState<StoreSourceLink[]>([]);
  const [showDecided, setShowDecided] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [candidateRows, decidedRows] = await Promise.all([
        storeSourceLinksApi.candidates(),
        storeSourceLinksApi.decided(),
      ]);
      setCandidates(candidateRows);
      setDecided(decidedRows);
      setError(null);
    } catch (e) {
      setError(describeError(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (candidate: StoreSourceLinkCandidate, action: 'confirm' | 'reject') => {
    const key = `${candidate.erpConnectionId}-${candidate.marketplaceConnectionId}`;
    setBusyKey(key);
    try {
      if (action === 'confirm') await storeSourceLinksApi.confirm(candidate.erpConnectionId, candidate.marketplaceConnectionId);
      else await storeSourceLinksApi.reject(candidate.erpConnectionId, candidate.marketplaceConnectionId);
      await load();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusyKey(null);
    }
  };

  const undo = async (link: StoreSourceLink) => {
    setBusyKey(`undo-${link.id}`);
    try {
      await storeSourceLinksApi.removeDecision(link.id);
      await load();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusyKey(null);
    }
  };

  // Henüz yüklenmediyse veya hiç aday/karar yoksa panel hiç gösterilmez — boş bir
  // "eşleşme yok" kutusu her sayfada gürültü üretmesin diye.
  if (candidates === null) return null;
  if (candidates.length === 0 && decided.length === 0) return null;

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-4">
      <div className="mb-2.5 flex items-center gap-2 text-[11px] font-bold text-[var(--fg)]">
        <Link2 size={12} className="text-amber-500" />
        {isEn ? 'Same-store matches' : 'Aynı mağaza eşleşmeleri'}
        {candidates.length > 0 && (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
            {candidates.length}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-2 rounded-[3px] border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[11px] text-rose-600">
          {error}
        </div>
      )}

      {candidates.length === 0 ? (
        <p className="text-[11px] text-[var(--fg-muted)]">
          {isEn ? 'No unresolved matches.' : 'Bekleyen eşleşme yok.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[10.5px] text-[var(--fg-muted)]">
            {isEn
              ? 'These ERP channels and direct marketplace connections share the same platform + store — are they the same real account?'
              : 'Bu ERP kanalları ile doğrudan pazaryeri bağlantıları aynı platform + mağazayı paylaşıyor — bunlar aynı gerçek hesap mı?'}
          </p>
          {candidates.map((candidate) => {
            const key = `${candidate.erpConnectionId}-${candidate.marketplaceConnectionId}`;
            const busy = busyKey === key;
            return (
              <div
                key={key}
                className="flex flex-wrap items-center gap-2 rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 px-3 py-2 text-[11px]"
              >
                <span className="font-semibold text-[var(--fg)]">{candidate.erpConnectionName}</span>
                <span className="text-[var(--fg-muted)]">({candidate.erpChannelName})</span>
                <span className="text-[var(--fg-muted)]">↔</span>
                <span className="font-semibold text-[var(--fg)]">{candidate.marketplaceConnectionName}</span>
                {candidate.marketplaceCode && (
                  <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] px-1 py-0.5 font-mono text-[9.5px] text-[var(--fg-muted)]">
                    {candidate.marketplaceCode}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void decide(candidate, 'confirm')}
                    className="flex items-center gap-1 rounded-[3px] border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 font-semibold text-emerald-600 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    <Check size={11} /> {isEn ? 'Same' : 'Aynı'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void decide(candidate, 'reject')}
                    className="flex items-center gap-1 rounded-[3px] border border-[var(--border-soft)] px-2 py-1 font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                  >
                    <X size={11} /> {isEn ? 'Different' : 'Farklı'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {decided.length > 0 && (
        <div className="mt-3 border-t border-[var(--border-soft)] pt-2.5">
          <button
            type="button"
            onClick={() => setShowDecided((v) => !v)}
            className="flex items-center gap-1 text-[10.5px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)]"
          >
            {showDecided ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {isEn ? `Decisions (${decided.length})` : `Kararlar (${decided.length})`}
          </button>
          {showDecided && (
            <div className="mt-2 flex flex-col gap-1.5">
              {decided.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-wrap items-center gap-2 rounded-[3px] border border-[var(--border-soft)] px-3 py-1.5 text-[10.5px]"
                >
                  <span
                    className={`rounded-[3px] px-1.5 py-0.5 font-bold ${
                      link.status === StoreSourceLinkStatus.Confirmed
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-[var(--bg-subtle)] text-[var(--fg-muted)]'
                    }`}
                  >
                    {link.status === StoreSourceLinkStatus.Confirmed
                      ? (isEn ? 'Same' : 'Aynı')
                      : (isEn ? 'Different' : 'Farklı')}
                  </span>
                  <span className="text-[var(--fg)]">{link.erpConnectionName}</span>
                  <span className="text-[var(--fg-muted)]">↔</span>
                  <span className="text-[var(--fg)]">{link.marketplaceConnectionName}</span>
                  {link.marketplaceCode && (
                    <span className="rounded-[3px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1 py-0.5 font-mono text-[9.5px] text-[var(--fg-muted)]">
                      {link.marketplaceCode}
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={busyKey === `undo-${link.id}`}
                    onClick={() => void undo(link)}
                    className="ml-auto flex items-center gap-1 rounded-[3px] border border-[var(--border-soft)] px-2 py-1 font-semibold text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
                  >
                    <RotateCcw size={10} /> {isEn ? 'Undo' : 'Geri al'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
