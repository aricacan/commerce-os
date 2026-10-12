import { CHANNEL_TYPE, type ChannelType } from '../../lib/api/omnichannel';

interface ContactTitleSource {
  contactDisplayName: string | null;
  contactExternalId: string;
  channelType: ChannelType;
}

const SOCIAL_FALLBACK_LABEL: Partial<Record<ChannelType, string>> = {
  [CHANNEL_TYPE.Facebook]: 'Facebook müşterisi',
  [CHANNEL_TYPE.Instagram]: 'Instagram müşterisi',
};
const ID_TAIL_LENGTH = 4;
const PHONE_LIKE = /^[\d+\-() ]+$/;

// Meta kişisinin adı henüz çözülemediyse backend ham kimliği (PSID/IGSID) ad diye bırakır.
const isUnknownName = (name: string | null, externalId: string) =>
  !name || name.trim() === externalId || PHONE_LIKE.test(name.trim());

// Gelen kutusunda kişi başlığı: gerçek ad olduğu gibi kalır; Facebook/Instagram'da ad bilinmiyorsa uzun sayısal
// kimlik yerine "Facebook müşterisi · …6648" gösterilir. WhatsApp'ta numara zaten anlamlı olduğu için değişmez.
export function contactTitle({ contactDisplayName, contactExternalId, channelType }: ContactTitleSource): string {
  const fallbackLabel = SOCIAL_FALLBACK_LABEL[channelType];
  if (fallbackLabel && isUnknownName(contactDisplayName, contactExternalId)) {
    return `${fallbackLabel} · …${contactExternalId.slice(-ID_TAIL_LENGTH)}`;
  }
  return contactDisplayName || contactExternalId;
}
