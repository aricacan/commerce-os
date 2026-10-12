'use client';

import { useState, type SyntheticEvent } from 'react';
import type { SaveShopifyCustomerBody } from '../../lib/api/shopify-explorer';
import { surfaceCard } from '../shared/design';
import { parseTags, trimmedOrUndefined } from './explorerRules';
import { fieldClass, ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  // Düzenlemede mevcut iletişim bilgisi forma gelir; ad/not/etiket boş başlar (boş = değişmez).
  initial?: { email: string | null; phone: string | null };
  title: string;
  busy: boolean;
  onSubmit: (body: SaveShopifyCustomerBody) => void;
  onCancel: () => void;
}

const NOTE_MAX_LENGTH = 5000;

// Müşteri oluştur / düzenle formu. Boş bırakılan alan Shopify'da değişmez; yeni müşteride e-posta ya da telefon gerekir.
export function CustomerForm({ initial, title, busy, onSubmit, onCancel }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');

  const submit = (event: SyntheticEvent) => {
    event.preventDefault();
    const parsedTags = parseTags(tags);
    onSubmit({
      firstName: trimmedOrUndefined(firstName),
      lastName: trimmedOrUndefined(lastName),
      email: trimmedOrUndefined(email),
      phone: trimmedOrUndefined(phone),
      note: trimmedOrUndefined(note),
      tags: parsedTags.length > 0 ? parsedTags : undefined,
    });
  };

  return (
    <form onSubmit={submit} className={`${surfaceCard} flex flex-col gap-3 p-3`} aria-label={title}>
      <h3 className="m-0 text-ui-sm font-bold text-fg">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Ad
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Soyad
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          E-posta
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
          Telefon (+ ülke koduyla)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Not (müşteri görmez)
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX_LENGTH} className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1 text-ui-2xs font-semibold text-fg-muted">
        Etiketler (virgülle ayır)
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={fieldClass} />
      </label>
      <p className="m-0 text-ui-2xs text-fg-muted">Boş bıraktığın alan Shopify&apos;da değişmez.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={primaryButtonClass}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        <button type="button" onClick={onCancel} className={ghostButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
