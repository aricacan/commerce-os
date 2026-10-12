import { request, BASE, uploadHeaders } from './core';
import { AI_REQUEST_TIMEOUT_MS, type AiChatTurn, type AiDataCard } from './ai';

// Panel paketi senaryo senaryo koşturur (bkz. sandboxSuiteRun.ts); tek senaryo birkaç model
// turu sürebilir — genel 25 sn sınırı dar kalır.
const SANDBOX_SCENARIO_TIMEOUT_MS = 120_000;

// ─── Omnichannel (çok kanallı mesajlaşma + chatbot) ───────────────────────────

// Backend enum'larıyla birebir sayısal karşılık — sunucu int gönderir/bekler.
export const CHANNEL_TYPE = { WhatsApp: 1, Instagram: 2, Facebook: 3, TikTok: 4, Email: 5 } as const;
export type ChannelType = (typeof CHANNEL_TYPE)[keyof typeof CHANNEL_TYPE];

export const CHANNEL_STATUS = {
  Disconnected: 0,
  // 1, 2 eski Node WhatsApp ağ geçidinindi (backend'den de kaldırıldı).
  Connected: 3,
  Error: 4,
} as const;
export type ChannelStatus = (typeof CHANNEL_STATUS)[keyof typeof CHANNEL_STATUS];

export const ASSIGNMENT_POLICY = { None: 0, Manual: 1, RoundRobin: 2, LeastLoaded: 3, FixedAgent: 4 } as const;
export type AssignmentPolicy = (typeof ASSIGNMENT_POLICY)[keyof typeof ASSIGNMENT_POLICY];

// "Sabit kişi" politikasında sorumlu iş alamıyorsa: ekibe dağıt (varsayılan) ya da kuyrukta bekle.
export const FIXED_AGENT_FALLBACK = { DistributeToTeam: 0, Wait: 1 } as const;
export type FixedAgentFallback = (typeof FIXED_AGENT_FALLBACK)[keyof typeof FIXED_AGENT_FALLBACK];

// Panelden girilen kimlik bilgileri. Alanların hangisinin zorunlu olduğu kanal tipine
// bağlıdır; nihai doğrulama sunucuda yapılır.
export interface ChannelCredentialsInput {
  // WhatsApp Cloud API
  phoneNumberId?: string;
  wabaId?: string;
  // Meta (Instagram/Facebook) ve WhatsApp Cloud API ortak alanları
  pageId?: string;
  accessToken?: string;
  appSecret?: string;
  // Yalnızca Instagram: true = bağımsız "Instagram business login" (graph.instagram.com,
  // Sayfa gerekmez), false/undefined = Sayfa'ya bağlı "Facebook Login" (graph.facebook.com).
  useInstagramGraphHost?: boolean;
  // TikTok
  shopId?: string;
  appKey?: string;
  refreshToken?: string;
  // E-posta (IMAP okuma + SMTP gönderme). Port/güvenlik boşsa sunucu varsayılanı (993 SSL / 465 SSL).
  imapHost?: string;
  imapPort?: number;
  imapSecurity?: ImapSecurity;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecurity?: SmtpSecurity;
  mailUsername?: string;
  mailPassword?: string;
  // Boş = sunucudan otomatik bulunur (Plesk: "INBOX.Sent" ya da "Sent").
  sentFolder?: string;
}

// Backend enum'larıyla birebir: IMAP güvenliği (BankMailboxSecurity) ve SMTP güvenliği (HandoffSmtpSecurity).
export const IMAP_SECURITY = { SslOnConnect: 0, StartTls: 1 } as const;
export type ImapSecurity = (typeof IMAP_SECURITY)[keyof typeof IMAP_SECURITY];
export const SMTP_SECURITY = { StartTls: 0, SslOnConnect: 1 } as const;
export type SmtpSecurity = (typeof SMTP_SECURITY)[keyof typeof SMTP_SECURITY];

