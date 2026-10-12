'use client';

import { useCallback, useState } from 'react';
import { omnichannelApi } from '../../lib/api/omnichannel';
import { describeError } from '../../lib/errors';

interface MessageTranslationState {
  translation: string | null;
  visible: boolean;
  loading: boolean;
  error: string | null;
  toggle: () => void;
}

// Tek müşteri mesajının Türkçesi — istek anında çekilir, balonda saklanır; gizleyip tekrar
// açmak yeni istek atmaz (sunucu da mesaj bazında önbellekler).
export function useMessageTranslation(messageId: number): MessageTranslationState {
  const [translation, setTranslation] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTranslation((await omnichannelApi.translateMessage(messageId)).text);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setLoading(false);
    }
  }, [messageId]);

  const toggle = useCallback(() => {
    if (loading) return;
    const next = !visible;
    setVisible(next);
    if (next && translation === null) void load();
  }, [loading, visible, translation, load]);

  return { translation, visible, loading, error, toggle };
}
