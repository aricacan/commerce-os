'use client';

import { useState } from 'react';
import { DiscountCodesSection } from './DiscountCodesSection';
import { GiftCardsSection } from './GiftCardsSection';
import { ghostButtonClass, primaryButtonClass } from './styles';

interface Props {
  storeId: number;
}

const SECTIONS = [
  { key: 'codes', label: 'İndirim kodları' },
  { key: 'gift-cards', label: 'Hediye kartları' },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

// İndirimler sekmesi: indirim kodları ve hediye kartları alt bölümleri.
export function DiscountsTab({ storeId }: Props) {
  const [section, setSection] = useState<SectionKey>('codes');

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" aria-label="İndirim bölümleri" className="flex gap-2">
        {SECTIONS.map(({ key, label }) => (
          <button
            key={key} type="button" role="tab" aria-selected={section === key}
            className={section === key ? primaryButtonClass : ghostButtonClass} onClick={() => setSection(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {section === 'codes' ? <DiscountCodesSection storeId={storeId} /> : <GiftCardsSection storeId={storeId} />}
    </div>
  );
}
