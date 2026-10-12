import type { AiUsageToggleDto } from '../../lib/api/omnichannel-ai-usage';

// "Yapay zekâ kullanımı" kartının saf kuralları: anahtar adı → etiket/açıklama, sunucu listesinin kart satırlarına
// çevrilmesi. Anahtar adlarının tek kaynağı backend'deki BackgroundAiFeatures.

export interface AiUsageFeatureInfo {
  label: string;
  hint: string;
  // Kapalıyken kullanıcının fark edeceği sonuç; kartta ayrıca vurgulanır.
  offNote?: string;
}

// Sıra = kartta görünme sırası.
export const AI_USAGE_FEATURES: Readonly<Record<string, AiUsageFeatureInfo>> = {
  TopicTagging: {
    label: 'Konu etiketleme',
    hint: 'Konuşmalara 3 dakikada bir otomatik konu etiketi verir (her konuşma bir model çağrısı).',
    offNote: 'Konu etiketleme kapalıyken yeni konuşmalar otomatik konu almaz; temsilci elle seçebilir.',
  },
  QualityAudit: {
    label: 'Günlük kalite denetimi',
    hint: 'Dün kapanan konuşmaların küçük bir örneğini yapay zekâyla puanlar.',
  },
  CorrectionDigest: {
    label: 'Haftalık düzeltme raporu',
    hint: 'Temsilci düzeltmelerinden botun tekrar eden hata kalıplarını çıkarır.',
  },
  FaqDrafts: {
    label: 'SSS taslakları',
    hint: 'Botun çözemediği, temsilcinin cevapladığı sorulardan saatlik SSS taslağı yazar. Sözlük öğrenmesi bundan bağımsız çalışır.',
  },
  MonitoringInsights: {
    label: 'İzleme önerileri (otomatik analiz)',
    hint: 'İzleme › Öneriler’in günlük/haftalık analizinde yapay zekâ kullanır. Kapalıyken öneriler kurallardan üretilir; elle “Analiz et” her zaman çalışır.',
  },
};

export interface AiUsageRow extends AiUsageFeatureInfo {
  feature: string;
  enabled: boolean;
}

// Bilinen anahtarlar sabit sırayla; sunucu bir anahtarı göndermezse kapalı sayılır (sunucu varsayılanı).
// Tanımadığımız yeni anahtar (backend önde) gösterilmez — etiketsiz anahtar kullanıcıyı yanıltır.
export function aiUsageRows(toggles: readonly AiUsageToggleDto[]): AiUsageRow[] {
  const enabledByFeature = new Map(toggles.map((t) => [t.feature, t.enabled]));
  return Object.entries(AI_USAGE_FEATURES).map(([feature, info]) => ({
    feature, ...info, enabled: enabledByFeature.get(feature) ?? false,
  }));
}
