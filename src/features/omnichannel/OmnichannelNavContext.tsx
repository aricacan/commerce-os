'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { OmnichannelNavigation } from './useOmnichannelNavigation';

const NavigationContext = createContext<OmnichannelNavigation | null>(null);

export function OmnichannelNavigationProvider({ value, children }: { value: OmnichannelNavigation; children: ReactNode }) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

/** Ayar ekranları sekme/merkez değiştirmek için kullanır; yalnız Omnichannel kabuğunun içinde çağrılır. */
export function useOmnichannelNav(): OmnichannelNavigation {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error('useOmnichannelNav yalnız OmnichannelNavigationProvider içinde kullanılır.');
  return navigation;
}
