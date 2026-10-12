import type { BotPipelinesDto } from '../../lib/api/omnichannel-eval';
import type { BotPipelineChannelDto } from '../../lib/api/omnichannel-pipelines';

// Omnichannel başlığındaki sürüm rozeti: botun gerçekte hangi sürümle cevap verdiği. Saf kurallar — test edilebilir.

export interface VersionBadgeSummary {
  // Rozette yazan: kanalların çoğunun canlı sürümü (kanal listesi yoksa hesap genelinde etkin varsayılan).
  version: string;
  // Çoğunluktan farklı çalışan kanallar sürüme göre: [{ version: 'v3', count: 1 }].
  exceptions: { version: string; count: number }[];
  // Erişilebilir ad ve ipucu: "v4 · 1 kanal v3".
  label: string;
}

// Kanal listesi yoksa (eski backend / hata) hesap genelinde etkin varsayılan; o da yoksa rozet gösterilmez.
export function summarizeVersionBadge(
  pipelines: BotPipelinesDto | null, channels: readonly BotPipelineChannelDto[] | null,
): VersionBadgeSummary | null {
  const counts = countByVersion(channels ?? []);
  const fallback = pipelines?.effectiveDefault || null;
  const version = majorityVersion(counts, fallback);
  if (version === null) return null;

  const exceptions = [...counts]
    .filter(([v]) => v !== version)
    .map(([v, count]) => ({ version: v, count }))
    .sort((a, b) => b.count - a.count || a.version.localeCompare(b.version));
  const detail = exceptions.map((e) => `${e.count} kanal ${e.version}`);
  return { version, exceptions, label: [version, ...detail].join(' · ') };
}

function countByVersion(channels: readonly BotPipelineChannelDto[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const channel of channels) counts.set(channel.effectiveLive, (counts.get(channel.effectiveLive) ?? 0) + 1);
  return counts;
}

// En çok kanalda çalışan sürüm; eşitlikte hesap varsayılanı, o da eşitlerden değilse en yeni (adı büyük olan).
function majorityVersion(counts: Map<string, number>, fallback: string | null): string | null {
  if (counts.size === 0) return fallback;
  const top = Math.max(...counts.values());
  const leaders = [...counts].filter(([, count]) => count === top).map(([v]) => v);
  if (fallback !== null && leaders.includes(fallback)) return fallback;
  return leaders.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))[0];
}

// Popover satırı: "Canlı v4 · Gölge v3" / kanal hesap genelini izliyorsa "(hesap geneli)".
export function channelVersionLine(channel: BotPipelineChannelDto): string {
  const live = `Canlı ${channel.effectiveLive}${channel.liveVersion === null ? ' (hesap geneli)' : ''}`;
  return channel.effectiveShadow ? `${live} · Gölge ${channel.effectiveShadow}` : live;
}
