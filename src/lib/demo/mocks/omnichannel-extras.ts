// Omnichannel yan uçları: temsilci yardımcısı (copilot), kategori taksonomisi, araç uyumluluğu ve Foto Stüdyo ön ayarları.
import type { AgentCopilotDto } from '../../api/copilot';
import type { AutomationCatalog, AutomationRule, AutomationRun } from '../../api/automation';
import type { CategoryTaxonomyDto } from '../../api/category-taxonomy';
import type { CompatibilityCoverageDto, PendingCompatibilityDto } from '../../api/vehicle-compatibility';
import type { VehicleFitmentPendingDto, VehicleFitmentPendingPage } from '../../api/vehicle-fitments';
import type { StudioPreset } from '../../api/photo-studio';
import { recordById } from '../data/omnichannel-conversations';
import { DEMO_PRODUCTS } from '../data/core';
import { ago } from '../seed';
import { get, type DemoRequest, type DemoRoute } from '../router';
import { idParam, notFound, numberQuery } from './omnichannel-http';

const PENDING_ROWS = 14;
const PENDING_FITMENTS = 16;

const MAKES: [string, string, string | null][] = [
  ['Volkswagen', 'Passat', 'B8'], ['Volkswagen', 'Golf', '7'], ['Toyota', 'Corolla', 'E210'], ['Renault', 'Clio', '5'],
  ['Fiat', 'Egea', null], ['Opel', 'Astra', 'K'], ['Ford', 'Focus', 'Mk4'],
];

function copilot(request: DemoRequest): AgentCopilotDto | ReturnType<typeof notFound> {
  const record = recordById(idParam(request));
  if (!record) return notFound();
  if (!record.script.handoff) {
    return { state: 'NotHandedOff', suggestionId: null, forMessageId: null, summary: null, openQuestion: null, options: [], language: null, toolsUsed: [], createdAt: null };
  }
  const lastMessage = record.messages[record.messages.length - 1];
  const isEnglish = record.ctx.country === 'UK';
  return {
    state: 'Ready', suggestionId: record.summary.id, forMessageId: lastMessage.id,
    summary: record.script.handoff.summary, openQuestion: 'Müşteri bir sonraki adımda ne bekliyor?',
    options: isEnglish
      ? [
        { label: 'Replacement', text: 'We will send a replacement today at no cost.', textTr: 'Bugün ücretsiz değişim gönderiyoruz.', hasBlanks: false },
        { label: 'Refund', text: 'We can refund you in full within 3 working days.', textTr: '3 iş günü içinde tam iade yapabiliriz.', hasBlanks: false },
      ]
      : [
        { label: 'Değişim', text: 'Ürününüzü bugün ücretsiz değiştiriyoruz, kargo takip bilgisini paylaşacağım.', textTr: null, hasBlanks: false },
        { label: 'İade', text: 'İsterseniz tutarı 3 iş günü içinde iade edebiliriz.', textTr: null, hasBlanks: false },
      ],
    language: isEnglish ? 'en' : 'tr', toolsUsed: ['search_products'], createdAt: ago(0, 0, 3),
  };
}

function taxonomy(): CategoryTaxonomyDto {
  const term = (id: number, language: 'tr' | 'en', value: string) => ({ id, language, term: value, isPrimary: true, source: 'Seed' as const });
  return {
    categories: [
      { id: 1, code: 'floor-mats', isActive: true, terms: [term(1, 'tr', 'Paspas'), term(2, 'en', 'Floor mats')], links: [{ id: 1, sourceType: 'InternalCategory', sourceLabel: 'Paspas', siteName: null }] },
      { id: 2, code: 'boot-liners', isActive: true, terms: [term(3, 'tr', 'Bagaj havuzu'), term(4, 'en', 'Boot liner')], links: [{ id: 2, sourceType: 'SiteCategory', sourceLabel: 'Bagaj Ürünleri', siteName: 'Demo Mağaza (TR)' }] },
      { id: 3, code: 'lighting', isActive: true, terms: [term(5, 'tr', 'Aydınlatma'), term(6, 'en', 'Lighting')], links: [] },
    ],
    unmapped: [
      { sourceType: 'InternalCategory', sourceKey: 'ic-9', label: 'Dış Aksesuar', internalCategoryId: 9, siteSourceId: null, siteName: null, productCount: 24, suggestedCanonicalCategoryId: null },
      { sourceType: 'SiteCategory', sourceKey: 'sc-4', label: 'Bakım Ürünleri', internalCategoryId: null, siteSourceId: 1, siteName: 'Demo Mağaza (TR)', productCount: 14, suggestedCanonicalCategoryId: 3 },
    ],
  };
}

const compatibilityCoverage = (): CompatibilityCoverageDto[] => [
  { country: 'TR', vehicleProducts: 1240, withApproved: 1015, withPendingOnly: 118, withoutAny: 107, pendingRows: 342, approvedPercent: 81.9 },
  { country: 'UK', vehicleProducts: 612, withApproved: 488, withPendingOnly: 64, withoutAny: 60, pendingRows: 151, approvedPercent: 79.7 },
];

function pendingCompatibility(request: DemoRequest): PendingCompatibilityDto[] {
  const country = request.query.get('country');
  const take = numberQuery(request, 'take') ?? PENDING_ROWS;
  const rows = Array.from({ length: PENDING_ROWS }, (_, index): PendingCompatibilityDto => {
    const [make, model, generation] = MAKES[index % MAKES.length];
    return {
      productId: DEMO_PRODUCTS[index].id, productName: DEMO_PRODUCTS[index].name, country: index % 3 === 0 ? 'UK' : 'TR', vehicleModelId: 100 + index,
      vehicle: `${make} ${model} ${generation ?? ''}`.trim(), source: index % 2 === 0 ? 'TitleParse' : 'Fitment', confidence: 0.6 + (index % 4) * 0.08,
    };
  }).filter((row) => !country || row.country === country);
  return rows.slice(numberQuery(request, 'skip') ?? 0, (numberQuery(request, 'skip') ?? 0) + take);
}

