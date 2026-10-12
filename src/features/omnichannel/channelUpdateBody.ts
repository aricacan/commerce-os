import type { ChannelDto, ChannelUpdateBody } from '../../lib/api/omnichannel';

/**
 * Kanal kaydının mevcut değerlerinden güncelleme gövdesi; `patch` yalnız değişen alanları üzerine yazar.
 * Kimlik bilgisi gönderilmez (sunucu mevcut anahtarları korur). Kanal Merkezi'ndeki hızlı değişiklikler
 * (katalog profili, bot açık/kapalı) tüm formu açmadan bu gövdeyle kaydedilir.
 */
export function channelUpdateBody(channel: ChannelDto, patch: Partial<ChannelUpdateBody>): ChannelUpdateBody {
  return {
    displayName: channel.displayName,
    storeCode: channel.storeCode,
    country: channel.country,
    catalogProfileId: channel.catalogProfileId ?? null,
    brandId: channel.brandId ?? null,
    botEnabled: channel.botEnabled,
    isActive: channel.isActive,
    assignmentPolicy: channel.assignmentPolicy,
    firstResponseSlaMinutes: channel.firstResponseSlaMinutes ?? null,
    welcomeMessageTr: channel.welcomeMessageTr,
    welcomeMessageEn: channel.welcomeMessageEn,
    welcomeMessageSq: channel.welcomeMessageSq ?? null,
    credentials: null,
    ...patch,
  };
}
