// Müşteri CRM yardımcıları: etiketler, görevler, birleştirme önerileri ve zaman çizelgesi.
import type { ChannelType, TeamCandidateDto } from '../../api/omnichannel';
import {
  MERGE_SUGGESTION_STATUS, TIMELINE_EVENT_TYPE, TIMELINE_PAGE_SIZE,
  type CustomerMergeCandidateDto, type CustomerMergeSuggestionDto, type CustomerTimelineEventDto,
  type CustomerTimelinePageDto,
} from '../../api/customer-crm';
import { TASK_SCOPE, TASK_STATUS, type CrmTaskDto } from '../../api/customers';
import { DEMO_USER } from '../config';
import { DEMO_PROFILES, DEMO_TAGS, type DemoProfile } from '../data/orders-customers';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { ago } from '../seed';

const MERGE_PAIRS: ReadonlyArray<readonly [number, number, number, string]> = [
  [4, 19, 0.92, 'Aynı telefon · Aynı ad'],
  [11, 37, 0.81, 'Aynı ad · Aynı şehir'],
  [26, 52, 0.74, 'Benzer ad · Aynı araç'],
];

const TEAM: TeamCandidateDto[] = [
  { userId: DEMO_USER.id, displayName: 'Demo Kullanıcı', email: DEMO_USER.email },
  { userId: 2, displayName: 'Destek Temsilcisi', email: 'destek@example.com' },
  { userId: 3, displayName: 'Satış Temsilcisi', email: 'satis@example.com' },
];

interface TaskSeed {
  title: string;
  profileIndex: number;
  assigneeUserId: number;
  dueInDays: number;
  done?: boolean;
}

const TASK_SEEDS: TaskSeed[] = [
  { title: 'Toplu alım için fiyat teklifi gönder', profileIndex: 3, assigneeUserId: 1, dueInDays: 1 },
  { title: 'Paspas ölçüsünü teyit etmek için ara', profileIndex: 8, assigneeUserId: 1, dueInDays: 0 },
  { title: 'Kargo gecikmesi için bilgi ver', profileIndex: 14, assigneeUserId: 2, dueInDays: -1 },
  { title: 'İade talebini takip et', profileIndex: 21, assigneeUserId: 1, dueInDays: 2 },
  { title: 'Yeni sezon kataloğunu paylaş', profileIndex: 30, assigneeUserId: 3, dueInDays: 5 },
  { title: 'Fatura bilgilerini tamamla', profileIndex: 41, assigneeUserId: 2, dueInDays: 3 },
  { title: 'Memnuniyet geri bildirimi al', profileIndex: 12, assigneeUserId: 1, dueInDays: -3, done: true },
  { title: 'Araç uyumluluğunu kontrol et', profileIndex: 47, assigneeUserId: 1, dueInDays: 4 },
];

const nameOf = (userId: number): string | null => TEAM.find((member) => member.userId === userId)?.displayName ?? null;

const TASKS: CrmTaskDto[] = TASK_SEEDS.map((seed, index) => {
  const profile = DEMO_PROFILES[seed.profileIndex];
  return {
    id: index + 1,
    customerProfileId: profile.id,
    customerName: profile.displayName,
    conversationId: null,
    title: seed.title,
    notes: null,
    assigneeUserId: seed.assigneeUserId,
    assigneeName: nameOf(seed.assigneeUserId),
    createdByUserId: DEMO_USER.id,
    dueAt: ago(-seed.dueInDays),
    status: seed.done ? TASK_STATUS.Done : TASK_STATUS.Open,
    completedAt: seed.done ? ago(1) : null,
    createdAt: ago(index + 2),
  };
});

function tasks(request: DemoRequest): CrmTaskDto[] {
  const { query } = request;
  const scope = query.get('scope');
  const status = query.get('status') ?? String(TASK_STATUS.Open);
  const profileId = query.get('customerProfileId');
  return TASKS.filter((task) =>
    String(task.status) === status
    && (scope !== String(TASK_SCOPE.Mine) || task.assigneeUserId === DEMO_USER.id)
    && (!profileId || task.customerProfileId === Number(profileId)));
}

// ─── Birleştirme önerileri ───────────────────────────────────────────────────

