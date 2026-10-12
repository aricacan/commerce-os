import {
  ASSIGNMENT_POLICY, CHANNEL_TYPE, FIXED_AGENT_FALLBACK,
  type AssignmentPolicy, type ChannelCreateBody, type ChannelCredentialsInput, type ChannelDto,
  type ChannelType, type ChannelUpdateBody, type FixedAgentFallback,
} from '../../lib/api/omnichannel';
import { channelUpdateBody } from './channelUpdateBody';

/**
 * Kanal formunun düzenlenebilir alanları. Kanal penceresi (ChannelFormDialog) ve Kanal Merkezi › Genel
 * satır içi düzenleme AYNI taslağı ve aynı alan bileşenlerini kullanır. Kimlik bilgileri (token, parola)
 * taslağın parçası değildir: yalnız pencerede girilir ve kayıtta ayrıca eklenir.
 */
export interface ChannelDraft {
  type: ChannelType;
  displayName: string;
  externalIdentifier: string;
  storeCode: string;
  /** Boş = ülke belirtilmemiş. */
  country: string;
  brandId: number | null;
  catalogProfileId: number | null;
  botEnabled: boolean;
  welcomeTr: string;
  welcomeEn: string;
  welcomeSq: string;
  assignmentPolicy: AssignmentPolicy;
  /** "Sabit kişi" sorumlusu (kanal ekibinden) ve iş alamadığında davranış. */
  fixedAgentUserId: number | null;
  fixedAgentFallback: FixedAgentFallback;
  /** Boş = SLA takibi yok. Metin olarak tutulur ki kullanıcı alanı temizleyebilsin. */
  slaMinutes: string;
}

export type ChannelDraftPatch = (patch: Partial<ChannelDraft>) => void;

/** Yeni kanalda e-posta dışındaki kanallarda bot varsayılan açık; e-postada kapalı (gelen e-posta temsilciye düşer). */
export const defaultBotEnabled = (type: ChannelType): boolean => type !== CHANNEL_TYPE.Email;

export function draftFromChannel(channel: ChannelDto | null): ChannelDraft {
  return {
    type: channel?.type ?? CHANNEL_TYPE.WhatsApp,
    displayName: channel?.displayName ?? '',
    externalIdentifier: channel?.externalIdentifier ?? '',
    storeCode: channel?.storeCode ?? '',
    country: channel?.country ?? '',
    brandId: channel?.brandId ?? null,
    catalogProfileId: channel?.catalogProfileId ?? null,
    botEnabled: channel?.botEnabled ?? true,
    welcomeTr: channel?.welcomeMessageTr ?? '',
    welcomeEn: channel?.welcomeMessageEn ?? '',
    welcomeSq: channel?.welcomeMessageSq ?? '',
    assignmentPolicy: channel?.assignmentPolicy ?? ASSIGNMENT_POLICY.None,
    fixedAgentUserId: channel?.fixedAgentUserId ?? null,
    fixedAgentFallback: channel?.fixedAgentFallback ?? FIXED_AGENT_FALLBACK.DistributeToTeam,
    slaMinutes: channel?.firstResponseSlaMinutes?.toString() ?? '',
  };
}

/** Boş metin = SLA takibi yok (null). */
export const parseSlaMinutes = (raw: string): number | null => (raw.trim() === '' ? null : Number(raw));

/** Kaydedilebilir mi? Görünen ad zorunlu; yeni kanalda kimlik de; "Sabit kişi"de sorumlu seçilmiş olmalı. */
export function canSaveDraft(draft: ChannelDraft, isEdit: boolean): boolean {
  const fixedAgentOk = draft.assignmentPolicy !== ASSIGNMENT_POLICY.FixedAgent || draft.fixedAgentUserId !== null;
  return draft.displayName.trim() !== '' && (isEdit || draft.externalIdentifier.trim() !== '') && fixedAgentOk;
}

/** Sunucudaki değerlerden farklı mı? Satır içi düzenlemede Kaydet düğmesini açar. */
export function isDraftDirty(draft: ChannelDraft, channel: ChannelDto): boolean {
  const saved = draftFromChannel(channel);
  return (Object.keys(saved) as (keyof ChannelDraft)[]).some((key) => draft[key] !== saved[key]);
}

/** Taslak alanlarının sunucuya gidecek hâli; kimlik bilgisi `credentials` verilmezse korunur. */
export function toUpdateBody(
  channel: ChannelDto, draft: ChannelDraft, credentials: ChannelCredentialsInput | null = null,
): ChannelUpdateBody {
  return channelUpdateBody(channel, {
    displayName: draft.displayName,
    storeCode: draft.storeCode || null,
    country: draft.country || null,
    catalogProfileId: draft.catalogProfileId,
    brandId: draft.brandId,
    botEnabled: draft.botEnabled,
    welcomeMessageTr: draft.welcomeTr,
    welcomeMessageEn: draft.welcomeEn,
    welcomeMessageSq: draft.welcomeSq,
    assignmentPolicy: draft.assignmentPolicy,
    fixedAgentUserId: draft.fixedAgentUserId,
    fixedAgentFallback: draft.fixedAgentFallback,
    firstResponseSlaMinutes: parseSlaMinutes(draft.slaMinutes),
    credentials,
  });
}

export function toCreateBody(draft: ChannelDraft, credentials: ChannelCredentialsInput): ChannelCreateBody {
  return {
    type: draft.type,
    displayName: draft.displayName,
    externalIdentifier: draft.externalIdentifier,
    storeCode: draft.storeCode || null,
    country: draft.country || null,
    catalogProfileId: draft.catalogProfileId,
    brandId: draft.brandId,
    botEnabled: draft.botEnabled,
    welcomeMessageTr: draft.welcomeTr,
    welcomeMessageEn: draft.welcomeEn,
    welcomeMessageSq: draft.welcomeSq,
    assignmentPolicy: draft.assignmentPolicy,
    firstResponseSlaMinutes: parseSlaMinutes(draft.slaMinutes),
    credentials,
  };
}

/** Düzenlemede kimlik alanlarından biri dolduysa gönderilir; hepsi boşsa mevcut anahtarlar korunur. */
export const hasTouchedCredentials = (credentials: ChannelCredentialsInput): boolean =>
  Object.values(credentials).some((value) => value && String(value).trim() !== '');
