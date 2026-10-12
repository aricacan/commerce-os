import {
  CHANNEL_TYPE, type ChannelCredentialsInput, type ChannelType,
} from '../../lib/api/omnichannel';
import type { ChannelDraft } from './channelDraft';
import { CREDENTIAL_FIELDS } from './shared';

/** Meta üzerinden tek tıkla bağlanabilen türler; diğerleri yalnız elle girilir. */
const CONNECTABLE_TYPES: readonly ChannelType[] = [CHANNEL_TYPE.WhatsApp, CHANNEL_TYPE.Instagram, CHANNEL_TYPE.Facebook];

export const supportsConnect = (type: ChannelType): boolean => CONNECTABLE_TYPES.includes(type);

const MANUAL_ENTRY_LABEL: Partial<Record<ChannelType, string>> = {
  [CHANNEL_TYPE.WhatsApp]: 'Elle gir (Phone Number ID, token)',
  [CHANNEL_TYPE.Instagram]: 'Elle gir (hesap kimliği, token)',
  [CHANNEL_TYPE.Facebook]: 'Elle gir (sayfa kimliği, token)',
};

export const manualEntryLabel = (type: ChannelType): string => MANUAL_ENTRY_LABEL[type] ?? 'Elle gir';

/** Kaydetmek için doldurulması gereken kimlik alanlarının etiketleri (boşsa liste boş). */
export function missingCredentialLabels(type: ChannelType, credentials: ChannelCredentialsInput): string[] {
  return CREDENTIAL_FIELDS[type]
    .filter((field) => {
      const value = credentials[field.key as keyof ChannelCredentialsInput];
      return typeof value !== 'string' || value.trim() === '';
    })
    .map((field) => field.label);
}

/** "Bağlantıyı test et" için e-posta adresi + sunucu bilgileri; adres ya da zorunlu alan eksikse null. */
export function emailTestRequest(draft: ChannelDraft, credentials: ChannelCredentialsInput) {
  const address = draft.externalIdentifier.trim();
  if (address === '' || missingCredentialLabels(CHANNEL_TYPE.Email, credentials).length > 0) return null;
  return { address, credentials };
}
