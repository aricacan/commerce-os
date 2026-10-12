'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { ErpisDateField, ErpisQueryFilter, ErpisScope } from '@/lib/api';
import { resolveErpisBucket } from '../../components/dashboard/erpis/erpisBucket';

// Erpis filtre durumu URL'de tutulur.
//
// Ortak `useUrlState` yalnız skaler alan taşıyor; buradaki filtrenin yarısı çoklu seçim
// (marka, model, cari…). Onu genişletmek yerine modüle özel bir hook yazıldı: dizi
// serileştirme kuralı (tekrarlı parametre) yalnız bu filtrenin işi.
//
// Kazanç: link paylaşılabilir ("şu markanın açık siparişlerine bak"), geri tuşu çalışır,
// sayfa yenilenince filtre kaybolmaz.

const ARRAY_KEYS = [
  'brands', 'models', 'productTypes', 'currencies', 'countries',
  'seg1', 'seg2', 'seg3', 'skuKinds', 'itemKinds', 'skuPatterns', 'cardTags',
] as const;

const NUMBER_ARRAY_KEYS = ['vehicleModelIds', 'categoryIds', 'partyIds'] as const;

const NUMBER_KEYS = ['yearFrom', 'yearTo'] as const;

// Yol `usePathname()` yerine adres çubuğundan okunur.
//
// Workspace kabuğu sekme değişimini `history.replaceState` ile yazıyor (rota bileşenini
// yeniden mount etmemek için) ve Next'in kendi yol durumu bu değişimi görmüyor. Hook'un
// döndürdüğü eski yolu kullanmak, filtre değiştirildiğinde kullanıcıyı önceki sekmeye
// geri atıyordu.
function currentPath(): string {
  return window.location.pathname;
}

// Filtre değişimi ADRESİN YALNIZ SORGU KISMINI değiştirir; `router.replace` KULLANILMAZ.
//
// Sekme değişimi yolu `history.replaceState` ile yazdığı için Next hâlâ eski yolu biliyor.
// Filtreyi `router.replace(yeniYol + ?query)` ile yazmak, Next'in `[[...section]]`
// segmentini değişmiş görmesine ve rotayı baştan mount etmesine yol açıyordu: sunum modu
// kapanıp görünüm Genel Bakış'a dönüyordu (sekme değişiminden sonraki İLK filtrede).
// Native replaceState Next router'a bağlıdır — `useSearchParams` günceli görür, mount yok.
function writeQuery(query: string): void {
  window.history.replaceState(null, '', query ? `${currentPath()}?${query}` : currentPath());
}

export function useErpisFilterState(companyId: number | null) {
  const params = useSearchParams();

  const filter = useMemo<ErpisQueryFilter>(() => {
    const next: ErpisQueryFilter = { companyId };

    for (const key of ARRAY_KEYS) {
      const values = params.getAll(key);
      if (values.length > 0) next[key] = values;
    }

    for (const key of NUMBER_ARRAY_KEYS) {
      const values = params.getAll(key).map(Number).filter((n) => Number.isFinite(n));
      if (values.length > 0) next[key] = values;
    }

    for (const key of NUMBER_KEYS) {
      const raw = params.get(key);
      if (raw !== null && raw !== '' && Number.isFinite(Number(raw))) next[key] = Number(raw);
    }

    const dateField = params.get('dateField');
    if (dateField) next.dateField = dateField as ErpisDateField;

    const from = params.get('from');
    if (from) next.from = from;

    const to = params.get('to');
    if (to) next.to = to;

    // Grafik çözünürlüğü (gün/hafta/ay) KULLANICIYA SORULMAZ, seçili tarih aralığından
    // türetilir — ana panoyla aynı kural (bkz. resolveErpisBucket). Tarih seçicinin yanında
    // ayrı bir "Ay/Gün/Hafta/Yıl" seçicisi, tarihten zaten belli olanı ikinci kez soruyordu;
    // "Bu ay" seçip "Yıl" bırakınca grafik tek noktaya düşüp anlamsızlaşıyordu. Burada,
    // tek yerde türetildiği için Genel Bakış, Excel dışa aktarımı ve sunum AYNI dilimi görür.
    next.bucket = resolveErpisBucket(next.from ?? null, next.to ?? null);

    // Pazar kapsamı da URL'de: yazılıp okunmayan bir parametre, seçicide "Yurt Dışı"
    // görünürken sorgunun tüm pazarları getirmesi demekti.
    const scope = params.get('scope');
    if (scope) next.scope = scope as ErpisScope;

    const search = params.get('search');
    if (search) next.search = search;

    if (params.get('onlyOpen') === 'true') next.onlyOpen = true;

    // İhracat listeleme kayıtları varsayılan olarak DIŞARIDA; kullanıcı açıkça isterse
    // URL'de taşınıyor ki paylaşılan bağlantı aynı rakamları göstersin.
    if (params.get('includeInactiveParties') === 'true') next.includeInactiveParties = true;

    return next;
  }, [params, companyId]);

  // Değişiklikler geçmişe EKLENMEZ, mevcut kayıt değiştirilir: her filtre tıklaması ayrı
  // kayıt bırakırsa geri tuşu kullanılamaz hâle gelir.
  const setFilter = useCallback(
    (patch: Partial<ErpisQueryFilter>) => {
      const next = new URLSearchParams(params.toString());

      for (const [key, value] of Object.entries(patch)) {
        // companyId workspace seçicisinden gelir; bucket tarih aralığından türetilir —
        // ikisi de URL'de tutulmaz.
        if (key === 'companyId' || key === 'bucket') continue;

        next.delete(key);
        if (value == null || value === '' || value === false) continue;

        if (Array.isArray(value)) {
          for (const item of value) next.append(key, String(item));
        } else {
          next.set(key, String(value));
        }
      }

      writeQuery(next.toString());
    },
    [params],
  );

  const reset = useCallback(() => writeQuery(''), []);

  // Rozette gösterilen aktif filtre sayısı — companyId ve varsayılanlar sayılmaz.
  const activeCount = useMemo(() => {
    let count = 0;
    for (const key of [...ARRAY_KEYS, ...NUMBER_ARRAY_KEYS]) {
      if ((filter[key]?.length ?? 0) > 0) count++;
    }
    for (const key of NUMBER_KEYS) if (filter[key] != null) count++;
    if (filter.from || filter.to) count++;
    if (filter.search) count++;
    if (filter.onlyOpen) count++;
    if (filter.includeInactiveParties) count++;
    if (filter.scope && filter.scope !== 'all') count++;
    return count;
  }, [filter]);

  return { filter, setFilter, reset, activeCount };
}
