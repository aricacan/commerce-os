'use client';

import { useCallback, useState } from 'react';
import { goldApi, type GoldCandidateDto } from '../../lib/api/omnichannel-gold';
import { describeError } from '../../lib/errors';
import { GOLD_CANDIDATE_DAYS, goldBulkSummary, settledCandidateIds, toggleGoldSelection } from './goldSetRules';

// "Aday öner" bölümünün verisi (P35): sunucunun önerdiği temsilci cevapları, seçim ve toplu ekleme.
// Adaylar bölüm ilk açıldığında yüklenir (her sayfa açılışında sunucuyu taramasın).
export function useGoldCandidates(onAdded: () => Promise<void>) {
  const [candidates, setCandidates] = useState<GoldCandidateDto[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCandidates(await goldApi.getCandidates(GOLD_CANDIDATE_DAYS));
      setSelected([]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback((messageId: number) => setSelected((prev) => toggleGoldSelection(prev, messageId)), []);

  // Eklenen ve zaten sette olan adaylar listeden düşer; özet metni çağırana döner.
  const addSelected = useCallback(async (): Promise<string | null> => {
    if (selected.length === 0) return null;
    setAdding(true);
    try {
      const results = await goldApi.addFromCandidates(selected);
      const settled = new Set(settledCandidateIds(results));
      setCandidates((prev) => prev && prev.filter((c) => !settled.has(c.messageId)));
      setSelected((prev) => prev.filter((id) => !settled.has(id)));
      await onAdded();
      return goldBulkSummary(results);
    } finally {
      setAdding(false);
    }
  }, [selected, onAdded]);

  return { candidates, selected, loading, adding, error, load, toggle, addSelected };
}
