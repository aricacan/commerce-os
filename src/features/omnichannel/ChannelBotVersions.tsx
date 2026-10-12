'use client';

import {
  channelBotOverrideApi, type BotThresholdOverrides, type ChannelBotVersions as Versions,
} from '../../lib/api/omnichannel-channel-bot';
import { canPickShadowVersion, toChannelVersions, VERSION_UNSET, versionOptions } from './channelBotRules';
import { ChannelBotSection } from './ChannelBotSection';
import { formInputClass, labelClass } from './formClasses';
import { UpdatePendingNotice } from './UpdatePendingNotice';
import { useBotPipelines } from './useBotPipelines';
import type { useChannelBotOverride } from './useChannelBotOverride';

interface Props {
  channelId: number;
  versions: Versions;
  // Sürümler eşik gövdesiyle birlikte kaydedilir; mevcut eşikler aynen geri gönderilir.
  overrides: BotThresholdOverrides;
  busy: boolean;
  write: ReturnType<typeof useChannelBotOverride>['write'];
}

// Kanal Merkezi › Bot › Sürüm: kanalın canlı bot hattı ve isteğe bağlı gölge sürüm. Gölge sürüm aynı mesajı
// arka planda cevaplar ama müşteriye göndermez; cevaplar İzleme › Gölge karşılaştırma'da yan yana görünür.
export function ChannelBotVersions({ channelId, versions, overrides, busy, write }: Props) {
  const pipelines = useBotPipelines();
  const known = pipelines.data?.versions ?? [];
  const options = versionOptions(known, versions);
  const custom = versions.liveVersion !== VERSION_UNSET || versions.shadowVersion !== null;

  const save = (live: string, shadow: string) => write(
    () => channelBotOverrideApi.saveThresholds(channelId, overrides, toChannelVersions(live, shadow)),
    'Bot sürümü kaydedildi.',
  );

  return (
    <ChannelBotSection
      title="Sürüm"
      description="Bu kanalda hangi bot hattının cevap vereceği. Gölge sürüm cevap üretir ama müşteriye göndermez."
      custom={custom}
    >
      {pipelines.updatePending && <UpdatePendingNotice />}
      {pipelines.error && <p className="m-0 text-ui-xs text-danger">{pipelines.error}</p>}
      {pipelines.data && (
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="flex min-w-0 flex-col">
            <span className={labelClass}>Canlı sürüm</span>
            <select
              value={versions.liveVersion} disabled={busy} className={formInputClass}
              onChange={(e) => void save(e.target.value, versions.shadowVersion ?? VERSION_UNSET)}
            >
              <option value={VERSION_UNSET}>Hesap varsayılanı ({pipelines.data.effectiveDefault || '—'})</option>
              {options.map((version) => <option key={version} value={version}>{version}</option>)}
            </select>
          </label>
          {canPickShadowVersion(known) ? (
            <label className="flex min-w-0 flex-col">
              <span className={labelClass}>Gölge sürüm</span>
              <select
                value={versions.shadowVersion ?? VERSION_UNSET} disabled={busy} className={formInputClass}
                onChange={(e) => void save(versions.liveVersion, e.target.value)}
              >
                <option value={VERSION_UNSET}>Hesap varsayılanı ({pipelines.data.tenantDefaultShadow ?? 'kapalı'})</option>
                {options.map((version) => <option key={version} value={version}>{version}</option>)}
              </select>
            </label>
          ) : (
            <p className="m-0 self-end text-ui-xs text-fg-muted">
              Sunucuda tek bot sürümü var; gölge karşılaştırma ikinci bir sürüm yayına çıkınca açılır.
            </p>
          )}
        </div>
      )}
    </ChannelBotSection>
  );
}
