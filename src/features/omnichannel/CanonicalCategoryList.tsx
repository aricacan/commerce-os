'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { CanonicalCategoryDto, TaxonomyLanguage } from '../../lib/api/category-taxonomy';
import { compactInputClass, secondaryButtonClass } from './formClasses';
import { LANGUAGE_LABELS, SOURCE_TYPE_LABELS, TAXONOMY_LANGUAGES, displayName, termsByLanguage } from './categoryTaxonomyRules';

interface Props {
  categories: CanonicalCategoryDto[];
  busy: boolean;
  onAddTerm: (categoryId: number, language: TaxonomyLanguage, term: string) => void;
  onDeleteTerm: (termId: number) => void;
  onUnlink: (linkId: number) => void;
}

const CHIP = 'inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px]';

function TermAdder({ categoryId, busy, onAdd }: { categoryId: number; busy: boolean; onAdd: Props['onAddTerm'] }) {
  const [language, setLanguage] = useState<TaxonomyLanguage>('tr');
  const [term, setTerm] = useState('');
  const submit = () => {
    if (!term.trim()) return;
    onAdd(categoryId, language, term.trim());
    setTerm('');
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Dil" value={language} onChange={(e) => setLanguage(e.target.value as TaxonomyLanguage)}
        className={`${compactInputClass} w-auto`}>
        {TAXONOMY_LANGUAGES.map((l) => <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>)}
      </select>
      <input aria-label="Yeni eşanlam" value={term} placeholder="Eşanlam ekle" maxLength={128}
        onChange={(e) => setTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
        className={`${compactInputClass} w-48`} />
      <button type="button" disabled={busy || !term.trim()} onClick={submit} className={secondaryButtonClass}>
        <Plus size={13} /> Ekle
      </button>
    </div>
  );
}

function CategoryCard({ category, busy, onAddTerm, onDeleteTerm, onUnlink }: Omit<Props, 'categories'> & { category: CanonicalCategoryDto }) {
  const terms = termsByLanguage(category);
  return (
    <li className="flex flex-col gap-2 px-3 py-3 text-xs">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-sm font-bold text-[var(--fg)]">{displayName(category)}</span>
        <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">{category.code}</span>
        {!category.isActive && <span className="text-[10.5px] text-[var(--fg-muted)]">(pasif)</span>}
      </div>

      <div className="grid gap-1.5 md:grid-cols-[6rem_minmax(0,1fr)]">
        {TAXONOMY_LANGUAGES.map((language) => (
          <div key={language} className="contents">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">{LANGUAGE_LABELS[language]}</span>
            <span className="flex flex-wrap gap-1">
              {terms[language].map((term) => (
                <span key={term.id}
                  className={`${CHIP} ${term.isPrimary ? 'bg-[var(--fg)] font-semibold text-[var(--bg)]' : 'bg-[var(--bg-subtle)] text-[var(--fg)]'}`}>
                  {term.term}
                  {!term.isPrimary && (
                    <button type="button" aria-label={`${term.term} eşanlamını sil`} disabled={busy}
                      onClick={() => onDeleteTerm(term.id)} className="cursor-pointer opacity-60 hover:opacity-100">
                      <X size={11} />
                    </button>
                  )}
                </span>
              ))}
            </span>
          </div>
        ))}
        <span className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--fg-muted)]">Eşlenenler</span>
        <span className="flex flex-wrap gap-1">
          {category.links.length === 0 && <span className="text-[var(--fg-muted)]">—</span>}
          {category.links.map((link) => (
            <span key={link.id} title={SOURCE_TYPE_LABELS[link.sourceType]}
              className={`${CHIP} border border-[var(--border)] text-[var(--fg)]`}>
              {link.siteName ? `${link.siteName} › ${link.sourceLabel}` : link.sourceLabel}
              <button type="button" aria-label={`${link.sourceLabel} eşlemesini kaldır`} disabled={busy}
                onClick={() => onUnlink(link.id)} className="cursor-pointer opacity-60 hover:opacity-100">
                <X size={11} />
              </button>
            </span>
          ))}
        </span>
      </div>

      <TermAdder categoryId={category.id} busy={busy} onAdd={onAddTerm} />
    </li>
  );
}

// Kanonik kategoriler: dil bazında birincil ad (koyu) + eşanlamlar ve bu hesabın eşlenen ERP/site kategorileri.
export function CanonicalCategoryList({ categories, ...actions }: Props) {
  return (
    <ul className="m-0 list-none divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-0 shadow-xs">
      {categories.map((category) => <CategoryCard key={category.id} category={category} {...actions} />)}
    </ul>
  );
}
