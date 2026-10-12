const MAX_ACCOUNT_LABEL_LENGTH = 28;
const ELLIPSIS = '…';

export interface ChannelIdentity {
  // Platform + hesap/sayfa adı: "Facebook · Inthermform". Kırpılmış, listede görünen metin.
  label: string;
  // Kırpılmamış tam kimlik (tooltip): marka ve ülke de dahil.
  tooltip: string;
}

interface ChannelIdentityInput {
  platformLabel: string;
  channelName: string;
  brandName?: string | null;
  country?: string | null;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Kanal adı çoğu zaman platformu da içerir ("StoreC · Facebook"); platform ayrıca yazıldığı
// için adın içinden ayıklanır ki "Facebook · StoreC · Facebook" gibi tekrar oluşmasın.
export function channelAccountName(channelName: string, platformLabel: string): string {
  const platform = escapeRegExp(platformLabel);
  const stripped = channelName
    .replace(new RegExp(`[\\s·|\\-–:]+${platform}\\s*$`, 'i'), '')
    .replace(new RegExp(`^\\s*${platform}[\\s·|\\-–:]+`, 'i'), '')
    .trim();
  return stripped === '' ? channelName.trim() : stripped;
}

export function clipLabel(text: string, maxLength = MAX_ACCOUNT_LABEL_LENGTH): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}${ELLIPSIS}`;
}

export function channelIdentity({ platformLabel, channelName, brandName, country }: ChannelIdentityInput): ChannelIdentity {
  const account = channelAccountName(channelName, platformLabel);
  const parts = [platformLabel, account, brandName, country].filter((part): part is string => !!part);
  return {
    label: `${platformLabel} · ${clipLabel(account)}`,
    tooltip: parts.join(' · '),
  };
}
