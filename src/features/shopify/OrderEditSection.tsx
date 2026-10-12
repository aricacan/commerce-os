'use client';

import { useState, type SyntheticEvent } from 'react';
import { CheckCircle2, Pencil } from 'lucide-react';
import type { SaveShopifyOrderBody } from '../../lib/api/shopify-explorer';
import { surfaceCard } from '../shared/design';
import { parseTags, trimmedOrUndefined } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  note: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  // Ödeme alınmış siparişte "ödendi işaretle" gösterilmez.
  canMarkPaid: boolean;
  busy: boolean;
  onSave: (body: SaveShopifyOrderBody) => void;
  onMarkPaid: () => void;
}

const NOTE_MAX_LENGTH = 5000;

// Sipariş detayında not / etiket / iletişim düzenleme ve "ödendi işaretle". Boş alan Shopify'da değişmez.
export function OrderEditSection({ note, email, phone, tags, canMarkPaid, busy, onSave, onMarkPaid }: Props) {
  const [open, setOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note ?? '');
  const [emailDraft, setEmailDraft] = useState(email ?? '');
  const [phoneDraft, setPhoneDraft] = useState(phone ?? '');
  const [tagsDraft, setTagsDraft] = useState(tags.join(', '));

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const parsedTags = parseTags(tagsDraft);
    onSave({
      note: trimmedOrUndefined(noteDraft),
      email: trimmedOrUndefined(emailDraft),
      phone: trimmedOrUndefined(phoneDraft),
      tags: parsedTags.length > 0 ? parsedTags : undefined,
    });
    setOpen(false);
  };

  return (
    <section className="flex flex-col gap-3" aria-label="Sipariş düzenleme">
      <div className="flex flex-wrap gap-2">
        {!open && (
          <button type="button" className={ghostButtonClass} onClick={() => setOpen(true)}>
            <Pencil size={14} aria-hidden /> Not / etiket / iletişimi düzenle
          </button>
        )}
        {canMarkPaid && (
          <button type="button" className={ghostButtonClass} disabled={busy} onClick={onMarkPaid}>
            <CheckCircle2 size={14} aria-hidden /> Ödendi işaretle
          </button>
        )}
      </div>
      {open && (
        <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`}>
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Not
            <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} maxLength={NOTE_MAX_LENGTH} className={fieldClass} />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
              E-posta
              <input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} className={fieldClass} />
            </label>
            <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
              Telefon
              <input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} className={fieldClass} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
            Etiketler (virgülle ayır)
            <input value={tagsDraft} onChange={(e) => setTagsDraft(e.target.value)} className={fieldClass} />
          </label>
          <p className="m-0 text-ui-2xs text-fg-muted">
            Boş bıraktığın alan Shopify&apos;da değişmez; etiketler listeyi tamamen değiştirir.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={primaryButtonClass}>Kaydet</button>
            <button type="button" className={ghostButtonClass} onClick={() => setOpen(false)}>Vazgeç</button>
          </div>
        </form>
      )}
    </section>
  );
}
