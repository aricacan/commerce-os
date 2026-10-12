'use client';

import { useCallback, useState } from 'react';
import {
  QUALITY_CANDIDATE_STATUS, qualityApi, type ApproveCandidateInput, type CandidateQuery,
} from '../../lib/api/omnichannel-quality';
import { toggleId } from './qualityCenterRules';
import { useServerResource } from './useServerResource';

// Aday kutusunun durumu: süzgeç (durum, sinyal, arama), sayfa, seçim ve inceleme eylemleri. Süzgeç değişince ilk
// sayfaya dönülür ve seçim temizlenir (görünmeyen adaylar yanlışlıkla toplu işleme girmesin).
export function useQualityCandidates() {
  const [query, setQuery] = useState<CandidateQuery>({ status: QUALITY_CANDIDATE_STATUS.Pending, signal: null, search: '', page: 0 });
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const load = useCallback(() => qualityApi.getCandidates(query), [query]);
  const page = useServerResource(load, JSON.stringify(query));
  const { reload } = page;

  const filter = (patch: Partial<Omit<CandidateQuery, 'page'>>) => {
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

  const approve = async (id: number, input: ApproveCandidateInput) => {
    await qualityApi.approveCandidate(id, input);
    afterChange();
  };
  const reject = async (id: number) => {
    await qualityApi.rejectCandidate(id);
    afterChange();
  };
  const bulk = async (approveAll: boolean, addToLibrary: boolean) => {
    const results = await qualityApi.bulkReview([...selected], approveAll, addToLibrary);
    afterChange();
    return results;
  };
  const collect = async () => {
    const result = await qualityApi.collectCandidates();
    afterChange();
    return result;
  };

  return { query, page, selected, filter, goToPage, toggle, approve, reject, bulk, collect };
}
