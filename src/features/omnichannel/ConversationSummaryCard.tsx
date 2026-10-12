'use client';

import { useState } from 'react';
import { Languages, RefreshCw } from 'lucide-react';
import { CUSTOMER_LANGUAGE_LABELS, type ConversationDigestDto } from '../../lib/api/omnichannel';
import { focusRing, motionFast } from '../shared/design';
import { INFO_SECTION_CLASS, INFO_SECTION_HEADING_CLASS } from './infoSectionStyle';

interface Props {
  digest: ConversationDigestDto;
  loading: boolean;
  onRefresh: () => void;
}

// Bu uzunluğun altındaki özet dört satıra sığar; "Devamı" düğmesi gereksiz olur.
const PREVIEW_MAX_CHARS = 280;

function summaryTextOf(digest: ConversationDigestDto, loading: boolean): string {
  if (loading) return 'Özet hazırlanıyor…';
  return digest.summary ?? 'Özet alınamadı — "Yenile" ile tekrar deneyin.';
}

// Müşteri Türkçe yazmıyorsa "Ayrıntılar" panelinde konuşmanın Türkçe özeti (Gelen Kutusu v2 §4):
// temsilci müşterinin dilini bilmeden ne istendiğini tek bakışta görür. Türkçe konuşmada çizilmez.
// Uzun özet dört satırlık önizlemeyle başlar, "Devamı" ile tamamı açılır.
export function ConversationSummaryCard({ digest, loading, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  if (digest.customerLanguage === 'tr') return null;

  const languageLabel = CUSTOMER_LANGUAGE_LABELS[digest.customerLanguage];
  const text = summaryTextOf(digest, loading);
  const expandable = text.length > PREVIEW_MAX_CHARS;

  return (
    <section aria-label="Konuşma özeti" className={INFO_SECTION_CLASS}>
      <div className={INFO_SECTION_HEADING_CLASS}>
        <Languages size={13} className="shrink-0 text-fg-muted" aria-hidden />
        <h3 className="m-0 text-ui-sm font-bold text-fg">Konuşma özeti (Türkçe)</h3>
        <span className="min-w-0 truncate rounded-md bg-bg-subtle px-1.5 py-0.5 text-ui-2xs font-semibold text-fg-muted">
          Müşteri {languageLabel} yazıyor
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={onRefresh}
          aria-label="Özeti yenile"
          title="Özeti yenile"
          className={`ml-auto flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-40 ${motionFast} ${focusRing}`}
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} aria-hidden />
        </button>
      </div>

      <p className={`m-0 min-w-0 whitespace-pre-wrap break-words text-fg ${
        open ? '' : 'line-clamp-4'
      }`}>
        {text}
      </p>

      {expandable && (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={`cursor-pointer self-start rounded border-0 bg-transparent p-0 text-ui-xs font-semibold text-fg-muted underline hover:text-fg ${focusRing}`}
        >
          {open ? 'Daha az' : 'Devamı'}
        </button>
      )}
    </section>
  );
}
