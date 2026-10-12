'use client';

import { useState } from 'react';
import { Info, ToggleRight } from 'lucide-react';
import {
  featureFlagsApi,
  type FeatureFlagInfoDto,
  type FeatureFlagMatrixDto,
} from '../../lib/api/omnichannel-flags';
import { describeError } from '../../lib/errors';
import { useFeedback } from '../shared/Feedback';
import { FeatureFlagCard, globalBusyKey, scopeBusyKey } from './FeatureFlagCard';
import {
  buildColumns,
  FLAG_TEXTS,
  findOverride,
  scopeLabel,
  valueText,
  type CellMode,
  type FlagScope,
} from './featureFlagMatrix';
import { saveGlobalFlag } from './botSettingsSave';
import { useFeatureFlags } from './useFeatureFlags';

// Özellik bayrakları (P32): her özellik bir kart. Genel değer bot ayarlarına yazılır; marka/ülke
// seçimi o değeri o kapsam için geçersiz kılar. Her değişiklik anında kaydedilir.
export function FeatureFlagsTab() {
  const { matrix, loading, error, reload } = useFeatureFlags();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const { notify } = useFeedback();

  const run = async (key: string, action: () => Promise<void>, successMessage: string) => {
    setBusyKey(key);
    try {
      await action();
      notify.success(successMessage);
      await reload();
    } catch (e) {
      notify.error(describeError(e));
    } finally {
      setBusyKey(null);
    }
  };

  // Yalnız bu bayrak yazılır (tek alanlık uç): diğer ayarlar ve başka sekmedeki kayıt ezilmez.
  const handleGlobalChange = (info: FeatureFlagInfoDto, enabled: boolean) => run(
    globalBusyKey(info),
    () => saveGlobalFlag(info.flag, enabled),
    `${FLAG_TEXTS[info.flag].label}: Genel ${valueText(enabled)}.`,
  );

  const handleScopeChange = (info: FeatureFlagInfoDto, scope: FlagScope, mode: CellMode, matrixNow: FeatureFlagMatrixDto) => run(
    scopeBusyKey(info, scope),
    async () => {
      const existing = findOverride(matrixNow.overrides, info.flag, scope);
      if (mode === 'inherit') {
        if (existing) await featureFlagsApi.remove(existing.id);
        return;
      }
      await featureFlagsApi.save({ flag: info.flag, brandId: scope.brandId, country: scope.country, enabled: mode === 'on' });
    },
    `${FLAG_TEXTS[info.flag].label}: ${scopeLabel(scope)} için güncellendi.`,
  );

  if (loading) return <div className="p-6 text-center text-xs text-[var(--fg-muted)]">Özellikler yükleniyor…</div>;
  if (!matrix) return <div className="p-6 text-xs text-rose-500">{error ?? 'Özellikler okunamadı.'}</div>;

  const columns = buildColumns(matrix.scopes, matrix.overrides);

  return (
    <div className="flex w-full min-w-0 flex-1 flex-col gap-4 p-4 text-xs sm:p-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <ToggleRight size={16} className="text-[var(--fg-muted)]" aria-hidden />
          <h2 className="text-sm font-bold text-[var(--fg)]">Özellikler</h2>
        </div>
        <p className="mt-0.5 flex items-start gap-1.5 text-[11px] text-[var(--fg-muted)]">
          <Info size={12} className="mt-px shrink-0" aria-hidden />
          <span>
            Genel anahtar tüm hesap içindir (Bot ayarlarıyla aynı değer). Bir marka/ülke için Açık ya da Kapalı seçerseniz
            Genel o kapsam için geçersiz kalır; &quot;Genel&quot; seçimi geri alır. Değişiklik anında geçerli olur.
          </span>
        </p>
      </div>

      {error && <div className="text-[11px] text-rose-500">{error}</div>}
      {columns.length === 0 && (
        <div className="rounded-[6px] border border-[var(--border-soft)] p-4 text-[var(--fg-muted)]">
          Aktif kanal bulunamadı; marka/ülke seçenekleri oluşmadı. Kanallar sekmesinden bir kanalı markaya ve ülkeye bağlayın.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {matrix.flags.map((info) => (
          <FeatureFlagCard
            key={info.flag}
            info={info}
            columns={columns}
            overrides={matrix.overrides}
            busyKey={busyKey}
            onGlobalChange={(enabled) => void handleGlobalChange(info, enabled)}
            onScopeChange={(scope, mode) => void handleScopeChange(info, scope, mode, matrix)}
          />
        ))}
      </div>
    </div>
  );
}
