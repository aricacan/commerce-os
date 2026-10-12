'use client';

import { useEffect, useState } from 'react';
import { crmApi, type CustomerTagDto } from '../../lib/api/customers';
import { InboxFilterSelect } from './InboxFilterSelect';
import { useOmnichannelCountries } from './useOmnichannelCountries';

// Gelen kutusunun ek filtreleri (Faz 9): ülke ve müşteri etiketi. Kanal/durum filtreleriyle
// birlikte (VE) uygulanır.
export interface InboxDetailFilter {
  country: string | null;
  tagId: number | null;
}

export const EMPTY_DETAIL_FILTER: InboxDetailFilter = { country: null, tagId: null };

export const hasDetailFilter = (value: InboxDetailFilter) => value.country !== null || value.tagId !== null;

export function InboxDetailFilters({ value, onChange }: {
  value: InboxDetailFilter; onChange: (value: InboxDetailFilter) => void;
}) {
  const { countries } = useOmnichannelCountries();
  const [tags, setTags] = useState<CustomerTagDto[]>([]);

  // Etiket listesi yüklenemezse filtre yalnız gizlenir; gelen kutusu çalışmaya devam eder.
  useEffect(() => {
    void crmApi.tags().then(setTags).catch(() => setTags([]));
  }, []);

  return (
    <>
      {countries.length > 1 && (
        <InboxFilterSelect
          ariaLabel="Ülke"
          value={value.country ?? ''}
          placeholder="Tüm ülkeler"
          options={countries.map((c) => ({ value: c.code, label: c.name }))}
          onChange={(v) => onChange({ ...value, country: v === '' ? null : v })}
        />
      )}
      {tags.length > 0 && (
        <InboxFilterSelect
          ariaLabel="Müşteri etiketi"
          value={value.tagId === null ? '' : String(value.tagId)}
          placeholder="Tüm etiketler"
          options={tags.map((t) => ({ value: String(t.id), label: t.name }))}
          onChange={(v) => onChange({ ...value, tagId: v === '' ? null : Number(v) })}
        />
      )}
    </>
  );
}
