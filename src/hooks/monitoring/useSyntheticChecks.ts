'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  syntheticChecksApi,
  type SyntheticOverviewDto,
  type SyntheticRunRequestDto,
  type SyntheticSettingsDto,
} from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { describeError } from '../../lib/errors';
import { applyOptimistic, rollbackOptimistic, type OptimisticContext } from '../../lib/optimistic';
import { pushAlert } from '../../stores/alert-stack';

const KEYS = queryKeys.syntheticChecks;

// Bot kontrolleri dakikalar arayla koşar; dakikada bir tazelemek yeterince "canlı".
const OVERVIEW_REFRESH_MS = 60_000;
// "Şimdi çalıştır" arka planda koşar — sonuç birkaç saniye sonra yazılır. Hemen yenilemek
// eski sonucu gösterir; kısa bir süre sonra bir kez daha yenilemek yeni sonucu yakalar.
const AFTER_RUN_REFRESH_MS = 15_000;

// Görünürlük oturum boyunca değişmez; bir kez sorulur. Hata/yükleniyor → görünmez
// (güvenli taraf; sunucu zaten 403 döner).
export function useSyntheticAccess(): boolean {
  const query = useQuery({
    queryKey: KEYS.access,
    queryFn: syntheticChecksApi.getAccess,
    staleTime: Infinity,
  });
  return query.data?.canView ?? false;
}

/** `enabled` false → istek hiç atılmaz (işletmeci olmayanlarda 403 gürültüsü olmasın). */
export function useSyntheticOverview(enabled = true) {
  return useQuery({
    queryKey: KEYS.overview,
    queryFn: syntheticChecksApi.getOverview,
    enabled,
    staleTime: OVERVIEW_REFRESH_MS / 2,
    refetchInterval: enabled ? OVERVIEW_REFRESH_MS : false,
  });
}

// Geçmiş yalnız çekmece açıkken çekilir (key null → sorgu kapalı).
export function useSyntheticHistory(key: string | null) {
  return useQuery({
    queryKey: KEYS.history(key ?? ''),
    queryFn: () => syntheticChecksApi.getHistory(key ?? ''),
    enabled: key !== null,
  });
}

function useRefreshResults() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: KEYS.overview });
    void qc.invalidateQueries({ queryKey: KEYS.histories });
  };
}

// Tek kontrolü ya da bütün katmanı kuyruğa alır. 400/429 (ör. "çok sık çalıştırıldı")
// Türkçe ProblemDetails olarak gelir; mesaj olduğu gibi gösterilir.
export function useRunSyntheticChecks() {
  const refresh = useRefreshResults();
  return useMutation({
    meta: { silentError: true } as const,
    mutationFn: (target: SyntheticRunRequestDto) => syntheticChecksApi.run(target),
    onSuccess: () => {
      pushAlert('Kontrol kuyruğa alındı — sonuç birkaç saniye içinde burada görünür.', 'success');
      setTimeout(refresh, AFTER_RUN_REFRESH_MS);
    },
    onError: (error) => {
      pushAlert(describeError(error), 'error');
    },
  });
}

// Anahtarlar anında tepki verir (iyimser güncelleme); sunucu reddederse eski hâline döner.
export function useUpdateSyntheticSettings() {
  const qc = useQueryClient();
  return useMutation<void, Error, SyntheticSettingsDto, OptimisticContext<SyntheticOverviewDto>>({
    meta: { silentError: true } as const,
    mutationFn: (settings) => syntheticChecksApi.updateSettings(settings),
    onMutate: (settings) =>
      applyOptimistic<SyntheticOverviewDto>(qc, KEYS.overview, (old) => ({ ...old, settings })),
    onError: (error, _settings, context) => {
      rollbackOptimistic(qc, context);
      pushAlert(describeError(error), 'error');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEYS.overview }),
  });
}
