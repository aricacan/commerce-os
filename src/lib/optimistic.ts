import type { QueryClient, QueryKey } from '@tanstack/react-query';

// Optimistic update'in tekrar eden üç adımı: uçuştaki sorguyu iptal et, eski veriyi
// sakla, cache'i şimdiden güncelle. Hata olursa eski veri geri yazılır.
//
// Bu üçlü elle yazıldığında en sık atlanan adım `cancelQueries`: iptal edilmezse
// devam eden bir GET, optimistic değişikliğin ÜSTÜNE eski veriyi yazar ve kullanıcı
// değişikliğin geri alındığını sanır.

export interface OptimisticContext<T> {
  key: QueryKey;
  previous: T | undefined;
}

/**
 * Cache'i hemen günceller ve geri alma için gereken bağlamı döndürür.
 * `useMutation.onMutate` içinden çağır, dönen değeri context olarak ver.
 */
export async function applyOptimistic<T>(
  qc: QueryClient,
  key: QueryKey,
  updater: (old: T) => T,
): Promise<OptimisticContext<T>> {
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<T>(key);
  if (previous !== undefined) {
    qc.setQueryData<T>(key, updater(previous));
  }
  return { key, previous };
}

/** `useMutation.onError` içinden çağır — cache'i işlemden önceki haline döndürür. */
export function rollbackOptimistic<T>(
  qc: QueryClient,
  context: OptimisticContext<T> | undefined,
): void {
  if (!context || context.previous === undefined) return;
  qc.setQueryData<T>(context.key, context.previous);
}
