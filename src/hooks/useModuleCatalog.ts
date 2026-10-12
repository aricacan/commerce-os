'use client';

import { useQuery } from '@tanstack/react-query';
import { settingsApi, type ModuleCatalogEntry, type ModuleKind } from '../lib/api/settings';

// MODÜL KATALOĞU — ön yüzün TEK kaynağı.
//
// Önceden "modül" kavramı DÖRT ayrı listede tanımlıydı ve hiçbiri diğerini zorlamıyordu:
//   1. useAppCatalog        → Uygulamalar menüsünde görünsün mü
//   2. SystemModuleCatalog  → Ayarlar'dan kapatılabilsin mi        (backend)
//   3. ModuleGateMiddleware → kapalıyken API'si 403 dönsün mü      (backend)
//   4. APP_MODULE_KEYS      → kullanıcı bazlı yetki verilebilsin mi
//
// Sonuç: Sonar menüde görünüyordu ama kapatılamıyordu; warehouse/forecast/partnerhub ne
// kapatılabiliyor ne kısıtlanabiliyordu; connect/nexus/ai kapatınca hiçbir şey olmayan
// sahte anahtarlardı; fitment kapatılınca sol panelde kalıp 403 veriyordu.
//
// Artık dördü de backend'deki ModuleRegistry'den türer. Burada YALNIZCA ikon eşlemesi
// kalır — ikon backend'e ait bir bilgi değil.

export type { ModuleCatalogEntry, ModuleKind };

export interface ModuleCatalog {
  /** Sorgular yüklenene kadar true — yükleme sırasında yanlışlıkla "yok" göstermemek için. */
  isLoading: boolean;
  /** Katalogdaki TÜM modüller (kapalı olanlar dahil). */
  all: ModuleCatalogEntry[];
  /** Bu kiracıda AÇIK olan modüller. */
  enabled: ModuleCatalogEntry[];
  /** Ayarlar > Modüller ekranının listesi. */
  togglable: ModuleCatalogEntry[];
  /** Yetkiler ekranında kullanıcı bazlı verilebilecek modüller. */
  grantable: ModuleCatalogEntry[];
  find: (moduleKey: string) => ModuleCatalogEntry | undefined;
  /** Bu kiracıda modül açık mı. Katalogda olmayan anahtar için true (kapı yoksa engel de yok). */
  isEnabled: (moduleKey: string) => boolean;
  /** Modül bu sunucuda yüklü mü. Katalogda olmayan anahtar için true. */
  isAvailableOnServer: (moduleKey: string) => boolean;
}

const EMPTY: ModuleCatalogEntry[] = [];

export function useModuleCatalog(): ModuleCatalog {
  const { data = EMPTY, isLoading } = useQuery({
    queryKey: ['module-catalog'],
    queryFn: settingsApi.getModuleCatalog,
    staleTime: 30_000,
  });

  const byKey = new Map(data.map((entry) => [entry.key.toLowerCase(), entry]));

  return {
    isLoading,
    all: data,
    enabled: data.filter((entry) => entry.enabled),
    togglable: data.filter((entry) => entry.togglable),
    grantable: data.filter((entry) => entry.grantablePerUser),
    find: (moduleKey) => byKey.get(moduleKey.toLowerCase()),
    // Katalogda olmayan anahtar: backend'de kapısı yok demektir, engellemek yanlış olurdu.
    isEnabled: (moduleKey) => byKey.get(moduleKey.toLowerCase())?.enabled ?? true,
    isAvailableOnServer: (moduleKey) => byKey.get(moduleKey.toLowerCase())?.availableOnServer ?? true,
  };
}
