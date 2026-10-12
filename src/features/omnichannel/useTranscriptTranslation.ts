'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';
import {
  readRememberedLanguage, rememberLanguage, type TranslationLanguageCode,
} from './translationLanguages';

export interface TranscriptTranslationState {
  language: TranslationLanguageCode;
  // Çevirisi alınmış mesajlar: mesaj id → çeviri metni. Boşsa henüz çevrilmedi.
  translations: ReadonlyMap<number, string>;
  // Çeviri alınan dil (seçili dilden farklı olabilir: yeni dil yüklenirken eskisi görünür kalır).
  translatedLanguage: string | null;
  truncated: boolean;
  visible: boolean;
  loading: boolean;
  error: string | null;
  translate: () => void;
  selectLanguage: (language: TranslationLanguageCode) => void;
  toggleVisible: () => void;
}

// "Tüm sohbeti çevir" — YALNIZ kullanıcı düğmeye basınca istek atar (maliyet + gizlilik); yeni gelen
// mesajlar otomatik çevrilmez. Konuşma değişince görünüm sıfırlanır; geç gelen eski yanıt yok sayılır.
export function useTranscriptTranslation(conversationId: number): TranscriptTranslationState {
  const [language, setLanguage] = useState<TranslationLanguageCode>(readRememberedLanguage);
  const [translations, setTranslations] = useState<ReadonlyMap<number, string>>(new Map());
  const [translatedLanguage, setTranslatedLanguage] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setTranslations(new Map());
    setTranslatedLanguage(null);
    setTruncated(false);
    setVisible(false);
    setLoading(false);
    setError(null);
  }, [conversationId]);

  const run = useCallback(async (target: TranslationLanguageCode) => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await omnichannelApi.translateConversation(conversationId, target);
      if (current !== requestId.current) return;
      setTranslations(new Map(result.items.map((item) => [item.messageId, item.translatedText])));
      setTranslatedLanguage(result.targetLanguage);
      setTruncated(result.truncated);
      setVisible(true);
    } catch (e) {
      if (current === requestId.current) setError(describeError(e));
    } finally {
      if (current === requestId.current) setLoading(false);
    }
  }, [conversationId]);

  const translate = useCallback(() => {
    if (!loading) void run(language);
  }, [loading, language, run]);

  // Çeviri açıkken dil değişirse yeni dile yeniden çevrilir; açık değilse yalnız tercih saklanır.
  const selectLanguage = useCallback((next: TranslationLanguageCode) => {
    setLanguage(next);
    rememberLanguage(next);
    if (translatedLanguage !== null) void run(next);
  }, [translatedLanguage, run]);

  const toggleVisible = useCallback(() => setVisible((value) => !value), []);

  return {
    language, translations, translatedLanguage, truncated, visible, loading, error,
    translate, selectLanguage, toggleVisible,
  };
}
