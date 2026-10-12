'use client';

import { useState } from 'react';
import { Link2 } from 'lucide-react';
import { FilterSelect, type FilterSelectOption } from '../../components/ui/FilterSelect';
import type { UnmappedCategoryDto } from '../../lib/api/category-taxonomy';
import { secondaryButtonClass } from './formClasses';
import { SOURCE_TYPE_LABELS } from './categoryTaxonomyRules';

interface Props {
  unmapped: UnmappedCategoryDto[];
  options: FilterSelectOption[];
  busy: boolean;
  onLink: (source: UnmappedCategoryDto, canonicalCategoryId: number) => void;
}

function UnmappedRow({ source, options, busy, onLink }: Omit<Props, 'unmapped'> & { source: UnmappedCategoryDto }) {
  // Öneri varsa seçili gelir; kullanıcı yine de değiştirebilir.
  const suggested = source.suggestedCanonicalCategoryId === null ? '' : String(source.suggestedCanonicalCategoryId);
  const [selected, setSelected] = useState(suggested);

  return (
    <li className="flex flex-col gap-2 px-3 py-2.5 text-xs md:grid md:grid-cols-[minmax(0,1.4fr)_5rem_minmax(0,1.2fr)_auto] md:items-center md:gap-3">
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold text-[var(--fg)]">{source.label}</span>
        <span className="truncate text-[10.5px] text-[var(--fg-muted)]">
          {SOURCE_TYPE_LABELS[source.sourceType]}{source.siteName ? ` · ${source.siteName}` : ''}
        </span>
      </span>
      <span className="tabular-nums text-[var(--fg-muted)]">{source.productCount} ürün</span>
      <span className="flex items-center gap-2">
        <FilterSelect value={selected} options={options} placeholder="Kanonik kategori seç" ariaLabel="Kanonik kategori"
          minWidth={180} searchable showAllOption={false} onChange={setSelected} />
        {selected !== '' && selected === suggested && (
          <span className="text-[10.5px] font-semibold text-[var(--fg-muted)]">öneri</span>
        )}
      </span>
      <button type="button" disabled={busy || selected === ''} onClick={() => onLink(source, Number(selected))}
        className={secondaryButtonClass}>
        <Link2 size={13} /> Eşle
      </button>
    </li>
  );
}

// Henüz kanonik kategoriye bağlanmamış ERP/site kategorileri — ürün sayısı çok olan önce. Adı bir taksonomi terimiyle
// birebir eşleşen satırda öneri seçili gelir.
export function UnmappedCategoryList({ unmapped, ...rest }: Props) {
  if (unmapped.length === 0) {
    return <p className="text-[var(--fg-muted)]">Tüm kategoriler eşlenmiş.</p>;
  }
  return (
    <ul className="m-0 list-none divide-y divide-[var(--border-soft)] overflow-hidden rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-0 shadow-xs">
      {unmapped.map((source) => <UnmappedRow key={source.sourceKey} source={source} {...rest} />)}
    </ul>
  );
}
