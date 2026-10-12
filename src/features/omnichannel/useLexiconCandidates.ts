'use client';

import { useCallback, useState } from 'react';
import {
  LEXICON_CANDIDATE_STATUS, lexiconApi, type LexiconCandidateQuery, type LexiconTermFields,
} from '../../lib/api/omnichannel-lexicon';
import { toggleId } from './qualityCenterRules';
import { useServerResource } from './useServerResource';

// Sözlük aday kutusunun durumu: süzgeç (durum, arama), sayfa, seçim ve inceleme eylemleri. Süzgeç değişince ilk sayfaya
// dönülür ve seçim temizlenir (görünmeyen adaylar yanlışlıkla toplu işleme girmesin).
export function useLexiconCandidates() {
  const [query, setQuery] = useState<LexiconCandidateQuery>({ status: LEXICON_CANDIDATE_STATUS.Pending, search: '', page: 0 });
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const load = useCallback(() => lexiconApi.getCandidates(query), [query]);
  const page = useServerResource(load, JSON.stringify(query));
  const { reload } = page;

  const filter = (patch: Partial<Omit<LexiconCandidateQuery, 'page'>>) => {
    setQuery((current) => ({ ...current, ...patch, page: 0 }));
    setSelected(new Set());
  };
  const goToPage = (next: number) => {
    setQuery((current) => ({ ...current, page: next }));
    setSelected(new Set());
  };
  const toggle = (id: number) => setSelected((current) => toggleId(current, id));

  const afterChange = useCallback(() => {
    setSelected(new Set());
    reload();
  }, [reload]);

  const approve = async (id: number, fields: LexiconTermFields) => {
    await lexiconApi.approveCandidate(id, fields);
    afterChange();
  };
  const reject = async (id: number) => {
    await lexiconApi.rejectCandidate(id);
    afterChange();
  };
  const rejectSelected = async () => {
    const result = await lexiconApi.rejectMany([...selected]);
    afterChange();
    return result;
  };

  return { query, page, selected, filter, goToPage, toggle, approve, reject, rejectSelected };
}
