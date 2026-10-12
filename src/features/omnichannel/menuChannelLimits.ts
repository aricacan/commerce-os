// Menünün kanallarda nasıl görüneceğini belirleyen Meta sınırları.
//
// Kaynak: sunucudaki adaptörler — WhatsAppCloudApiAdapter / InteractivePayload (3 buton,
// 10 liste satırı, 20/24 karakter, 1024 karakter gövde) ve MetaChannelAdapter (13 hızlı
// cevap, 20 karakter). Sınır aşılırsa sunucu metni KESER; burada bu önceden gösterilir.
export type PreviewChannel = 'whatsapp' | 'instagram' | 'messenger';

interface ChannelLimit {
  name: string;
  maxBody: number;
  // WhatsApp: seçenek sayısı bunu aşmazsa buton, aşarsa liste.
  maxButtons: number;
  buttonTitle: number;
  maxRows: number;
  rowTitle: number;
}

export const CHANNEL_LIMITS: Record<PreviewChannel, ChannelLimit> = {
  whatsapp: { name: 'WhatsApp', maxBody: 1024, maxButtons: 3, buttonTitle: 20, maxRows: 10, rowTitle: 24 },
  // Messenger/Instagram'da buton/liste ayrımı yok: 13'e kadar hızlı cevap.
  instagram: { name: 'Instagram', maxBody: 1000, maxButtons: 13, buttonTitle: 20, maxRows: 13, rowTitle: 20 },
  messenger: { name: 'Messenger', maxBody: 2000, maxButtons: 13, buttonTitle: 20, maxRows: 13, rowTitle: 20 },
};

export type OptionLayout = 'buttons' | 'list';

export function optionLayout(channel: PreviewChannel, optionCount: number): OptionLayout {
  return optionCount <= CHANNEL_LIMITS[channel].maxButtons ? 'buttons' : 'list';
}

// Müşterinin gördüğü (gerekirse kesilmiş) seçenek başlığı.
export function visibleTitle(channel: PreviewChannel, optionCount: number, label: string): string {
  const limit = titleLimit(channel, optionCount);
  return label.length <= limit ? label : `${label.slice(0, limit - 1)}…`;
}

function titleLimit(channel: PreviewChannel, optionCount: number): number {
  const limits = CHANNEL_LIMITS[channel];
  return optionLayout(channel, optionCount) === 'buttons' ? limits.buttonTitle : limits.rowTitle;
}

// Tasarım ekranında gösterilecek uyarılar (boşsa sorun yok).
export function menuWarnings(channel: PreviewChannel, labels: string[], body: string): string[] {
  const limits = CHANNEL_LIMITS[channel];
  const warnings: string[] = [];

  if (body.length > limits.maxBody) {
    warnings.push(`Mesaj ${body.length} karakter; ${limits.name} ${limits.maxBody} karakterden sonrasını keser.`);
  }
  if (labels.length > limits.maxRows) {
    warnings.push(`${labels.length} seçenek var; ${limits.name} ilk ${limits.maxRows} tanesini dokunulabilir gösterir.`);
  }

  const limit = titleLimit(channel, labels.length);
  for (const label of labels.filter((l) => l.length > limit)) {
    warnings.push(`"${label}" ${label.length} karakter; ${limits.name} ${limit} karakterden sonrasını keser.`);
  }
  return warnings;
}
