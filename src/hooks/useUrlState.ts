'use client';

import { useCallback, useMemo, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// Filtre/sıralama/sayfa durumunu URL'de tutar. `useState` yerine bunu kullanınca:
//   • Geri tuşu çalışır (önceki filtreye döner)
//   • Link paylaşılabilir ("şu filtreli ekrana bak")
//   • Sayfa yenilenince durum kaybolmaz
//
// Varsayılan değerler URL'e YAZILMAZ — aksi halde adres `?page=1&status=&sort=name_asc`
// gibi gürültüyle dolar ve paylaşılan link okunaksız olur.
//
// `router.replace` kullanılıyor: her filtre değişikliği tarayıcı geçmişine ayrı bir kayıt
// bırakırsa geri tuşu kullanılamaz hale gelir (10 kez basıp aynı sayfada kalırsın).

type Serializable = string | number | undefined;

export function useUrlState<T extends Record<string, Serializable>>(defaults: T) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo(() => {
    const out = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const raw = searchParams.get(String(key));
      if (raw === null) continue;
      // Varsayılanın tipine göre çöz — number alan URL'den string olarak gelir.
      out[key] = (typeof defaults[key] === 'number' ? Number(raw) : raw) as T[keyof T];
    }
    return out;
  }, [searchParams, defaults]);

  // Guncel degerler REF'te tutulur ve setState onlari CAGRILDIGI AN okur.
  //
  // NEDEN: eskiden setState, searchParams'i BAGIMLILIK olarak alip closure'a yakaliyordu.
  // Gecikmeli bir cagirandan (orn. siparis ekranindaki 450 ms'lik arama debounce'u)
  // cagrildiginda ESKI searchParams uzerine yaziyordu: kullanici yazmaya basladiktan sonra
  // 450 ms icinde bir filtre degistirirse, arama yazimi O FILTREYI GERI ALIYORDU.
  //
  // Yan fayda: setState artik referans olarak SABIT. Bagimlilik listesine konabilir ve
  // konmadiginda da bayat kalmaz — uyarinin kendisi de ortadan kalkar.
  const latest = useRef({ searchParams, pathname, defaults });
  latest.current = { searchParams, pathname, defaults };

  const setState = useCallback(
    (patch: Partial<T>) => {
      const current = latest.current;
      const next = new URLSearchParams(current.searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        const isDefault = value === current.defaults[key as keyof T];
        if (value === undefined || value === '' || isDefault) next.delete(key);
        else next.set(key, String(value));
      }
      const query = next.toString();
      router.replace(query ? `${current.pathname}?${query}` : current.pathname, { scroll: false });
    },
    [router],
  );

  /** Tüm filtreleri temizler (boş durumdaki "Filtreleri Temizle" için). */
  const reset = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return { state, setState, reset };
}
