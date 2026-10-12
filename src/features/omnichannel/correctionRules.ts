import { DELIVERY_STATUS, type MessageDto } from '../../lib/api/omnichannel';
import {
  CORRECTION_CATEGORY, CORRECTION_FIX_TYPE, CORRECTION_SIGNAL,
  type CorrectionCategory, type CorrectionFixType, type CorrectionReportDto, type CorrectionSignal,
} from '../../lib/api/omnichannel-learning';
import { senderKindOf } from './messageSender';
import { shortDate } from './overviewRules';

// Temsilci düzeltmelerinden öğrenme kartının ve "Yanlış" düğmesinin saf yardımcıları (P36).

// Panel özeti son 7 günü gösterir (haftalık rapor ile aynı pencere).
export const CORRECTION_REPORT_DAYS = 7;

export const CORRECTION_SIGNAL_LABELS: Record<CorrectionSignal, string> = {
  [CORRECTION_SIGNAL.AgentOverrode]: 'Temsilci cevabı değiştirdi',
  [CORRECTION_SIGNAL.AgentFlagged]: 'Yanlış işaretlendi',
  [CORRECTION_SIGNAL.RepeatedFailure]: 'Tekrar eden hata ile devir',
  [CORRECTION_SIGNAL.AgentConsulted]: 'Temsilciye danışılan',
};

export const CORRECTION_CATEGORY_LABELS: Record<CorrectionCategory, string> = {
  [CORRECTION_CATEGORY.Unknown]: 'Belirsiz',
  [CORRECTION_CATEGORY.Product]: 'Ürün',
  [CORRECTION_CATEGORY.Price]: 'Fiyat',
  [CORRECTION_CATEGORY.Language]: 'Dil',
  [CORRECTION_CATEGORY.Tone]: 'Ton',
  [CORRECTION_CATEGORY.Flow]: 'Akış',
};

export const CORRECTION_FIX_TYPE_LABELS: Record<CorrectionFixType, string> = {
  [CORRECTION_FIX_TYPE.Dictionary]: 'Sözlük eşanlamlısı',
  [CORRECTION_FIX_TYPE.CategoryDictionary]: 'Kategori sözlüğü',
  [CORRECTION_FIX_TYPE.Faq]: 'SSS',
  [CORRECTION_FIX_TYPE.PromptRule]: 'Bot kuralı',
  [CORRECTION_FIX_TYPE.CodeBug]: 'Kod hatası',
};

// Sözlük ve SSS önerileri onay kuyruğuna düşer; diğerleri yalnız raporda görünür.
export const isQueuedFix = (fixType: CorrectionFixType): boolean =>
  fixType === CORRECTION_FIX_TYPE.Dictionary || fixType === CORRECTION_FIX_TYPE.Faq;

// "Yanlış" düğmesi yalnız gerçekten gönderilmiş bir BOT mesajında görünür: kayıtlı (gerçek id),
// metni olan ve müşteriye ulaşmayı deneyen. Gönderilemeyen mesaj müşteri tarafında yanlış olamaz.
export function canFlagWrong(message: MessageDto): boolean {
  if (senderKindOf(message) !== 'bot') return false;
  if (message.id <= 0 || !message.body) return false;
  return message.deliveryStatus !== DELIVERY_STATUS.Pending && message.deliveryStatus !== DELIVERY_STATUS.Failed;
}

export const countOf = (report: CorrectionReportDto, signal: CorrectionSignal): number =>
  report.bySignal.find((s) => s.signal === signal)?.count ?? 0;

export const formatWeek = (weekStart: string): string => `${shortDate(weekStart)} haftası`;

export function correctionSummary(report: CorrectionReportDto): string {
  if (report.totalCount === 0) return `Son ${report.days} günde kayıtlı düzeltme yok.`;
  return `Son ${report.days} günde ${report.totalCount} düzeltme kaydedildi.`;
}
