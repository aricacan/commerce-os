'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import tr, { type TranslationKey } from './translations/tr';
import en from './translations/en';

type Lang = 'tr' | 'en';
type Translations = Record<TranslationKey, string>;

const dicts: Record<Lang, Translations> = {
  tr: tr as Translations,
  en: en as Translations,
};

interface I18nCtx {
  lang: Lang;
  t: (key: TranslationKey) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nCtx>({
  lang: 'tr',
  t: (k) => k,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('tr');

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null;
    if (saved === 'tr' || saved === 'en') setTimeout(() => setLangState(saved), 0);
  }, []);

  // <html lang> statik olarak "tr" ile geliyor (bkz. app/layout.tsx) — client tarafında
  // secili dile senkronize edilmezse tarayici buyuk harfe cevirme (CSS text-transform)
  // gibi locale'e duyarli davranislarda Ingilizce metinde bile Turkce kurallari
  // uyguluyor (ör. "ENGLISH" yerine "ENGLİSH").
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => (dicts[lang] as Translations)[key] ?? key,
    [lang],
  );

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