function toCandidate(profile: DemoProfile): CustomerMergeCandidateDto {
  return {
    profileId: profile.id,
    displayName: profile.displayName,
    countryCode: profile.countryCode,
    primaryPhone: profile.phoneDigits,
    channelTypes: profile.channels.map((channel) => channel.channelType) as ChannelType[],
    lastSeenAt: profile.lastSeenAt,
  };
}

const profileById = (id: number): DemoProfile => DEMO_PROFILES.find((profile) => profile.id === id) ?? DEMO_PROFILES[0];

export const MERGE_SUGGESTIONS: CustomerMergeSuggestionDto[] = MERGE_PAIRS.map(([a, b, score, reasons], index) => ({
  id: index + 1,
  score,
  reasons,
  status: MERGE_SUGGESTION_STATUS.Pending,
  createdAt: ago(index + 1),
  profileA: toCandidate(profileById(a)),
  profileB: toCandidate(profileById(b)),
}));

function suggestionsForProfile(request: DemoRequest): CustomerMergeSuggestionDto[] {
  const profileId = Number(request.params.id);
  return MERGE_SUGGESTIONS.filter((item) => item.profileA.profileId === profileId || item.profileB.profileId === profileId);
}

function suggestionList(request: DemoRequest) {
  const skip = Number(request.query.get('skip') ?? 0);
  const take = Number(request.query.get('take') ?? MERGE_SUGGESTIONS.length);
  return { items: MERGE_SUGGESTIONS.slice(skip, skip + take), total: MERGE_SUGGESTIONS.length };
}

// ─── Zaman çizelgesi ─────────────────────────────────────────────────────────

function timelineEvents(profile: DemoProfile): CustomerTimelineEventDto[] {
  const event = (
    key: string, type: CustomerTimelineEventDto['type'], summary: string, occurredAt: string, refType: string | null,
  ): CustomerTimelineEventDto => ({
    id: Number(`${profile.id}${key.padStart(3, '0')}`),
    type, summary, refType, refId: refType ? String(profile.id * 100) : null,
    channelId: null, actorUserId: null, actorName: null, occurredAt,
  });

  return [
    ...profile.channels.map((channel, index) =>
      event(`1${index}`, TIMELINE_EVENT_TYPE.ConversationStarted, `${channel.channelName} üzerinden konuşma başladı`, profile.firstSeenAt, 'conversation')),
    ...profile.interests.map((interest, index) =>
      event(`2${index}`, TIMELINE_EVENT_TYPE.ProductAsked, `${interest.productName} hakkında soru sordu`, interest.firstAskedAt, 'interest')),
    ...profile.chatOrders.map((order, index) =>
      event(`3${index}`, TIMELINE_EVENT_TYPE.OrderPlaced, `${order.publicNo ?? 'Sipariş'} oluşturuldu`, order.createdAt, 'chat_order')),
    ...profile.notes.map((note, index) =>
      event(`4${index}`, TIMELINE_EVENT_TYPE.NoteAdded, 'Not eklendi', note.createdAt, 'note')),
    ...profile.vehicles.map((vehicle, index) =>
      event(`5${index}`, TIMELINE_EVENT_TYPE.VehicleAdded, `Araç eklendi: ${vehicle.make} ${vehicle.model ?? ''}`.trim(), vehicle.updatedAt, 'vehicle')),
  ].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function timeline(request: DemoRequest): CustomerTimelinePageDto {
  const profile = profileById(Number(request.params.id));
  const take = Number(request.query.get('take') ?? TIMELINE_PAGE_SIZE);
  const beforeId = Number(request.query.get('beforeId') ?? 0);
  const older = timelineEvents(profile).filter((item) => !beforeId || item.id < beforeId);
  const items = older.slice(0, take);
  return { items, nextBeforeId: older.length > take ? items[items.length - 1].id : null };
}

export const orderCrmRoutes: DemoRoute[] = [
  get('/omnichannel/customer-tags', () => DEMO_TAGS),
  get('/omnichannel/crm-tasks', tasks),
  get('/omnichannel/crm-assignees', () => TEAM),
  get('/omnichannel/customers/merge-suggestions', suggestionList),
  get('/omnichannel/customers/:id/merge-suggestions', suggestionsForProfile),
  get('/omnichannel/customers/:id/timeline', timeline),
];