function pendingFitments(request: DemoRequest): VehicleFitmentPendingPage {
  const items = Array.from({ length: PENDING_FITMENTS }, (_, index): VehicleFitmentPendingDto => {
    const [make, model, generation] = MAKES[index % MAKES.length];
    return {
      id: index + 1, refType: index % 4 === 0 ? 'SiteCatalogItem' : 'ErpProduct', refId: 1000 + index, productName: DEMO_PRODUCTS[index].name,
      make, model, generation, yearFrom: 2016 + (index % 4), yearTo: 2021 + (index % 3), source: index % 2 === 0 ? 'TitleParse' : 'Fitment',
      confidence: 0.55 + (index % 5) * 0.08,
    };
  }).filter((item) => !request.query.get('make') || item.make === request.query.get('make'));
  const skip = numberQuery(request, 'skip') ?? 0;
  return { items: items.slice(skip, skip + (numberQuery(request, 'take') ?? PENDING_FITMENTS)), total: items.length };
}

const PHOTO_PRESETS: StudioPreset[] = [
  {
    id: 1, name: 'Tedarikçi çerçevesi - kare', hasFrame: false, updatedAt: ago(6),
    maskJson: JSON.stringify({ polygons: [[[0.05, 0.05], [0.95, 0.05], [0.95, 0.95], [0.05, 0.95]]] }),
    optionsJson: JSON.stringify({ output_width: 1200, output_height: 1200, feather_px: 2, bg_mode: 'white', white_threshold: 245, output_format: 'jpeg', jpeg_quality: 90 }),
  },
  {
    id: 2, name: 'Mağaza çerçevesi - yatay', hasFrame: false, updatedAt: ago(2),
    maskJson: JSON.stringify({ polygons: [[[0.04, 0.1], [0.96, 0.1], [0.96, 0.9], [0.04, 0.9]]] }),
    optionsJson: JSON.stringify({ output_width: 1600, output_height: 1000, feather_px: 3, bg_mode: 'none', white_threshold: 245, output_format: 'png', jpeg_quality: 90 }),
  },
];

const AUTOMATION_CATALOG: AutomationCatalog = {
  events: [
    { event: 'ChatOrderConfirmed', subjectType: 'ChatOrder', fields: ['total', 'country', 'paymentMethod'] },
    { event: 'HandoffCreated', subjectType: 'Handoff', fields: ['reason', 'isUrgent', 'channelType'] },
    { event: 'ConversationIdle', subjectType: 'Conversation', fields: ['idleHours', 'stage'] },
  ],
  operators: ['eq', 'neq', 'gt', 'lt', 'contains'],
  actions: ['notify_user', 'add_tag', 'assign_agent', 'send_email'],
};

const AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 1, name: 'Yüksek tutarlı siparişi yöneticiye bildir', triggerEvent: 'ChatOrderConfirmed', isActive: true, priority: 10,
    conditions: [{ field: 'total', op: 'gt', value: '3000' }], actions: [{ type: 'notify_user', params: { userId: '1' } }], lastRunAt: ago(0, 3), lastErrorMessage: null,
  },
  {
    id: 2, name: 'Şikâyet devrini operasyon ekibine ata', triggerEvent: 'HandoffCreated', isActive: true, priority: 20,
    conditions: [{ field: 'reason', op: 'eq', value: 'Complaint' }], actions: [{ type: 'assign_agent', params: { userId: '2' } }, { type: 'add_tag', params: { tag: 'Şikâyet' } }], lastRunAt: ago(0, 9), lastErrorMessage: null,
  },
  {
    id: 3, name: '48 saat sessiz konuşmaya hatırlatma', triggerEvent: 'ConversationIdle', isActive: false, priority: 30,
    conditions: [{ field: 'idleHours', op: 'gt', value: '48' }], actions: [{ type: 'send_email', params: { to: 'ops@example.com' } }], lastRunAt: null, lastErrorMessage: null,
  },
];

const AUTOMATION_RUNS: AutomationRun[] = Array.from({ length: 10 }, (_, index): AutomationRun => ({
  id: index + 1, ruleId: (index % 2) + 1, ruleName: AUTOMATION_RULES[index % 2].name, triggerEvent: AUTOMATION_RULES[index % 2].triggerEvent,
  subjectType: index % 2 === 0 ? 'ChatOrder' : 'Handoff', subjectId: 100 + index, matched: index % 3 !== 0, isSimulation: index === 9,
  outcome: index % 3 !== 0 ? 'Executed' : 'NotMatched', detail: null, errorMessage: null, createdAt: ago(0, index * 4),
}));

export const extraRoutes: DemoRoute[] = [
  get('/omnichannel/conversations/:id/copilot', copilot),
  get('/category-taxonomy', taxonomy),
  get('/vehicle-compatibility/coverage', compatibilityCoverage),
  get('/vehicle-compatibility/pending', pendingCompatibility),
  get('/vehicle-fitments/pending', pendingFitments),
  get('/photo-studio/presets', () => PHOTO_PRESETS),
  get('/automation/catalog', () => AUTOMATION_CATALOG),
  get('/automation/rules', () => AUTOMATION_RULES),
  get('/automation/runs', () => AUTOMATION_RUNS),
];
