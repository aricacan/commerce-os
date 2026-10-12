'use client';

import { Languages } from 'lucide-react';
import { focusRing, motionFast } from '../shared/design';
import { TRANSLATION_LANGUAGES, translationLanguageLabel, type TranslationLanguageCode } from './translationLanguages';
import type { TranscriptTranslationState } from './useTranscriptTranslation';

interface Props {
  translation: TranscriptTranslationState;
  // Çevrilebilir mesaj sayısı (0 = boş sohbet: düğme pasif).
  translatableCount: number;
  // Çeviriden sonra gelip çevrilmemiş mesaj sayısı.
  untranslatedCount: number;
  // Masaüstü üst çubuğunda satırın içinde, küçük çizilir (kendi satırı/kenarlığı yok; çeviri bilgisi ipucudadır).
  compact?: boolean;
}

const BUTTON_BASE =
  `inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card font-semibold text-fg hover:bg-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 ${motionFast} ${focusRing}`;
const BUTTON_CLASS = `${BUTTON_BASE} h-8 px-2.5 text-ui-sm`;
const COMPACT_BUTTON_CLASS = `${BUTTON_BASE} h-7 shrink-0 whitespace-nowrap px-2 text-ui-xs`;

// Sohbetin üstündeki çeviri çubuğu: dil seçici + "Sohbeti çevir". Çeviri YALNIZ düğmeye basınca yapılır.
export function TranscriptTranslateBar({ translation, translatableCount, untranslatedCount, compact = false }: Props) {
  const { language, translations, translatedLanguage, truncated, visible, loading, error } = translation;
  const hasTranslation = translatedLanguage !== null;
  const empty = translatableCount === 0;
  const buttonClass = compact ? COMPACT_BUTTON_CLASS : BUTTON_CLASS;
  const info = hasTranslation && visible && translations.size > 0
    ? (truncated
      ? `Sohbet uzun: yalnız en son mesajlar çevrildi (${translationLanguageLabel(translatedLanguage)}).`
      : `Çeviri: ${translationLanguageLabel(translatedLanguage)}`)
    : null;

  return (
    <div
      role="group"
      aria-label="Sohbet çevirisi"
      title={error ?? info ?? undefined}
      className={compact
        ? 'flex shrink-0 items-center gap-1.5'
        : 'flex shrink-0 flex-wrap items-center gap-2 border-b border-border-soft bg-card px-3 py-1.5 md:px-4'}
    >
      <Languages size={compact ? 13 : 14} className="shrink-0 text-fg-muted" aria-hidden />
      <select
        value={language}
        disabled={loading}
        onChange={(e) => translation.selectLanguage(e.target.value as TranslationLanguageCode)}
        aria-label="Çeviri dili"
        className={`max-w-40 cursor-pointer rounded-md border border-border-soft bg-bg-subtle text-fg disabled:opacity-50 ${focusRing} ${compact ? 'h-7 px-1.5 text-ui-xs' : 'h-8 px-2 text-ui-sm'}`}
      >
        {TRANSLATION_LANGUAGES.map((option) => (
          <option key={option.code} value={option.code}>{option.label}</option>
        ))}
      </select>

      {!hasTranslation && (
        <button
          type="button"
          onClick={translation.translate}
          disabled={loading || empty}
          title={empty ? 'Çevrilecek mesaj yok' : undefined}
          className={buttonClass}
        >
          {loading ? 'Çevriliyor…' : 'Sohbeti çevir'}
        </button>
      )}

      {hasTranslation && (
        <button type="button" onClick={translation.toggleVisible} disabled={loading} aria-pressed={visible} className={buttonClass}>
          {visible ? 'Çeviriyi gizle' : 'Çeviriyi göster'}
        </button>
      )}

      {hasTranslation && untranslatedCount > 0 && (
        <button type="button" onClick={translation.translate} disabled={loading} className={buttonClass}>
          {loading ? 'Çevriliyor…' : compact ? `Yeni (${untranslatedCount})` : `Yeni mesajları çevir (${untranslatedCount})`}
        </button>
      )}

      {/* Üst çubukta (compact) yalnız hata görünür; çeviri bilgisi ipucundadır. */}
      <p aria-live="polite" className={`m-0 min-w-0 text-ui-xs ${error ? 'text-[var(--danger)]' : 'text-fg-muted'} ${compact && !error ? 'sr-only' : ''}`}>
        {loading && hasTranslation && 'Çevriliyor…'}
        {error}
        {!error && !loading && hasTranslation && visible && translations.size === 0 && 'Çevrilecek metin bulunamadı.'}
        {!error && !loading && hasTranslation && visible && translations.size > 0 && (
          truncated
            ? `Sohbet uzun: yalnız en son mesajlar çevrildi (${translationLanguageLabel(translatedLanguage)}).`
            : `Çeviri: ${translationLanguageLabel(translatedLanguage)}`
        )}
      </p>
    </div>
  );
}
