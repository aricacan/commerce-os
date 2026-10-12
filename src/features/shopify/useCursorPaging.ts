import { useState } from 'react';

// Shopify cursor sayfalama: "önceki" için gidilen imleçler yığında tutulur (Shopify geriye cursor vermez).
// afters[i] = i. sayfayı getirmek için gönderilecek `after` (ilk sayfa null).
interface PagingState {
  afters: (string | null)[];
  index: number;
}

const FIRST_PAGE: PagingState = { afters: [null], index: 0 };

export function useCursorPaging() {
  const [state, setState] = useState<PagingState>(FIRST_PAGE);

  return {
    after: state.afters[state.index],
    pageNumber: state.index + 1,
    hasPrevious: state.index > 0,
    next: (endCursor: string) =>
      setState((s) => ({ afters: [...s.afters.slice(0, s.index + 1), endCursor], index: s.index + 1 })),
    previous: () => setState((s) => ({ ...s, index: Math.max(0, s.index - 1) })),
    reset: () => setState(FIRST_PAGE),
  };
}
