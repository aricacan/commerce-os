import { request } from './core';

// ─── Omnichannel › Bakım (bir kerelik veri onarımları, yalnız yönetici) ─────────────

// Sunucudaki MetaAutomationEchoRepairResultDto ile birebir.
// dryRun=true iken hiçbir şey yazılmaz; liste yalnız "neler açılacak" önizlemesidir.
export interface AutomationEchoRepairResultDto {
  dryRun: boolean;
  repairedConversationIds: number[];
  reclassifiedMessageCount: number;
}

// Sunucudaki ContactNameBackfillResultDto ile birebir.
// remaining: imleçten (nextAfterContactId) sonra hâlâ adı bilinmeyen kişi sayısı.
export interface ContactNameBackfillPageDto {
  processed: number;
  named: number;
  failed: number;
  nextAfterContactId: number;
  remaining: number;
  // Yeni alanlar opsiyonel: frontend backend'den önce yayına çıkar.
  // profilesNamed: adı bilinen kişisinden ad alan "İsimsiz müşteri" profili (Meta'ya gidilmeden).
  profilesNamed?: number;
  // Başarısızlıkların Meta nedenine göre grupları (ör. "(#100) ... (kod 100)" × 13).
  failureReasons?: ContactNameFailureGroupDto[] | null;
}

// Sunucudaki CustomerBackfillResultDto ile birebir (Customer 360 geçmiş veri doldurma).
// remaining: imleçten (nextAfterConversationId) sonra hâlâ işlenmemiş konuşma sayısı.
export interface Customer360BackfillPageDto {
  conversationsProcessed: number;
  messagesScanned: number;
  profilesMerged: number;
  ordersRecorded: number;
  eventsAdded: number;
  nextAfterConversationId: number;
  remaining: number;
}

export interface ContactNameFailureGroupDto {
  reason: string;
  count: number;
}

// Sunucudaki MetaPermissionProbeResultDto ile birebir. Yanıt yalnız sayı ve hata iletisi taşır (yorum metni yok).
export type MetaPermissionProbeOutcome = 'Success' | 'Failed' | 'Skipped';

export interface MetaPermissionProbeCallDto {
  permission: string;
  call: string;
  outcome: MetaPermissionProbeOutcome;
  itemCount: number | null;
  error: string | null;
}

export interface MetaPermissionProbeChannelDto {
  channelId: number;
  channelName: string;
  channelType: string;
  calls: MetaPermissionProbeCallDto[];
}

export interface MetaPermissionProbeResultDto {
  succeeded: number;
  failed: number;
  skipped: number;
  summary: string;
  channels: MetaPermissionProbeChannelDto[];
}

// Sunucu kanal başına 3-4 Graph çağrısı arasında ~0,5 sn bekler; çok kanalda varsayılan 25 sn yetmeyebilir.
const PERMISSION_PROBE_TIMEOUT_MS = 120_000;

// Sunucu kişi başına Meta'ya ~0,5 sn ara vererek gider; 50'lik sayfa varsayılan 25 sn sınırını aşabilir.
const NAME_BACKFILL_TIMEOUT_MS = 120_000;

// Customer 360 sayfası mesaj tarar, profil birleştirir; büyük sayfa varsayılan 25 sn'yi aşabilir.
const CUSTOMER_BACKFILL_TIMEOUT_MS = 120_000;

export const maintenanceApi = {
  repairAutomationEchoes: (dryRun: boolean) =>
    request<AutomationEchoRepairResultDto>(
      `/omnichannel/maintenance/repair-automation-echoes?dryRun=${dryRun}`, { method: 'POST' },
    ),
  probeMetaPermissions: () =>
    request<MetaPermissionProbeResultDto>(
      '/omnichannel/maintenance/meta-permission-probe', { method: 'POST' }, true, PERMISSION_PROBE_TIMEOUT_MS,
    ),
  backfillContactNames: (afterContactId: number, pageSize: number) =>
    request<ContactNameBackfillPageDto>(
      `/omnichannel/contacts/backfill-names?afterContactId=${afterContactId}&pageSize=${pageSize}`,
      { method: 'POST' }, true, NAME_BACKFILL_TIMEOUT_MS,
    ),
  backfillCustomer360: (afterConversationId: number, pageSize: number) =>
    request<Customer360BackfillPageDto>(
      `/omnichannel/maintenance/customer-360-backfill?afterConversationId=${afterConversationId}&pageSize=${pageSize}`,
      { method: 'POST' }, true, CUSTOMER_BACKFILL_TIMEOUT_MS,
    ),
};
