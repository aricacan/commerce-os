'use client';

import { useCallback, useRef, useState } from 'react';
import { omnichannelApi, type CustomerLanguageCode } from '../../lib/api/omnichannel';
import {
  needsOutgoingTranslation, planOutgoing, shouldTranslateOutgoing,
  type DraftOrigin, type OutgoingPlan, type OutgoingPreview,
} from './outgoingTranslation';

// 'stale': çeviri beklenirken taslak/anahtar değişti — sonuç yok sayılır, hiçbir şey gönderilmez.
export type OutgoingPlanResult = OutgoingPlan | { kind: 'stale' };

export interface OutgoingTranslationState {
  // Anahtar gösterilsin mi? Müşteri kesin Türkçe değilse (bilinmeyen dil dahil) evet.
  relevant: boolean;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  translating: boolean;
  preview: OutgoingPreview | null;
  editPreview: (translated: string) => void;
  // Önizlemeyi kapatır ve süren çeviriyi geçersiz kılar (taslak değişti, vazgeçildi).
  invalidate: () => void;
  // Hata fırlatabilir — çağıran gösterir; hiçbir durumda çeviri kendiliğinden gönderilmez.
  plan: (text: string, origin: DraftOrigin) => Promise<OutgoingPlanResult>;
}

// Temsilci Türkçe yazar → müşterinin dilinde önizleme → "Çeviriyi gönder" (Gelen Kutusu v2 §4).
export function useOutgoingTranslation(
  conversationId: number, customerLanguage: CustomerLanguageCode | null,
): OutgoingTranslationState {
  // Varsayılan AÇIK: Arnavutça konuşmada temsilcinin Türkçe metni yanlışlıkla gitmesin.
  const [enabled, setEnabledState] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [preview, setPreview] = useState<OutgoingPreview | null>(null);
  // Her geçersizleştirmede artar; yanıt döndüğünde sürüm değiştiyse sonuç bayattır.
  const versionRef = useRef(0);

  const plan = useCallback(async (text: string, origin: DraftOrigin): Promise<OutgoingPlanResult> => {
    const version = versionRef.current;
    setTranslating(true);
    try {
      const result = await planOutgoing(
        conversationId, text, shouldTranslateOutgoing(enabled, customerLanguage, origin),
        omnichannelApi.translateOutgoing);
      if (version !== versionRef.current) return { kind: 'stale' };
      setPreview(result.kind === 'preview' ? result.preview : null);
      return result;
    } finally {
      setTranslating(false);
    }
  }, [conversationId, enabled, customerLanguage]);

  const editPreview = useCallback((translated: string) => {
    setPreview((current) => (current ? { ...current, translated } : current));
  }, []);

  const invalidate = useCallback(() => {
    versionRef.current += 1;
    setPreview(null);
  }, []);

  // Anahtar değişince eski önizleme ve süren çeviri geçersiz.
  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    invalidate();
  }, [invalidate]);

  return {
    relevant: needsOutgoingTranslation(customerLanguage),
    enabled, setEnabled, translating, preview, editPreview, invalidate, plan,
  };
}
