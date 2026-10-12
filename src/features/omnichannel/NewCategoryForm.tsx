'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { CanonicalCategoryDto, NewCategoryBody } from '../../lib/api/category-taxonomy';
import { compactInputClass, labelClass, primaryButtonClass, secondaryButtonClass } from './formClasses';
import { CATEGORY_NAME_MAX_LENGTH, newCategoryError, suggestCategoryCode } from './categoryTaxonomyRules';

interface Props {
  existing: CanonicalCategoryDto[];
  busy: boolean;
  onCreate: (body: NewCategoryBody) => Promise<void>;
}

const EMPTY: NewCategoryBody = { code: '', tr: '', sq: '', en: '' };

// "Yeni kanonik kategori": üç dilde birincil ad + kalıcı kod. Kod, kullanıcı elle değiştirmedikçe İngilizce
// addan önerilir. Sözlük tüm hesaplara ortaktır; sunucu yalnız SuperAdmin'e izin verir (reddedilirse hata görünür).
export function NewCategoryForm({ existing, busy, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<NewCategoryBody>(EMPTY);
  const [codeEdited, setCodeEdited] = useState(false);

  const error = body.en || body.tr || body.sq || body.code ? newCategoryError(body, existing) : null;
  const canSubmit = !busy && newCategoryError(body, existing) === null;

  const setName = (field: 'tr' | 'sq' | 'en', value: string) =>
    setBody((prev) => ({
      ...prev,
      [field]: value,
      code: field === 'en' && !codeEdited ? suggestCategoryCode(value) : prev.code,
    }));

  const close = () => {
    setOpen(false);
    setBody(EMPTY);
    setCodeEdited(false);
  };

  const submit = async () => {
    if (!canSubmit) return;
    await onCreate({ ...body, tr: body.tr.trim(), sq: body.sq.trim(), en: body.en.trim() });
    close();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${secondaryButtonClass} self-start`}>
        <Plus size={13} /> Yeni kategori
      </button>
    );
  }

  return (
    <form
      aria-label="Yeni kanonik kategori"
      onSubmit={(e) => { e.preventDefault(); void submit(); }}
      className="flex flex-col gap-3 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {([['tr', 'Türkçe ad'], ['sq', 'Arnavutça ad'], ['en', 'İngilizce ad']] as const).map(([field, label]) => (
          <label key={field} className="min-w-0">
            <span className={labelClass}>{label}</span>
            <input value={body[field]} maxLength={CATEGORY_NAME_MAX_LENGTH} onChange={(e) => setName(field, e.target.value)}
              className={compactInputClass} />
          </label>
        ))}
      </div>
      <label className="max-w-sm">
        <span className={labelClass}>Kalıcı kod</span>
        <input value={body.code} placeholder="floor-mats"
          onChange={(e) => { setCodeEdited(true); setBody((prev) => ({ ...prev, code: e.target.value.trim().toLowerCase() })); }}
          className={compactInputClass} />
        <span className="mt-1 block text-[11px] text-[var(--fg-muted)]">Sonradan değiştirilemez; İngilizce addan önerilir.</span>
      </label>
      {error && <p role="alert" className="m-0 text-[11px] text-rose-500">{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={!canSubmit} className={primaryButtonClass}>Kategoriyi ekle</button>
        <button type="button" onClick={close} className={secondaryButtonClass}>Vazgeç</button>
      </div>
    </form>
  );
}