// Sunucu kimlik bilgilerini ASLA geri döndürmez — yalnızca girilmiş olup olmadığını.
export interface ChannelDto {
  id: number;
  type: ChannelType;
  displayName: string;
  externalIdentifier: string;
  storeCode: string | null;
  // Ülke kodu (ülke tablosundan: "TR", "UK", "KS") — botun hangi ülkenin stoğuna bakacağını belirler.
  // Mağaza MARKA olduğu için (storea/storeb ikisi de iki ülkede satıyor) ayrıca gerekli.
  country: string | null;
  // Katalog profili (Sistem › Kaynak Profilleri); null = ülke varsayılanı. Eski backend göndermez.
  catalogProfileId?: number | null;
  // Marka (P07); null = markasız. Eski backend göndermez → undefined.
  brandId?: number | null;
  brandName?: string | null;
  status: ChannelStatus;
  lastError: string | null;
  lastHeartbeatAt: string | null;
  // Bu kanaldan Meta'nın en son webhook gönderdiği an. "Kanal gerçekten mesaj alıyor mu?"
  // sorusunun tek doğrudan cevabı — Status yalnızca jetonun geçerli olduğunu söyler.
  // null = hiç webhook gelmedi (yeni kanal ya da abonelik eksik).
  lastWebhookAt: string | null;
  botEnabled: boolean;
  welcomeMessageTr: string | null;
  welcomeMessageEn: string | null;
  // Eski backend göndermez → undefined.
  welcomeMessageSq?: string | null;
  assignmentPolicy: AssignmentPolicy;
  // "Sabit kişi" politikası (eski backend göndermez).
  fixedAgentUserId?: number | null;
  fixedAgentFallback?: FixedAgentFallback;
  // İlk temsilci cevabı süresi (dakika); null = SLA takibi yok. Yeni alan — eski backend göndermez.
  firstResponseSlaMinutes?: number | null;
  isActive: boolean;
  hasCredentials: boolean;
  agentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelCreateBody {
  type: ChannelType;
  displayName: string;
  externalIdentifier: string;
  storeCode?: string | null;
  country?: string | null;
  // Katalog profili; null = ülke varsayılanı.
  catalogProfileId?: number | null;
  // Marka; null = markasız.
  brandId?: number | null;
  botEnabled: boolean;
  assignmentPolicy: AssignmentPolicy;
  firstResponseSlaMinutes?: number | null;
  credentials: ChannelCredentialsInput;
  welcomeMessageTr?: string | null;
  welcomeMessageEn?: string | null;
  welcomeMessageSq?: string | null;
}

export interface ChannelUpdateBody {
  displayName: string;
  storeCode?: string | null;
  country?: string | null;
  // Katalog profili; null = ülke varsayılanı.
  catalogProfileId?: number | null;
  // Marka; null = markasız.
  brandId?: number | null;
  botEnabled: boolean;
  isActive: boolean;
  assignmentPolicy: AssignmentPolicy;
  /** "Sabit kişi" sorumlusu; null = mevcut değer korunur. */
  fixedAgentUserId?: number | null;
  fixedAgentFallback?: FixedAgentFallback;
  firstResponseSlaMinutes?: number | null;
  // Atlanırsa mevcut kimlik bilgileri korunur — her düzenlemede token istenmesin diye.
  credentials?: ChannelCredentialsInput | null;
  welcomeMessageTr?: string | null;
  welcomeMessageEn?: string | null;
  welcomeMessageSq?: string | null;
}

// "Bağlantıyı test et" sonucu. Aynı değerler kanala da yazılır (status + lastError),
// bu yüzden sonuç hem anında gösterilir hem liste yenilenince kalıcı görünür.
export interface ChannelHealthCheckDto {
  status: ChannelStatus;
  error: string | null;
  checkedAt: string;
}

// Kanal kaydedilmeden önce e-posta bağlantı denemesi: IMAP ve SMTP ayrı sonuçlanır; hata metni parola içermez.
export interface EmailProbeResultDto { ok: boolean; error: string | null }
export interface EmailConnectionTestRequest { address: string; credentials: ChannelCredentialsInput }
export interface EmailConnectionTestResultDto { imap: EmailProbeResultDto; smtp: EmailProbeResultDto }

// Kanal ekibi. Rol görünürlüğü belirlemez (gelen kutusunu herkes görür); yazma yetkisini,
// atamayı ve bildirimi belirler. Ekip boşsa kanal herkese yazılabilir.
export const CHANNEL_MEMBER_ROLE = { Agent: 0, Owner: 1, Observer: 2 } as const;
export type ChannelMemberRole = (typeof CHANNEL_MEMBER_ROLE)[keyof typeof CHANNEL_MEMBER_ROLE];

export interface ChannelMemberDto {
  userId: number;
  displayName: string;
  role: ChannelMemberRole;
  notify: boolean;
  isOnDuty: boolean;
  maxOpenConversations: number | null;
  openConversationCount: number;
  lastAssignedAt: string | null;
}

export interface ChannelMemberUpdateBody {
  role: ChannelMemberRole;
  notify: boolean;
  isOnDuty: boolean;
  maxOpenConversations: number | null;
}

// Hazır cevap (Faz 9). language boşsa her dilde önerilir.
export interface CannedReplyDto { id: number; title: string; body: string; language: string | null }
export interface CannedReplySaveDto { title: string; body: string; language: string | null }

// Marka (P07): kanalların bağlı olduğu satış markası (ör. storea, storeb). Silinirse kanallar markasız kalır.
export interface BrandDto {
  id: number;
  name: string;
  slug: string;
  defaultCountry: string | null;
  isActive: boolean;
  sortOrder: number;
  channelCount: number;
}
// slug boşsa sunucu addan üretir.
export interface BrandSaveDto {
  name: string;
  slug?: string | null;
  defaultCountry?: string | null;
  isActive: boolean;
  sortOrder: number;
}

// Sohbet siparişi ödeme yöntemi (P15). Backend enum'u sayı olarak serileştirir.
// RedirectToWebsite yalnız ödeme yöntemi ayarında vardır: sipariş sohbette alınmaz, müşteri siteye yönlenir.
export const PAYMENT_METHOD = { BankTransfer: 1, CashOnDelivery: 2, RedirectToWebsite: 3 } as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

// Bir sohbet siparişinde saklanabilen yöntemler (yönlendirme sipariş açmaz).
export const ORDER_PAYMENT_METHODS: readonly PaymentMethod[] = [PAYMENT_METHOD.BankTransfer, PAYMENT_METHOD.CashOnDelivery];

// Kapsam önceliği (sunucu ChatPaymentOptions): kanal > katalog profili > marka+ülke > marka > ülke > genel.
// country "*" = her ülke. Kanal ya da profil doluyken marka boştur.
export interface PaymentOptionDto {
  id: number;
  brandId: number | null;
  country: string;
  // Yeni alanlar — eski backend göndermez → undefined.
  channelId?: number | null;
  catalogProfileId?: number | null;
  // Yalnız RedirectToWebsite: müşteriye gidecek adres ve ({link} yer tutuculu) mesaj.
  websiteUrl?: string | null;
  messageTemplate?: string | null;
  method: PaymentMethod;
  isActive: boolean;
  sortOrder: number;
  bankName: string | null;
  accountHolder: string | null;
  iban: string | null;
}
export type PaymentOptionSaveDto = Omit<PaymentOptionDto, 'id'>;

// Çapraz satış kuralı (P38): fromCategoryId kategorisi sepetteyse toCategoryId'den ürün önerilir.
// brandId null = tüm markalar. Kategori kimlikleri /category/master listesindendir.
export interface CrossSellRuleDto {
  id: number;
  brandId: number | null;
  fromCategoryId: number;
  toCategoryId: number;
  isActive: boolean;
  sortOrder: number;
}
export type CrossSellRuleSaveDto = Omit<CrossSellRuleDto, 'id'>;

// Sohbetten sipariş hunisi (P32) — backend FunnelStep ile birebir.
export const FUNNEL_STEP = {
  Conversations: 1, OrderStarted: 2, Confirmed: 3, PaymentSettled: 4, SentToShopify: 5, Shipped: 6,
} as const;
export type FunnelStep = (typeof FUNNEL_STEP)[keyof typeof FUNNEL_STEP];
export interface FunnelStepDto { step: FunnelStep; count: number }
export interface OrderFunnelDto {
  days: number;
  steps: FunnelStepDto[];
  brands: { brandId: number | null; brandName: string; steps: FunnelStepDto[] }[];
  followUps: { sent: number; customerRepliedAfter: number; waitingForAgent: number };
  // Çapraz satış (P38). Eski backend göndermez → kart satırı gösterilmez.
  crossSell?: CrossSellFunnelDto;
}
export interface CrossSellFunnelDto { offered: number; accepted: number; declined: number }

// Kalite denetimi (P39): dünün konuşmalarından örneklem puanı, 0-10.
export interface QualityDayDto { day: string; average: number | null; count: number }
export interface QualityAuditItemDto {
  conversationId: number; score: number; rationale: string; auditDay: string; contactName: string | null;
}
export interface QualityTrendDto {
  days: number;
  average: number | null;
  auditedCount: number;
  daily: QualityDayDto[];
  lowest: QualityAuditItemDto[];
  needsReview: QualityAuditItemDto[];
}

// Genel bakış (Gelen Kutusu › Genel Bakış): kapsam filtreleri + özet yanıtı.
export interface OverviewScopeParams { brandId?: number | null; channelId?: number | null; country?: string | null }
export interface OverviewSummaryDto {
  days: number;
  kpis: {
    conversations: number; inboundMessages: number; botSharePercent: number | null;
    handoffRatePercent: number | null; handoffCount: number; waitingForReply: number; slaBreached: number;
  };
  daily: { date: string; inbound: number; botReplies: number; agentReplies: number }[];
  stages: { stage: ConversationStage; count: number }[];
  // 24 sayı, indeks = saat (Türkiye saati).
  hourlyInbound: number[];
  channels: { channelId: number; name: string; type: ChannelType; conversations: number }[];
  handoffReasons: { reason: number; count: number }[];
  topics: { topic: ConversationTopic; count: number }[];
}

// Hesap sağlığı (Genel Bakış): eksik/bozuk kurulumlar. Backend HealthSeverity ile birebir.
export const HEALTH_SEVERITY = { Critical: 1, Warning: 2, Info: 3 } as const;
export type HealthSeverity = (typeof HEALTH_SEVERITY)[keyof typeof HEALTH_SEVERITY];
export interface HealthFindingDto {
  ruleId: string; severity: HealthSeverity; title: string; detail: string;
  // Düzelten Omnichannel sekmesi ya da başka modülün sayfası; ikisi de yoksa düğme yok.
  actionTab: string | null; actionHref: string | null;
}
export interface AccountHealthDto { checksTotal: number; checksFailed: number; findings: HealthFindingDto[] }

// Genel bakış dönemi: yalnız days = "son N gün"; from/to (YYYY-MM-DD, ikisi de dahil) verilirse takvim aralığı.
export interface OverviewPeriodParams { days: number; from?: string; to?: string }

// Genel bakışın ağır hesapları (ilk cevap süresi, sohbet siparişi cirosu, ülke/marka kırılımı).
export interface OverviewInsightsDto {
  firstResponse: {
    // Dakika. Cevaplanan konuşma yoksa null — süre uydurulmaz.
    averageMinutes: number | null; medianMinutes: number | null; answeredCount: number;
    agentAverageMinutes: number | null; agentAnsweredCount: number;
    daily: { date: string; averageMinutes: number | null; agentAverageMinutes: number | null }[];
  };
  orders: { confirmedCount: number; revenue: { currency: string; count: number; total: number }[] };
  countries: { country: string | null; conversations: number }[];
  brands: { brandId: number | null; name: string; conversations: number }[];
}

function overviewQueryString(period: OverviewPeriodParams, scope: OverviewScopeParams): string {
  const search = new URLSearchParams({ days: String(period.days) });
  if (period.from && period.to) {
    search.set('from', period.from);
    search.set('to', period.to);
  }
  if (scope.brandId != null) search.set('brandId', String(scope.brandId));
  if (scope.channelId != null) search.set('channelId', String(scope.channelId));
  if (scope.country) search.set('country', scope.country);
  return search.toString();
}

// Faz 12 — öğrenme raporu. reason: HandoffReason sayısal değeri.
export const HANDOFF_REASON_LABELS: Record<number, string> = {
  0: 'Anlaşılamadı', 1: 'Müşteri temsilci istedi', 2: 'Şikâyet', 3: 'Fiyat talebi',
  4: 'Veri belirsiz', 5: 'Kayıt bulunamadı', 6: 'Art arda başarısız', 7: 'İş kuralı', 8: 'Ülke kataloğu yok',
};
export interface BotLearningReportDto {
  days: number; handoffCount: number;
  handoffReasons: { reason: number; count: number }[];
  unansweredQuestions: { example: string; count: number; lastAskedAt: string }[];
  unknownTerms: AliasSuggestionDto[];
}

// Bot bu konuşmada ne öğrendi (Faz 9): araç, varyant, konuşulan ürün.
export interface ConversationProductDto { id: number; name: string; supplierSku: string; stockQuantity: number; imageUrl: string | null }
export interface ConversationContextDto { vehicle: string | null; variants: string[]; product: ConversationProductDto | null }

// Devret seçicisi: konuşmanın kanalına yazabilen kişiler.
export interface AssigneeDto { userId: number; displayName: string }

export interface TeamCandidateDto {
  userId: number;
  displayName: string;
  email: string;
}

// ─── Geçmiş içe aktarma (Facebook/Instagram) ───────────────────────────────────
//
// Kanal silinip yeniden eklendiğinde webhook'lar yalnızca YENİ mesajları getirir;
// Sayfa'da/IG hesabında zaten var olan geçmiş bu uç ile bir kerelik çekilir. Dakikalarca
// sürebileceği için arka planda çalışır — start uç anında jobId döner, status uç pollanır.
export const HISTORY_IMPORT_JOB_STATE = {
  NotFound: 'NotFound', Running: 'Running', Failed: 'Failed', Completed: 'Completed',
} as const;
export type HistoryImportJobStateValue =
  (typeof HISTORY_IMPORT_JOB_STATE)[keyof typeof HISTORY_IMPORT_JOB_STATE];

export interface HistoryImportResultDto {
  channelId: number;
  conversationsScanned: number;
  conversationsImported: number;
  messagesImported: number;
  messagesSkippedDuplicate: number;
  attachmentsImported: number;
  // Yeni alanlar opsiyonel: frontend backend'den önce yayına çıkar.
  conversationsFailed?: number;
  messagesFound?: number;
  messagesWithoutContent?: number;
  isPartial?: boolean;
  partialReason?: string | null;
  warnings: string[];
  completedAt: string;
}

export interface HistoryImportProgressDto {
  conversationsScanned: number;
  messagesFound: number;
  messagesImported: number;
  messagesSkippedDuplicate: number;
}

export interface HistoryImportJobStatusDto {
  state: HistoryImportJobStateValue;
  errorMessage?: string | null;
  result?: HistoryImportResultDto | null;
  progress?: HistoryImportProgressDto | null;
}

// ─── Inbox ────────────────────────────────────────────────────────────────────

export const CONVERSATION_STATUS = { Open: 0, Pending: 1, Resolved: 2, Closed: 3 } as const;
export type ConversationStatus = (typeof CONVERSATION_STATUS)[keyof typeof CONVERSATION_STATUS];

// Konuşma hangi adımda? Bot turunun sonunda backend türetir (ConversationStateRules).
export const CONVERSATION_STATE = {
  New: 0,
  WaitingCustomer: 1,
  CollectingInfo: 2,
  AwaitingChoice: 3,
  AwaitingOrderReference: 4,
  HumanHandoff: 5,
  Closed: 6,
} as const;
export type ConversationState = (typeof CONVERSATION_STATE)[keyof typeof CONVERSATION_STATE];

// Listede rozet metni. WaitingCustomer/New/Closed rozetsizdir: sıradan durum, gürültü yapar.
export const CONVERSATION_STATE_LABELS: Partial<Record<ConversationState, string>> = {
  [CONVERSATION_STATE.CollectingInfo]: 'Bilgi bekleniyor',
  [CONVERSATION_STATE.AwaitingChoice]: 'Seçim bekleniyor',
  [CONVERSATION_STATE.AwaitingOrderReference]: 'Sipariş no bekleniyor',
  [CONVERSATION_STATE.HumanHandoff]: 'Devredildi',
};

// Konuşmanın iş akışındaki aşaması (P22) — backend ConversationStage ile birebir. Etiket ve
// renkler features/omnichannel/stageRules.ts'te.
export const CONVERSATION_STAGE = {
  New: 0,
  BotHandling: 1,
  AwaitingCustomer: 2,
  AwaitingAgent: 3,
  Handoff: 4,
  OrderCollecting: 5,
  OrderAwaitingConfirmation: 6,
  AwaitingPayment: 7,
  OrderPlaced: 8,
  Shipped: 9,
  Resolved: 10,
  Dormant: 11,
} as const;
export type ConversationStage = (typeof CONVERSATION_STAGE)[keyof typeof CONVERSATION_STAGE];

export const MESSAGE_DIRECTION = { Inbound: 0, Outbound: 1 } as const;
export type MessageDirection = (typeof MESSAGE_DIRECTION)[keyof typeof MESSAGE_DIRECTION];

export const SENDER_TYPE = { Contact: 0, Agent: 1, Bot: 2, System: 3 } as const;
export type SenderType = (typeof SENDER_TYPE)[keyof typeof SENDER_TYPE];

// Tik sistemi: Sent = ✓ · Delivered = ✓✓ · Read = ✓✓✓
export const DELIVERY_STATUS = {
  Pending: 0, Sent: 1, Delivered: 2, Read: 3, Failed: 4,
} as const;
export type DeliveryStatus = (typeof DELIVERY_STATUS)[keyof typeof DELIVERY_STATUS];

// Backend MessageContentType ile birebir.
export const MESSAGE_CONTENT_TYPE = {
  Text: 0, Image: 1, Video: 2, Audio: 3, Document: 4,
  Location: 5, Sticker: 6, ContactCard: 7, Unsupported: 99,
} as const;
export type MessageContentType = (typeof MESSAGE_CONTENT_TYPE)[keyof typeof MESSAGE_CONTENT_TYPE];

// WaitingReply..Closed (7–11) aşamaya bağlı haplardır (P28) — backend InboxViews ile aynı tablo.
export const CONVERSATION_FILTER = {
  All: 0, Unread: 1, AssignedToMe: 2, BotHandled: 3, NeedsAttention: 4, Unassigned: 5, SlaBreached: 6,
  WaitingReply: 7, InOrder: 8, AwaitingPayment: 9, BotRunning: 10, Closed: 11,
  // Bot temsilciye soru açmış, cevap bekliyor (Temsilci Danışma).
  AwaitingConsultation: 12,
} as const;
export type ConversationFilter = (typeof CONVERSATION_FILTER)[keyof typeof CONVERSATION_FILTER];

// Konu etiketi (Gelen Kutusu v2 §3) — backend ConversationTopic ile birebir. None = henüz etiketlenmedi.
export const CONVERSATION_TOPIC = {
  None: 0, Purchase: 1, Shipping: 2, AfterSales: 3, Complaint: 4, Other: 5,
} as const;
export type ConversationTopic = (typeof CONVERSATION_TOPIC)[keyof typeof CONVERSATION_TOPIC];

export const CONVERSATION_TOPIC_LABELS: Record<ConversationTopic, string> = {
  [CONVERSATION_TOPIC.None]: 'Etiketsiz',
  [CONVERSATION_TOPIC.Purchase]: 'Satın alma',
  [CONVERSATION_TOPIC.Shipping]: 'Kargo',
  [CONVERSATION_TOPIC.AfterSales]: 'Satış sonrası',
  [CONVERSATION_TOPIC.Complaint]: 'Şikâyet',
  [CONVERSATION_TOPIC.Other]: 'Diğer',
};

export interface InboxChannelDto {
  id: number;
  type: ChannelType;
  displayName: string;
  status: ChannelStatus;
  botEnabled: boolean;
  unreadCount: number;
  // Oturumdaki kullanıcı bu kanala yazabilir mi? Eski backend göndermez → undefined = yazabilir.
  canWrite?: boolean;
  // Pasif kanal görünür ama salt okunur. Eski backend göndermez → undefined = aktif.
  isActive?: boolean;
  // Kanalın markası (P07). Eski backend göndermez → undefined = markasız.
  brandId?: number | null;
  brandName?: string | null;
  // Kanal bu aşamayı bildirmiyorsa UI tiki "eksik" değil "desteklenmiyor" diye gösterir.
  supportsDeliveryReceipts: boolean;
  supportsReadReceipts: boolean;
}

export interface ConversationSummaryDto {
  id: number;
  channelId: number;
  channelName: string;
  channelType: ChannelType;
  // Kanalın ülke kodu ("KS", "TR", "UK"). Eski backend göndermez → etiket gösterilmez.
  country?: string | null;
  contactId: number;
  contactDisplayName: string | null;
  contactExternalId: string;
  status: ConversationStatus;
  // Faz 5 — eski backend göndermez, o zaman rozet gösterilmez.
  state?: ConversationState;
  assignedUserId: number | null;
  isBotActive: boolean;
  // Bot temsilciye soru açtı, cevap bekliyor — "Soru bekliyor" rozeti. Eski backend göndermez → rozet yok.
  pendingConsultation?: boolean;
  // Şikayet algılandı — listede kırmızı rozetle en üstte.
  isUrgent: boolean;
  // Konu etiketi. Eski backend göndermez → undefined = etiketsiz.
  topic?: ConversationTopic;
  // true = temsilci seçti; otomatik etiketleme bir daha değiştirmez.
  topicSetByUser?: boolean;
  // Aşama (P22). Eski backend göndermez → undefined = rozet yok.
  stage?: ConversationStage;
  stageChangedAt?: string | null;
  unreadCount: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  // Yalnız WhatsApp: serbest mesajın son anı; sonrası şablon ister. null = müşteri hiç yazmadı.
  serviceWindowEndsAt?: string | null;
  // Yalnız Messenger/Instagram: 24 saatten sonra temsilcinin "insan temsilci" etiketiyle
  // yazabileceği son an (müşterinin son mesajı + 7 gün).
  humanAgentWindowEndsAt?: string | null;
  // Yalnız e-posta kanalı: konuşmanın konu satırı. Eski backend göndermez.
  subject?: string | null;
}

export interface MessageDto {
  id: number;
  conversationId: number;
  direction: MessageDirection;
  senderType: SenderType;
  senderUserId: number | null;
  // Temsilci mesajında gönderenin adı (yalnız mesaj listesinde gelir; canlı yayında/eski backend'de yok).
  senderUserName?: string | null;
  contentType: number;
  body: string | null;
  deliveryStatus: DeliveryStatus;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  // Gönderilemediyse Türkçe açıklama + ilk yapılacak iş; ham failureReason ipucunda kalır.
  failureHint?: string | null;
  replyToMessageId: number | null;
  createdAt: string;
  // Ekler. Eski backend alanı göndermez (undefined).
  attachments?: MessageAttachmentDto[];
}

// url: kanal CDN adresi ya da oturum isteyen kendi ucumuz ("/api/..." ile başlar).
export interface MessageAttachmentDto { id: number; contentType: MessageContentType; fileName: string | null; url: string }

// Test alanı oturumu. isBotActive false ise bot devretmiş demektir — canlıda
// konuşmanın temsilciye düşeceği an.
export interface SandboxSessionDto {
  conversationId: number;
  country: string;
  isBotActive: boolean;
  messages: MessageDto[];
  debug: SandboxDebugDto;
}

export interface EmbeddedSignupConfigDto { appId: string; configurationId: string; configured: boolean
  // Configured=false ise EKSİK ayar anahtarlarının adları. Buton gizlenmez;
  // kullanıcıya hangi ayarın eksik olduğu gösterilir.
  missingSettings: string[];
}
export interface WhatsAppConnectionDto {
  channelId: number; phoneNumberId: string; displayPhoneNumber: string; verifiedName: string;
  isActive: boolean; botEnabled: boolean; lastWebhookAt: string | null;
}
export interface WhatsAppTemplateDto {
  id: string; name: string; status: string; language: string; category: string;
}

// Facebook/Instagram OAuth ile otomatik bağlama — manuel formun yanındaki kısayol.
export interface MetaPagesConfigDto { appId: string; graphApiVersion: string; configured: boolean; configurationId?: string | null
  // Configured=false ise EKSİK ayar anahtarlarının adları. Buton gizlenmez;
  // kullanıcıya hangi ayarın eksik olduğu gösterilir.
  missingSettings: string[];
}
// Sunucu taraflı OAuth: panel bu adresi açılır pencerede açar, kod doğrudan sunucuya döner.
export interface MetaPagesAuthorizeDto { url: string; state: string }

// Meta girişinde seçilen tüm sayfaların bağlanma sonucu. notGranted: panelde kayıtlı ama bu
// girişte izni VERİLMEYEN kanallar — Meta seçilmeyen sayfaların iznini geri alır.
export interface MetaChannelSummaryDto { channelId: number; type: ChannelType; displayName: string; externalIdentifier: string }
// error doluysa o sayfa bağlanamadı; diğerleri etkilenmez.
export interface ConnectAllPageResultDto {
  pageId: string; pageName: string;
  facebook: ChannelDto | null; instagram: ChannelDto | null; error: string | null;
  // true: kanal önceden vardı, ayarları korunup yalnız jetonu tazelendi.
  facebookAlreadyConnected: boolean; instagramAlreadyConnected: boolean;
}
export interface ConnectAllMetaPagesResultDto { pages: ConnectAllPageResultDto[]; notGranted: MetaChannelSummaryDto[] }

export interface SandboxDebugDto {
  pendingAction: string; vehicleYear: number | null; brand: string | null; model: string | null;
  thicknessMm: number | null; color: string | null; bodyStyle: string | null; package: string | null;
  lastIntent: string | null; lastTools: string | null; lastAction: string | null;
  lastDurationMs: number | null; lastFailure: string | null;
}

export interface BotTestScenarioDto {
  id: string; suite: string; category: string; name: string; steps: string[]; expected: string;
}
export interface BotTestCaseResultDto {
  scenarioId: string; name: string; passed: boolean; expected: string; actual: string; durationMs: number;
}
export interface BotTestRunDto {
  suite: string; total: number; passed: number; failed: number; durationMs: number;
  results: BotTestCaseResultDto[];
}
// ─── Çeviri yardımcıları (Gelen Kutusu v2 §4) ────────────────────────────────
// Müşteri dili ISO 639-1: Kosova müşterisi Arnavutça ("sq") yazar, temsilci Türkçe okur.
export type CustomerLanguageCode = 'tr' | 'en' | 'sq';

export const CUSTOMER_LANGUAGE_LABELS: Record<CustomerLanguageCode, string> = {
  tr: 'Türkçe',
  en: 'İngilizce',
  sq: 'Arnavutça',
};

// Dil seçici/sekme listeleri için sabit sıra (tr, en, sq).
export const CUSTOMER_LANGUAGES = Object.keys(CUSTOMER_LANGUAGE_LABELS) as CustomerLanguageCode[];

export interface MessageTranslationDto {
  text: string;
  sourceLanguage: CustomerLanguageCode;
}

// "Tüm sohbeti çevir": sourceLanguage toplu çeviride bilinmez (null). truncated: yalnız son mesajlar çevrildi.
export interface TranslatedMessageDto {
  messageId: number;
  translatedText: string;
  sourceLanguage: string | null;
}

export interface ConversationTranslationDto {
  items: TranslatedMessageDto[];
  targetLanguage: string;
  truncated: boolean;
}

// summary null: müşteri Türkçe yazıyor, konuşmada metin yok ya da model yanıt vermedi.
export interface ConversationDigestDto {
  summary: string | null;
  customerLanguage: CustomerLanguageCode;
}

// Özetten bağımsız, modelsiz müşteri dili — yazma alanının çeviri anahtarı özeti beklemez.
export interface CustomerLanguageDto {
  customerLanguage: CustomerLanguageCode;
}

// unchanged: müşteri Türkçe yazıyor, metin çevrilmeden döndü.
export interface OutgoingTranslationDto {
  translatedText: string;
  targetLanguage: CustomerLanguageCode;
  unchanged: boolean;
}

export interface BotReplyDraftDto {
  id: number; conversationId: number; body: string; mediaUrl: string | null; createdAt: string;
}
export interface BotCatalogQualityDto {
  totalProducts: number; missingBrand: number; missingModel: number; missingModelYear: number;
  missingColor: number; duplicateSkuGroups: number; withoutThicknessInName: number;
}

// WhatsApp şablon mesajı (Faz 6). bodyText {{1}}, {{2}}… yer tutucularını içerir.
export interface SendableTemplateDto {
  name: string;
  language: string;
  category: string;
  bodyText: string;
  parameterCount: number;
}

export interface SendTemplateMessageDto {
  conversationId: number;
  templateName: string;
  language: string;
  parameters: string[];
}

// Kanal teşhisi (Faz 6): her kontrol "ne oldu / neden / ne yapmalı" diliyle gelir.
export const DIAGNOSTIC_STATUS = { Ok: 0, Warning: 1, Failed: 2, Skipped: 3 } as const;
export type DiagnosticStatus = (typeof DIAGNOSTIC_STATUS)[keyof typeof DIAGNOSTIC_STATUS];

export const CHANNEL_VERDICT = { Healthy: 0, Degraded: 1, Broken: 2 } as const;
export type ChannelVerdict = (typeof CHANNEL_VERDICT)[keyof typeof CHANNEL_VERDICT];

export interface DiagnosticCheckDto {
  key: string;
  title: string;
  status: DiagnosticStatus;
  summary: string;
  whatHappened: string | null;
  why: string | null;
  whatToDo: string[];
  technicalDetail: string | null;
}

export interface ChannelDiagnosisDto {
  channelId: number;
  channelName: string;
  channelType: ChannelType;
  verdict: ChannelVerdict;
  headline: string;
  explanation: string;
  checks: DiagnosticCheckDto[];
  checkedAt: string;
}

export interface MessageStatusChangedDto {
  messageId: number;
  conversationId: number;
  channelId: number;
  deliveryStatus: DeliveryStatus;
  deliveredAt: string | null;
  readAt: string | null;
  failureReason: string | null;
  failureHint?: string | null;
}

export interface ConversationQueryParams {
  channelId?: number | null;
  filter?: ConversationFilter;
  search?: string;
  // Ülke kodu (kanal ülkesi; kanal ülkesizse müşterinin ülkesi) ve müşteri etiketi.
  country?: string | null;
  tagId?: number | null;
  // Konu etiketi ve platform (o platformdaki tüm kanallar).
  topic?: ConversationTopic | null;
  // Aşama (P22).
  stage?: ConversationStage | null;
  platform?: ChannelType | null;
  // Markanın tüm kanalları (P29); platform ve kanal filtresiyle birleşir.
  brandId?: number | null;
  skip?: number;
  take?: number;
}

// Sayaç ve pano uç noktaları durum hapı ve sayfalamayı almaz; kalan filtreler liste ile aynıdır.
export type InboxScopeParams = Omit<ConversationQueryParams, 'filter' | 'skip' | 'take'>;

// Pano sütunları — backend BoardColumn ile birebir.
export const BOARD_COLUMN = {
  BotAndNew: 1, AwaitingReply: 2, AwaitingCustomer: 3, OrderInProgress: 4, AwaitingPayment: 5, Completed: 6,
} as const;
export type BoardColumnKey = (typeof BOARD_COLUMN)[keyof typeof BOARD_COLUMN];

export interface BoardColumnDto {
  column: BoardColumnKey;
  total: number;
  conversations: ConversationSummaryDto[];
}

export interface InboxCountsDto {
  counts: Partial<Record<ConversationFilter, number>>;
}

function conversationQueryString(params: ConversationQueryParams): string {
  const search = new URLSearchParams();
  if (params.channelId != null) search.set('channelId', String(params.channelId));
  if (params.filter != null) search.set('filter', String(params.filter));
  if (params.search) search.set('search', params.search);
  if (params.country) search.set('country', params.country);
  if (params.tagId != null) search.set('tagId', String(params.tagId));
  if (params.topic != null) search.set('topic', String(params.topic));
  if (params.stage != null) search.set('stage', String(params.stage));
  if (params.platform != null) search.set('platform', String(params.platform));
  if (params.brandId != null) search.set('brandId', String(params.brandId));
  if (params.skip != null) search.set('skip', String(params.skip));
  if (params.take != null) search.set('take', String(params.take));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// ─── Bot ayarları ─────────────────────────────────────────────────────────────

export interface BotSettingsDto {
  // Bu skorun üstünde bot doğrudan cevaplar.
  autoAnswerThreshold: number;
  // Bu skorun altında hiç cevaplamaz, temsilciye devreder.
  ambiguityThreshold: number;
  // İki aday bu farktan yakınsa "hangisi?" diye sorar.
  ambiguityGap: number;
  workingHoursStart: number;
  workingHoursEnd: number;
  maxConsecutiveReplies: number;
  // Son müşteri mesajından bu yana bu kadar gün geçtiyse yeni oturum: menü yeniden gösterilir,
  // bot eski konuşmayı bağlama almaz. Eski backend göndermezse panel varsayılanı kullanır.
  sessionGapDays?: number;
  // Parça parça yazan müşteride bot son mesajdan sonra bu kadar sn bekler, en fazla debounceMaxSeconds.
  // Frontend backend'den önce yayına çıktığı için opsiyonel; yoksa panel varsayılanı (10/20) kullanılır.
  debounceQuietSeconds?: number;
  debounceMaxSeconds?: number;
  sendProductPhoto: boolean;
  escalateWhenOutOfStock: boolean;
  showMenuOnFirstContact: boolean;
  enableAi: boolean;
  enableStock: boolean;
  enablePrice: boolean;
  enableShipping: boolean;
  enableFitment: boolean;
  // Sohbetten sipariş (P21): bot sipariş bilgisi toplar, onay alır. Eski backend göndermez → kapalı sayılır.
  enableOrders?: boolean;
  // Devirden sonra bot geri dönüşü. Eski backend göndermez → açık sayılır (backend varsayılanı).
  enableBotReturn?: boolean;
  // Takip ajanları (P26-P27): görev açar + ekip uyarır, müşteriye mesaj atmaz. Eski backend göndermez → kapalı.
  enableFollowUps?: boolean;
  // Takip mesajını bot kendisi yollar (açık + pencere içi). Eski backend göndermez → kapalı.
  followUpAutoSend?: boolean;
  // Çapraz satış (P38): onay özetinden önce tamamlayıcı ürün önerir. Eski backend göndermez → kapalı.
  enableCrossSell?: boolean;
  // Havale otomatik eşleşme (P34): sipariş no + tam tutarlı havale siparişi kendiliğinden ödendi yapar. Eski backend göndermez → kapalı.
  enableBankMatch?: boolean;
  // Fotoğraf anlama (P37): müşterinin ürün fotoğrafından Görsel RAG ile ürün bulur. Sesli mesaj kapsam dışı. Eski backend göndermez → kapalı.
  enableMediaUnderstanding?: boolean;
  // Temsilci danışma bayrağı: devir öncesi danışma kaldırıldı, şu an etkisiz (FAZ 7 temsilci yardımcısına ayrıldı).
  enableAgentConsult?: boolean;
  // Fotoğraf eşleşmesinin "güvenli" sayılacağı skor (0.50–0.99). Eski backend göndermez → 0.85.
  photoMatchThreshold?: number;
  pilotMode: boolean;
}

// ─── Yoksayılan numaralar (bot cevap vermeyecek WhatsApp numaraları) ──────────

export interface IgnoredContactDto {
  id: number;
  phoneNumber: string;
  label: string;
  createdAt: string;
}

export interface IgnoredContactUpsertBody {
  phoneNumber: string;
  label: string;
}

// ─── Ülkeler (botun hizmet verdiği ülkeler; tablo tüm kiracılarda ortak) ────────

// NotConfigured: katalog bağlı değil — bot stok/fiyat söylemez, talebi temsilciye devreder.
export type CountryCatalogStatus = 'Live' | 'NotConfigured';

export interface CountryDto {
  code: string;
  name: string;
  defaultLanguage: string;
  currencyCode: string;
  timeZone: string;
  phonePrefixes: string[];
  aliases: string[];
  flagEmoji: string;
  catalogStatus: CountryCatalogStatus;
  isActive: boolean;
  sortOrder: number;
}

export type CountryUpdateBody = Omit<CountryDto, 'code'>;

// ─── SSS (panelden yönetilen soru-cevap) ──────────────────────────────────────

// Info: panelde yazılan sabit cevap. Submenu: alt seçenekler listesi (yalnız ana menüde).
export const BOT_MENU_ACTION = { Stock: 1, Fitment: 2, Shipping: 3, Price: 4, Human: 5, Info: 6, Submenu: 7 } as const;
export type BotMenuAction = (typeof BOT_MENU_ACTION)[keyof typeof BOT_MENU_ACTION];

export interface BotMenuOptionDto {
  action: BotMenuAction;
  order: number;
  labelTr: string;
  labelEn: string;
  triggersTr: string[];
  triggersEn: string[];
  // Arnavutça (Kosova). Boş gönderilirse backend aksiyonun varsayılan Arnavutça metnini kullanır.
  labelSq?: string | null;
  triggersSq?: string[];
  isActive: boolean;
  // Kalıcı kimlik — alt menü bağı bununla kurulur. Yeni seçenekte istemci üretir.
  id?: string | null;
  // Doluysa bu seçenek o alt menünün (Submenu) altındadır.
  parentId?: string | null;
  // Yalnız Info: müşteriye gidecek sabit cevap.
  replyTr?: string | null;
  replyEn?: string | null;
  replySq?: string | null;
}

// Faz 8 — panelden değiştirilebilen bot metinleri. Boş dil = koddaki varsayılan.
export const BOT_TEXT_KEY = {
  FirstGreeting: 1, MenuHint: 2, HandoffRequested: 3, HandoffComplaint: 4,
  HandoffOther: 5, OrderGuidance: 8,
  // FAZ 7: devir sonrası müşteriye talep no + beklenen süre ve beklerken "not aldık".
  HandoffNotice: 9, HandoffAfterHoursNotice: 10, HandoffWaitingAck: 11,
} as const;
export type BotTextKey = (typeof BOT_TEXT_KEY)[keyof typeof BOT_TEXT_KEY];

export interface BotTextEntryDto {
  key: BotTextKey; title: string; description: string;
  defaultTr: string; defaultEn: string; defaultSq: string;
  tr: string | null; en: string | null; sq: string | null;
}
export interface BotTextOverrideDto { key: BotTextKey; tr: string | null; en: string | null; sq: string | null }

// ─── Alias (öğrenilen terim eşlemeleri) ───────────────────────────────────────

// AutoLearned: öğrenme işinin yüksek güvenle kendisi eklediği eşleme (Öğrenme sekmesinden geri alınır).
export const ALIAS_SOURCE = { Manual: 0, LearnedFromFailure: 1, AutoLearned: 2 } as const;
export type AliasSource = (typeof ALIAS_SOURCE)[keyof typeof ALIAS_SOURCE];

export interface AliasDto {
  id: number;
  wrongTerm: string;
  correctTerm: string;
  source: AliasSource;
  timesUsed: number;
  lastUsedAt: string | null;
  isActive: boolean;
  createdAt: string;
}

// Botun anlamadığı kelime + katalogdan üretilen düzeltme adayları.
export interface AliasSuggestionDto {
  term: string;
  occurrences: number;
  lastSeenAt: string | null;
  suggestedCorrections: string[];
}

// ─── Ana dashboard (KpiBar) özet kartı ─────────────────────────────────────────

export interface OmnichannelDailyPointDto {
  date: string;
  botMessageCount: number;
  humanMessageCount: number;
}

export interface OmnichannelOverviewDto {
  from: string;
  to: string;
  connectedChannelCount: number;
  totalMessageCount: number;
  botHandledRatePercent: number | null;
  avgResponseTimeSeconds: number | null;
  openConversationCount: number;
  dailyTrend: OmnichannelDailyPointDto[];
}

function sandboxQuery(country: string, profileId: number | null): string {
  const countryParam = `country=${encodeURIComponent(country)}`;
  return profileId === null ? countryParam : `${countryParam}&profileId=${profileId}`;
}

export const omnichannelApi = {
  getOverview: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set('from', from);
    if (to) q.set('to', to);
    const qs = q.toString();
    return request<OmnichannelOverviewDto>(`/omnichannel/dashboard/overview${qs ? `?${qs}` : ''}`);
  },

  getEmbeddedSignupConfig: () =>
    request<EmbeddedSignupConfigDto>('/omnichannel/whatsapp/embedded-signup/config'),
  completeEmbeddedSignup: (body: {
    country?: string | null; storeCode?: string | null; catalogProfileId?: number | null;
    // phoneNumberId: coexistence bitişinde Meta göndermeyebilir; sunucu WABA'dan bulur.
    authorizationCode: string; wabaId: string; phoneNumberId?: string | null; businessId?: string | null;
  }) => request<WhatsAppConnectionDto>('/omnichannel/whatsapp/embedded-signup/complete', {
    method: 'POST', body: JSON.stringify(body),
  }),
  getMetaPagesConfig: () =>
    request<MetaPagesConfigDto>('/omnichannel/meta-pages/config'),
  getMetaPagesAuthorizeUrl: () =>
    request<MetaPagesAuthorizeDto>('/omnichannel/meta-pages/authorize-url'),
  connectAllMetaPages: (body: {
    selectionToken: string; country: string | null; storeCode: string | null; catalogProfileId: number | null;
    brandId: number | null;
  }) => request<ConnectAllMetaPagesResultDto>('/omnichannel/meta-pages/connect-all', {
    method: 'POST', body: JSON.stringify(body),
  }),
  getWhatsAppTemplates: (channelId: number) =>
    request<WhatsAppTemplateDto[]>(`/omnichannel/whatsapp/connections/${channelId}/templates`),
  createWhatsAppTemplate: (channelId: number, body: {
    name: string; language: string; category: string; components: unknown[];
  }) => request<WhatsAppTemplateDto>(`/omnichannel/whatsapp/connections/${channelId}/templates`, {
    method: 'POST', body: JSON.stringify(body),
  }),
  getAliases: () => request<AliasDto[]>('/omnichannel/aliases'),
  getAliasSuggestions: () => request<AliasSuggestionDto[]>('/omnichannel/aliases/suggestions'),
  createAlias: (body: { wrongTerm: string; correctTerm: string; source: AliasSource }) =>
    request<AliasDto>('/omnichannel/aliases', { method: 'POST', body: JSON.stringify(body) }),
  deleteAlias: (id: number) =>
    request<void>(`/omnichannel/aliases/${id}`, { method: 'DELETE' }),

  getCountries: () => request<CountryDto[]>('/omnichannel/countries'),
  getCountryAccess: () => request<{ canEdit: boolean }>('/omnichannel/countries/access'),
  createCountry: (body: CountryDto) =>
    request<CountryDto>('/omnichannel/countries', { method: 'POST', body: JSON.stringify(body) }),
  updateCountry: (code: string, body: CountryUpdateBody) =>
    request<CountryDto>(`/omnichannel/countries/${encodeURIComponent(code)}`, { method: 'PUT', body: JSON.stringify(body) }),

  getIgnoredContacts: () => request<IgnoredContactDto[]>('/omnichannel/ignored-contacts'),
  createIgnoredContact: (body: IgnoredContactUpsertBody) =>
    request<IgnoredContactDto>('/omnichannel/ignored-contacts', { method: 'POST', body: JSON.stringify(body) }),
  deleteIgnoredContact: (id: number) =>
    request<void>(`/omnichannel/ignored-contacts/${id}`, { method: 'DELETE' }),

  getBotMenu: () => request<BotMenuOptionDto[]>('/omnichannel/bot-menu'),
  updateBotMenu: (body: BotMenuOptionDto[]) =>
    request<BotMenuOptionDto[]>('/omnichannel/bot-menu', { method: 'PUT', body: JSON.stringify(body) }),

  getBotTexts: () => request<BotTextEntryDto[]>('/omnichannel/bot-menu/texts'),
  updateBotTexts: (body: BotTextOverrideDto[]) =>
    request<BotTextEntryDto[]>('/omnichannel/bot-menu/texts', { method: 'PUT', body: JSON.stringify(body) }),

  getBotSettings: () => request<BotSettingsDto>('/omnichannel/bot-settings'),
  // Sunucu değerleri doğrulayıp gerekirse düzeltir ve düzeltilmiş hâlini döner.
  updateBotSettings: (body: BotSettingsDto) =>
    request<BotSettingsDto>('/omnichannel/bot-settings', { method: 'PUT', body: JSON.stringify(body) }),
  // Yalnız tek özellik bayrağını yazar (diğer ayarlara dokunmaz). Eski backend'de uç yok: 404 döner.
  updateBotFeatureFlag: (key: string, enabled: boolean) =>
    request<BotSettingsDto>('/omnichannel/bot-settings/flags', {
      method: 'PATCH', body: JSON.stringify({ key, enabled }),
    }),

  getMyChannels: () => request<InboxChannelDto[]>('/omnichannel/my-channels'),

  getConversations: (params: ConversationQueryParams = {}) =>
    request<ConversationSummaryDto[]>(`/omnichannel/conversations${conversationQueryString(params)}`),

  getInboxCounts: (params: InboxScopeParams = {}) =>
    request<InboxCountsDto>(`/omnichannel/conversations/counts${conversationQueryString(params)}`),

  getInboxBoard: (params: InboxScopeParams = {}) =>
    request<BoardColumnDto[]>(`/omnichannel/conversations/board${conversationQueryString(params)}`),

  moveOnBoard: (conversationId: number, column: BoardColumnKey) =>
    request<ConversationSummaryDto>(`/omnichannel/conversations/${conversationId}/board-move`, {
      method: 'POST', body: JSON.stringify({ column }),
    }),

  getConversation: (conversationId: number) =>
    request<ConversationSummaryDto>(`/omnichannel/conversations/${conversationId}`),

  // beforeId ile geriye doğru sayfalama — araya yeni mesaj girse de sayfa kaymaz.
  getMessages: (conversationId: number, beforeId?: number, limit = 50) => {
    const search = new URLSearchParams({ limit: String(limit) });
    if (beforeId != null) search.set('beforeId', String(beforeId));
    return request<MessageDto[]>(`/omnichannel/conversations/${conversationId}/messages?${search}`);
  },

  markAsRead: (conversationId: number) =>
    request<void>(`/omnichannel/conversations/${conversationId}/read`, { method: 'POST' }),

  getCannedReplies: () => request<CannedReplyDto[]>('/omnichannel/canned-replies'),
  createCannedReply: (body: CannedReplySaveDto) =>
    request<CannedReplyDto>('/omnichannel/canned-replies', { method: 'POST', body: JSON.stringify(body) }),
  updateCannedReply: (id: number, body: CannedReplySaveDto) =>
    request<CannedReplyDto>(`/omnichannel/canned-replies/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCannedReply: (id: number) =>
    request<void>(`/omnichannel/canned-replies/${id}`, { method: 'DELETE' }),

  getBrands: () => request<BrandDto[]>('/omnichannel/brands'),
  createBrand: (body: BrandSaveDto) =>
    request<BrandDto>('/omnichannel/brands', { method: 'POST', body: JSON.stringify(body) }),
  updateBrand: (id: number, body: BrandSaveDto) =>
    request<BrandDto>(`/omnichannel/brands/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteBrand: (id: number) =>
    request<void>(`/omnichannel/brands/${id}`, { method: 'DELETE' }),
  getPaymentOptions: () => request<PaymentOptionDto[]>('/omnichannel/payment-options'),
  createPaymentOption: (body: PaymentOptionSaveDto) =>
    request<PaymentOptionDto>('/omnichannel/payment-options', { method: 'POST', body: JSON.stringify(body) }),
  updatePaymentOption: (id: number, body: PaymentOptionSaveDto) =>
    request<PaymentOptionDto>(`/omnichannel/payment-options/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deletePaymentOption: (id: number) =>
    request<void>(`/omnichannel/payment-options/${id}`, { method: 'DELETE' }),
  getCrossSellRules: () => request<CrossSellRuleDto[]>('/omnichannel/cross-sell-rules'),
  createCrossSellRule: (body: CrossSellRuleSaveDto) =>
    request<CrossSellRuleDto>('/omnichannel/cross-sell-rules', { method: 'POST', body: JSON.stringify(body) }),
  updateCrossSellRule: (id: number, body: CrossSellRuleSaveDto) =>
    request<CrossSellRuleDto>(`/omnichannel/cross-sell-rules/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCrossSellRule: (id: number) =>
    request<void>(`/omnichannel/cross-sell-rules/${id}`, { method: 'DELETE' }),
  takeOver: (conversationId: number) =>
    request<ConversationSummaryDto>(`/omnichannel/conversations/${conversationId}/take-over`, { method: 'POST' }),
  // Öğrenme raporundaki "SSS olarak cevapla" onayı: bot answer_faq aracıyla bu cevabı kullanır.
  // answerSq: Kosova (Arnavutça) cevabı; boşsa Arnavutça mesaja İngilizce cevap gider, Türkçe asla.
  createFaqEntry: (body: { title: string; triggers: string; answerTr: string; answerEn: string | null; answerSq: string | null }) =>
    request<unknown>('/omnichannel/faq', { method: 'POST', body: JSON.stringify({ ...body, priority: 0, isActive: true }) }),
  getOrderFunnel: (period: OverviewPeriodParams, scope: OverviewScopeParams = {}) =>
    request<OrderFunnelDto>(`/omnichannel/dashboard/funnel?${overviewQueryString(period, scope)}`),
  getQualityTrend: (days: number) => request<QualityTrendDto>(`/omnichannel/dashboard/quality?days=${days}`),
  getAccountHealth: () => request<AccountHealthDto>('/omnichannel/dashboard/account-health'),
  getOverviewSummary: (period: OverviewPeriodParams, scope: OverviewScopeParams = {}) =>
    request<OverviewSummaryDto>(`/omnichannel/dashboard/summary?${overviewQueryString(period, scope)}`),
  getOverviewInsights: (period: OverviewPeriodParams, scope: OverviewScopeParams = {}) =>
    request<OverviewInsightsDto>(`/omnichannel/dashboard/insights?${overviewQueryString(period, scope)}`),
  getLearningReport: (days: number) => request<BotLearningReportDto>(`/omnichannel/dashboard/learning?days=${days}`),
  getConversationContext: (conversationId: number) =>
    request<ConversationContextDto>(`/omnichannel/conversations/${conversationId}/context`),
  getAssignees: (conversationId: number) =>
    request<AssigneeDto[]>(`/omnichannel/conversations/${conversationId}/assignees`),
  assign: (conversationId: number, userId: number | null) =>
    request<ConversationSummaryDto>(`/omnichannel/conversations/${conversationId}/assign`, {
      method: 'PUT', body: JSON.stringify({ userId }),
    }),

  setStatus: (conversationId: number, status: ConversationStatus) =>
    request<ConversationSummaryDto>(`/omnichannel/conversations/${conversationId}/status`, {
      method: 'PUT', body: JSON.stringify({ status }),
    }),

  // Temsilcinin konu seçimi kalıcıdır; CONVERSATION_TOPIC.None "otomatiğe bırak" demektir.
  setTopic: (conversationId: number, topic: ConversationTopic) =>
    request<ConversationSummaryDto>(`/omnichannel/conversations/${conversationId}/topic`, {
      method: 'PUT', body: JSON.stringify({ topic }),
    }),

  setBotActive: (conversationId: number, isActive: boolean) =>
    request<ConversationSummaryDto>(`/omnichannel/conversations/${conversationId}/bot`, {
      method: 'PUT', body: JSON.stringify({ isActive }),
    }),

  // Agent Copilot (Faz 8) — taslak yanıt önerir, KİMSEYE MESAJ GÖNDERMEZ. Temsilci
  // metni düzenleyip kendisi gönderir. text null ise öneri üretilemedi (ör. LLM hatası).
  suggestReply: (conversationId: number) =>
    request<{ text: string | null }>(`/omnichannel/conversations/${conversationId}/suggest-reply`, {
      method: 'POST',
    }),
  // Çeviri yardımcıları — hiçbiri mesaj GÖNDERMEZ. Model çağırdıkları için AI zaman aşımı.
  translateMessage: (messageId: number) =>
    request<MessageTranslationDto>(`/omnichannel/messages/${messageId}/translate`, {
      method: 'POST',
    }, true, AI_REQUEST_TIMEOUT_MS),
  translateConversation: (conversationId: number, targetLanguage: string) =>
    request<ConversationTranslationDto>(`/omnichannel/conversations/${conversationId}/translate`, {
      method: 'POST', body: JSON.stringify({ targetLanguage }),
    }, true, AI_REQUEST_TIMEOUT_MS),
  getConversationDigest: (conversationId: number) =>
    request<ConversationDigestDto>(`/omnichannel/conversations/${conversationId}/summary`,
      undefined, true, AI_REQUEST_TIMEOUT_MS),
  getConversationLanguage: (conversationId: number) =>
    request<CustomerLanguageDto>(`/omnichannel/conversations/${conversationId}/language`),
  translateOutgoing: (conversationId: number, text: string) =>
    request<OutgoingTranslationDto>(`/omnichannel/conversations/${conversationId}/translate-outgoing`, {
      method: 'POST', body: JSON.stringify({ text }),
    }, true, AI_REQUEST_TIMEOUT_MS),
  getBotDrafts: (conversationId: number) =>
    request<BotReplyDraftDto[]>(`/omnichannel/conversations/${conversationId}/bot-drafts`),
  approveBotDraft: (id: number, body?: string) =>
    request<void>(`/omnichannel/bot-drafts/${id}/approve`, {
      method: 'POST', body: JSON.stringify({ body: body ?? null }),
    }),
  rejectBotDraft: (id: number) =>
    request<void>(`/omnichannel/bot-drafts/${id}/reject`, { method: 'POST' }),

  sendMessage: (body: { conversationId: number; body?: string; mediaUrl?: string; replyToMessageId?: number }) =>
    request<MessageDto>('/omnichannel/messages', { method: 'POST', body: JSON.stringify(body) }),
  // Yalnız gönderilemeyen (Failed) temsilci mesajı silinir (soft); başka mesaj 409 döner. Eski backend'de uç yok (404/405).
  deleteMessage: (messageId: number) =>
    request<void>(`/omnichannel/messages/${messageId}`, { method: 'DELETE' }),
  sendMedia: (conversationId: number, file: File, caption: string | null) =>
    sendMediaForm(conversationId, file, caption),
  getChannels: () => request<ChannelDto[]>('/omnichannel/channels'),
  createChannel: (body: ChannelCreateBody) =>
    request<ChannelDto>('/omnichannel/channels', { method: 'POST', body: JSON.stringify(body) }),
  updateChannel: (id: number, body: ChannelUpdateBody) =>
    request<ChannelDto>(`/omnichannel/channels/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteChannel: (id: number, force = false) =>
    request<void>(`/omnichannel/channels/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' }),
  getSendableTemplates: (conversationId: number) =>
    request<SendableTemplateDto[]>(`/omnichannel/messages/templates?conversationId=${conversationId}`),
  sendTemplateMessage: (body: SendTemplateMessageDto) =>
    request<MessageDto>('/omnichannel/messages/template', { method: 'POST', body: JSON.stringify(body) }),
  diagnoseChannel: (id: number) =>
    request<ChannelDiagnosisDto>(`/omnichannel/channels/${id}/diagnosis`),
  // Kanalın kimlik bilgileriyle gerçekten bağlanılabiliyor mu? Sunucuda Status/LastError
  // güncellenir; POST çünkü yan etkisi var ve dışarıya Graph çağrısı yapar.
  testEmailConnection: (body: EmailConnectionTestRequest) =>
    request<EmailConnectionTestResultDto>('/omnichannel/channels/email/test-connection', { method: 'POST', body: JSON.stringify(body) }),
  testChannelConnection: (id: number) =>
    request<ChannelHealthCheckDto>(`/omnichannel/channels/${id}/test-connection`, { method: 'POST' }),
  setChannelActive: (id: number, isActive: boolean) =>
    request<void>(`/omnichannel/channels/${id}/active`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),

  // Yalnızca Facebook/Instagram kanallarında anlamlı — sunucu diğer tiplerde 400 döner.
  // POST anında jobId döner (Accepted); ilerlemeyi görmek için status uç pollanır.
  startImportHistory: (channelId: number) =>
    request<{ jobId: string }>(`/omnichannel/channels/${channelId}/import-history`, { method: 'POST' }),
  getImportHistoryStatus: (channelId: number, jobId: string) =>
    request<HistoryImportJobStatusDto>(
      `/omnichannel/channels/${channelId}/import-history/status/${jobId}`),

  // Bot test alanı — gerçek mesaj hattından geçer, dışarıya hiçbir şey gitmez.
  //
  // Kapsam ÜLKE ("TR" / "UK") ya da bir katalog profili (profileId) — marka/mağaza boyutu
  // yok, çünkü bot da marka ayrımı yapmıyor. Test alanı canlıyla AYNI kapsamı kullanmalı.
  getSandbox: (country: string, profileId: number | null = null) =>
    request<SandboxSessionDto>(`/omnichannel/sandbox?${sandboxQuery(country, profileId)}`),
  // ── Operatör AI'ı ("oc.ai") — MÜŞTERİ BOTUNDAN AYRI uç ────────────────────
  // Panelin altındaki asistan eskiden sendSandbox'ı (müşteri botunun test ucu)
  // çağırıyordu: ekip "en çok mesaj alan kanal hangisi?" diye sorunca soru müşteri
  // botuna gidiyor, bot da müşteriye cevap verir gibi karşılık veriyordu.
  opsChat: (message: string, history: AiChatTurn[] = []) =>
    request<{ reply: string; cards?: AiDataCard[] }>(
      '/omnichannel/ops-chat',
      { method: 'POST', body: JSON.stringify({ message, history }) },
      true,
      AI_REQUEST_TIMEOUT_MS,
    ),

  // Test mesajı botu (dolayısıyla modeli) eşzamanlı çalıştırır; model yoğunken 25 sn yetmiyordu.
  sendSandbox: (country: string, body: string, profileId: number | null = null) =>
    request<SandboxSessionDto>('/omnichannel/sandbox/messages', {
      method: 'POST', body: JSON.stringify({ country, body, profileId }),
    }, true, AI_REQUEST_TIMEOUT_MS),
  // Test alanından ürün fotoğrafı (+ isteğe bağlı yazı) gönderir; bot gerçek hattan geçirir.
  sendSandboxPhoto: (country: string, file: File, caption: string, profileId: number | null = null) =>
    sendSandboxPhotoForm(country, file, caption, profileId),
  resetSandbox: (country: string, profileId: number | null = null) =>
    request<SandboxSessionDto>('/omnichannel/sandbox/reset', {
      method: 'POST', body: JSON.stringify({ country, profileId }),
    }),
  getSandboxScenarios: () => request<BotTestScenarioDto[]>('/omnichannel/sandbox/scenarios'),
  getSandboxCatalogQuality: (country: string, profileId: number | null = null) =>
    request<BotCatalogQualityDto>(`/omnichannel/sandbox/catalog-quality?${sandboxQuery(country, profileId)}`),
  // Paketten TEK senaryo çalıştırır; panel senaryoları sırayla çağırıp ilerlemeyi gösterir.
  runSandboxScenario: (country: string, suite: 'smoke' | 'full', scenarioId: string, profileId: number | null = null) =>
    request<BotTestRunDto>('/omnichannel/sandbox/run-suite', {
      method: 'POST', body: JSON.stringify({ country, suite, profileId, scenarioId }),
    }, true, SANDBOX_SCENARIO_TIMEOUT_MS),

  getChannelMembers: (channelId: number) =>
    request<ChannelMemberDto[]>(`/omnichannel/channels/${channelId}/members`),
  getMemberCandidates: (channelId: number) =>
    request<TeamCandidateDto[]>(`/omnichannel/channels/${channelId}/member-candidates`),
  upsertChannelMember: (channelId: number, userId: number, body: ChannelMemberUpdateBody) =>
    request<void>(`/omnichannel/channels/${channelId}/members/${userId}`, { method: 'PUT', body: JSON.stringify(body) }),
  removeChannelMember: (channelId: number, userId: number) =>
    request<void>(`/omnichannel/channels/${channelId}/members/${userId}`, { method: 'DELETE' }),
};

// Test alanı fotoğraf gönderimi (multipart). Bot eşzamanlı çalıştığı için cevap aynı istekte döner.
async function sendSandboxPhotoForm(
  country: string, file: File, caption: string, profileId: number | null,
): Promise<SandboxSessionDto> {
  const form = new FormData();
  form.append('country', country);
  form.append('file', file);
  if (caption) form.append('caption', caption);
  if (profileId !== null) form.append('profileId', String(profileId));

  const res = await fetch(`${BASE}/omnichannel/sandbox/messages/photo`, { method: 'POST', headers: uploadHeaders(), body: form });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Fotoğraf gönderilemedi (${res.status}).`);
  }
  return res.json() as Promise<SandboxSessionDto>;
}

// Sohbetten dosya gönderimi (multipart). Sunucu dosyayı saklar ve kanala herkese açık
// anahtarlı adresle verir. Hata metni sunucunun Türkçe "error" alanından okunur.
async function sendMediaForm(conversationId: number, file: File, caption: string | null): Promise<MessageDto> {
  const form = new FormData();
  form.append('conversationId', String(conversationId));
  form.append('file', file);
  if (caption) form.append('caption', caption);

  const res = await fetch(`${BASE}/omnichannel/messages/media`, { method: 'POST', headers: uploadHeaders(), body: form });
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Dosya gönderilemedi (${res.status}).`);
  }
  return res.json() as Promise<MessageDto>;
}
