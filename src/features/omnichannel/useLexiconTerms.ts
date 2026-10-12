'use client';

import { useCallback, useState } from 'react';
import {
  LEXICON_SCOPE, lexiconApi, type LexiconTermFields, type LexiconTermQuery, type NewLexiconTermInput,
} from '../../lib/api/omnichannel-lexicon';
import { useServerResource } from './useServerResource';

// Sözlük terim listesinin durumu: arama, tür/kaynak/kapsam süzgeci, sayfa ve yazma eylemleri. Süzgeç değişince ilk sayfaya dönülür.
export function useLexiconTerms() {
  const [query, setQuery] = useState<LexiconTermQuery>({ search: '', kind: null, source: null, scope: LEXICON_SCOPE.All, page: 0 });
  const load = useCallback(() => lexiconApi.getTerms(query), [query]);
  const page = useServerResource(load, JSON.stringify(query));
  const { reload } = page;

  const filter = (patch: Partial<Omit<LexiconTermQuery, 'page'>>) => setQuery((current) => ({ ...current, ...patch, page: 0 }));
  const goToPage = (next: number) => setQuery((current) => ({ ...current, page: next }));

  const create = async (input: NewLexiconTermInput) => {
    await lexiconApi.createTerm(input);
    reload();
  };
  const update = async (id: number, fields: LexiconTermFields) => {
    await lexiconApi.updateTerm(id, fields);
    reload();
  };
  const setActive = async (id: number, isActive: boolean) => {
    await lexiconApi.setTermActive(id, isActive);
    reload();
  };

  return { query, page, filter, goToPage, create, update, setActive };
}
