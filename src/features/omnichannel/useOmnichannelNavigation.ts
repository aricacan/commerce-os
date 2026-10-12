'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useInitialTab } from '../../hooks/useInitialTab';
import { parseWorkspacePath, workspaceRoute } from '../../lib/workspace-routes';
import {
  applyView, EMPTY_VIEW, isCenterToggle, parseView, type OmnichannelView,
} from './omnichannelView';
import {
  OMNICHANNEL_URL_KEYS, toOmnichannelTarget, type OmnichannelTabKey, type OmnichannelTarget,
} from './workspace-tabs';

const DEFAULT_TAB: OmnichannelTabKey = 'inbox';

/** `tab` verilmezse mevcut sekmede kalır; verilmeyen görünüm alanları sıfırlanır (eski sekmenin kalıntısı taşınmaz). */
export interface NavigationTarget extends Partial<OmnichannelView> {
  tab?: OmnichannelTabKey;
}

export interface OmnichannelNavigation {
  tab: OmnichannelTabKey;
  /** Adresteki alt sekme ve açık merkez (Next, geri/ileri düğmesini de burada izler). */
  view: OmnichannelView;
  /** Kabuğun sekme anahtarı geldiğinde (menü, Hesap Sağlığı "Düzelt", eski adres): eski anahtar yeni yerine çözülür. */
  changeTab: (key: string) => void;
  go: (target: NavigationTarget) => void;
}

function writeView(view: OmnichannelView, mode: 'push' | 'replace') {
  const params = applyView(new URLSearchParams(window.location.search), view);
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}

/** Adres yolundaki bölüm (/omnichannel/flags) ya da ?tab= — eski anahtarlar yeni yerine çözülür. */
function useInitialTarget(): OmnichannelTarget | null {
  const queryKey = useInitialTab(OMNICHANNEL_URL_KEYS, DEFAULT_TAB);
  const pathname = usePathname();
  const section = parseWorkspacePath(pathname)?.section;
  // Kalkan sayfa anahtarıyla gelen eski ?sub= değeri (ör. /omnichannel/catalog?sub=profiles) sahibi sayfaya yönlenir.
  const legacySub = useSearchParams().get('sub');
  return toOmnichannelTarget(section ?? queryKey, legacySub);
}

/**
 * Omnichannel kabuğunun gezinme durumu: etkin sekme state'te, alt sekme ve açık kanal/profil merkezi adreste.
 * Merkez açılıp kapanınca geçmişe kayıt eklenir (Geri düğmesi merkezi kapatır); alt sekme değişimi eklemez.
 */
export function useOmnichannelNavigation(linkedConversation: boolean): OmnichannelNavigation {
  const initial = useInitialTarget();
  const [tab, setTab] = useState<OmnichannelTabKey>(() => (linkedConversation ? 'inbox' : initial?.tab ?? DEFAULT_TAB));
  const params = useSearchParams();
  const view = useMemo(() => parseView(new URLSearchParams(params.toString())), [params]);
  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  // Eski adres (/omnichannel/flags): alt sekme adrese yazılır, yol yeni sekmeye döner.
  const legacySub = useRef(linkedConversation ? null : initial?.sub ?? null);
  useEffect(() => {
    if (legacySub.current === null) return;
    const sub = legacySub.current;
    legacySub.current = null;
    window.history.replaceState(null, '', `${workspaceRoute('omnichannel')}/${tab}${window.location.search}`);
    writeView({ ...EMPTY_VIEW, sub }, 'replace');
  }, [tab]);

  const go = useCallback((target: NavigationTarget) => {
    const next: OmnichannelView = {
      sub: target.sub ?? null, channelId: target.channelId ?? null, profileId: target.profileId ?? null,
    };
    writeView(next, isCenterToggle(viewRef.current, next) ? 'push' : 'replace');
    if (target.tab) setTab(target.tab);
  }, []);

  const changeTab = useCallback((key: string) => {
    const target = toOmnichannelTarget(key);
    if (!target) return;
    writeView({ ...EMPTY_VIEW, sub: target.sub }, 'replace');
    setTab(target.tab);
  }, []);

  return { tab, view, changeTab, go };
}
