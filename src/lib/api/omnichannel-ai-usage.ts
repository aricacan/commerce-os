import { request } from './core';
import { asRecord, bool, list, str } from './safe-read';

// ─── Omnichannel › Yapay zekâ kullanımı ───────────────────────────────────────────
//
// Kendiliğinden çalışan (zamanlanmış) yapay zekâ işlerinin kiracı bazlı anahtarları; hepsi varsayılan kapalı.
// Müşteri sohbeti ve temsilci yolu (bot cevabı, yardımcı, çeviri) burada değildir — onlar hep açıktır.
// Ön yüz backend'den önce yayına çıkar: uç yoksa 404 gelir, alanlar eksik gelebilir (normalize).

const ROOT = '/omnichannel/ai-usage';

export interface AiUsageToggleDto {
  feature: string;
  enabled: boolean;
}

// Adı olmayan satır anahtarlanamaz; atılır. Eksik "enabled" kapalı sayılır (sunucu varsayılanıyla aynı).
export function normalizeAiUsageToggles(value: unknown): AiUsageToggleDto[] {
  return list(value).flatMap((item) => {
    const raw = asRecord(item);
    const feature = str(raw.feature);
    return feature ? [{ feature, enabled: bool(raw.enabled) }] : [];
  });
}

export const aiUsageApi = {
  get: async (): Promise<AiUsageToggleDto[]> => normalizeAiUsageToggles(await request<unknown>(ROOT)),

  // Yanıt güncel tam listedir.
  set: async (feature: string, enabled: boolean): Promise<AiUsageToggleDto[]> =>
    normalizeAiUsageToggles(await request<unknown>(ROOT, { method: 'PUT', body: JSON.stringify({ feature, enabled }) })),
};
