import { SKILL_MODEL_TIER, type BotSkillModelTier, type BotSkillsDto } from '../../lib/api/omnichannel-pipelines';

// Beceriler kartının saf kuralları: niyet etiketi ve model seçeneği metni.

// Anahtarların tek kaynağı backend ConversationIntents; bilinmeyen niyet ham kalır.
const INTENT_LABELS: Record<string, string> = {
  product_search: 'Ürün arama',
  price: 'Fiyat',
  stock: 'Stok',
  order: 'Sipariş',
  shipping: 'Kargo',
  support: 'Destek',
};

export const intentLabel = (intent: string): string => INTENT_LABELS[intent] ?? intent;

export interface TierOption {
  value: BotSkillModelTier;
  label: string;
  disabled: boolean;
}

// Güçlü model sunucuda tanımlı değilse seçenek kapalıdır (sunucu da reddeder); model adı biliniyorsa yanına yazılır.
export function tierOptions(data: Pick<BotSkillsDto, 'standardModel' | 'strongModel'>): TierOption[] {
  const named = (label: string, model: string | null) => (model ? `${label} (${model})` : label);
  return [
    { value: SKILL_MODEL_TIER.standard, label: named('Standart', data.standardModel), disabled: false },
    {
      value: SKILL_MODEL_TIER.strong,
      label: data.strongModel ? named('Güçlü', data.strongModel) : 'Güçlü (sunucuda tanımlı değil)',
      disabled: data.strongModel === null,
    },
  ];
}
