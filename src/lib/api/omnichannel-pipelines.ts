import { request } from './core';
import { normalizePipelines, type BotPipelinesDto } from './omnichannel-eval';

// ─── Omnichannel › Bot hattı sürümleri: hesap varsayılanı + kanal görünümü (FAZ 8) ─────────────
// Sözleşme: docs/omnichannel-eval/FAZ2-API.md. Ön yüz backend'den önce yayına çıkar; yanıtlar normalize edilir.

const ROOT = '/omnichannel/bot-pipelines';

// liveVersion/shadowVersion: kanalın kendi seçimi (null = hesap genelini izliyor). effective*: gerçekte çalışan.
export interface BotPipelineChannelDto {
  channelId: number;
  name: string;
  liveVersion: string | null;
  shadowVersion: string | null;
  effectiveLive: string;
  effectiveShadow: string | null;
}

// Boş/null = seçim yok (canlı: en yeni sürüm, gölge: kapalı).
export interface BotPipelineDefaultsInput {
  liveVersion: string | null;
  shadowVersion: string | null;
}

type Raw = Record<string, unknown>;
const asRecord = (value: unknown): Raw => (typeof value === 'object' && value !== null ? value as Raw : {});
const strOrNull = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

// Kanal kimliği ya da etkin sürümü olmayan satır rozeti yanıltır; atılır.
export function normalizePipelineChannels(value: unknown): BotPipelineChannelDto[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const raw = asRecord(item);
    const effectiveLive = strOrNull(raw.effectiveLive);
    if (typeof raw.channelId !== 'number' || effectiveLive === null) return [];
    return [{
      channelId: raw.channelId,
      name: typeof raw.name === 'string' ? raw.name : `Kanal ${raw.channelId}`,
      liveVersion: strOrNull(raw.liveVersion),
      shadowVersion: strOrNull(raw.shadowVersion),
      effectiveLive,
      effectiveShadow: strOrNull(raw.effectiveShadow),
    }];
  });
}

// ─── v4 beceri paketleri (FAZ 4.3): beceri = araç alt kümesi + kısa playbook; model seviyesi beceri bazında ───────
export const SKILL_MODEL_TIER = { standard: 'standard', strong: 'strong' } as const;
export type BotSkillModelTier = (typeof SKILL_MODEL_TIER)[keyof typeof SKILL_MODEL_TIER];

export interface BotSkillDto {
  key: string;
  name: string;
  description: string;
  intents: string[];
  tools: string[];
  modelTier: BotSkillModelTier;
}

// standardModel: panelin modeli; strongModel: güçlü model adı (null = sunucuda tanımsız, "güçlü" seçilemez).
export interface BotSkillsDto {
  skills: BotSkillDto[];
  commonTools: string[];
  standardModel: string | null;
  strongModel: string | null;
}

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const tierOf = (value: unknown): BotSkillModelTier =>
  value === SKILL_MODEL_TIER.strong ? SKILL_MODEL_TIER.strong : SKILL_MODEL_TIER.standard;

// Anahtarı olmayan beceri satırı atılır; bilinmeyen model seviyesi standart sayılır (sunucunun kuralıyla aynı).
export function normalizeSkills(value: unknown): BotSkillsDto {
  const raw = asRecord(value);
  const skills = Array.isArray(raw.skills) ? raw.skills.flatMap((item) => {
    const skill = asRecord(item);
    if (typeof skill.key !== 'string' || skill.key === '') return [];
    return [{
      key: skill.key,
      name: typeof skill.name === 'string' ? skill.name : skill.key,
      description: typeof skill.description === 'string' ? skill.description : '',
      intents: strings(skill.intents),
      tools: strings(skill.tools),
      modelTier: tierOf(skill.modelTier),
    }];
  }) : [];
  return {
    skills,
    commonTools: strings(raw.commonTools),
    standardModel: strOrNull(raw.standardModel),
    strongModel: strOrNull(raw.strongModel),
  };
}

export const botPipelinesApi = {
  getChannels: async (): Promise<BotPipelineChannelDto[]> =>
    normalizePipelineChannels(await request<unknown>(`${ROOT}/channels`)),

  saveDefaults: async (input: BotPipelineDefaultsInput): Promise<BotPipelinesDto> =>
    normalizePipelines(await request<unknown>(`${ROOT}/defaults`, { method: 'PUT', body: JSON.stringify(input) })),

  getSkills: async (): Promise<BotSkillsDto> => normalizeSkills(await request<unknown>(`${ROOT}/skills`)),

  saveSkillModel: async (key: string, tier: BotSkillModelTier): Promise<BotSkillsDto> =>
    normalizeSkills(await request<unknown>(`${ROOT}/skills/${encodeURIComponent(key)}/model`, {
      method: 'PUT', body: JSON.stringify({ tier }),
    })),
};
