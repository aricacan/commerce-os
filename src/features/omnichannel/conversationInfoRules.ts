// Sohbet "Ayrıntılar" paneli için saf kurallar: panelde kaç bölüm dolu, başlıktaki küçük
// noktayı hangi kritik durum yakıyor. Bölümlerin kendisi panelde çizilir; başlık yalnız sayaç
// ve renkli nokta taşır ki mesajlara yer kalsın.

const HOUR_MS = 60 * 60_000;
// WhatsApp 24 saat penceresinin kapanmasına bu kadar kala temsilci uyarılır.
export const SERVICE_WINDOW_CLOSING_SOON_MS = 3 * HOUR_MS;

// Panelde gösterilen pencere uyarısı. Pencere tamamen KAPALIYSA uyarı panelde değil yazma
// alanının yerinde durur (yazma alanı zaten gizlenir, nedenini orada söylemek gerekir).
export type WindowWarning = 'whatsappClosingSoon' | 'metaAgentTag';

interface WindowState {
  applies: boolean;
  isOpen: boolean;
  remainingMs: number;
}

export function windowWarningOf(whatsapp: WindowState, meta: WindowState): WindowWarning | null {
  if (whatsapp.applies && whatsapp.isOpen && whatsapp.remainingMs <= SERVICE_WINDOW_CLOSING_SOON_MS) {
    return 'whatsappClosingSoon';
  }
  if (meta.applies && meta.isOpen) return 'metaAgentTag';
  return null;
}

export type InfoAlertTone = 'danger' | 'warning';

export interface InfoAlert {
  tone: InfoAlertTone;
  label: string;
}

export interface ConversationInfoInput {
  hasHandoff: boolean;
  urgentHandoff: boolean;
  followUpCount: number;
  followUpNeedsAgent: boolean;
  hasOrder: boolean;
  hasSummary: boolean;
  hasContext: boolean;
  windowWarning: WindowWarning | null;
  pendingConsultation: boolean;
}

export interface ConversationInfoSummary {
  // Panelde dolu bölüm sayısı (başlıktaki sayaç).
  count: number;
  // Önem sırasıyla kritik durumlar; boşsa başlıkta nokta çizilmez.
  alerts: InfoAlert[];
  // Noktanın rengi: en ağır uyarının tonu.
  tone: InfoAlertTone | null;
}

function alertsOf(input: ConversationInfoInput): InfoAlert[] {
  const alerts: InfoAlert[] = [];
  if (input.urgentHandoff) alerts.push({ tone: 'danger', label: 'Acil devir' });
  if (input.windowWarning === 'whatsappClosingSoon') alerts.push({ tone: 'danger', label: '24 saat penceresi kapanmak üzere' });
  if (input.pendingConsultation) alerts.push({ tone: 'warning', label: 'Bot soru soruyor' });
  if (input.followUpNeedsAgent) alerts.push({ tone: 'warning', label: 'Onay bekleyen takip' });
  return alerts;
}

export function conversationInfoSummary(input: ConversationInfoInput): ConversationInfoSummary {
  const sections = [
    input.hasHandoff,
    input.windowWarning !== null,
    input.followUpCount > 0,
    input.hasOrder,
    input.hasSummary,
    input.hasContext,
  ];
  const alerts = alertsOf(input);
  const tone = alerts.length === 0 ? null : alerts.some((a) => a.tone === 'danger') ? 'danger' : 'warning';
  return { count: sections.filter(Boolean).length, alerts, tone };
}

// Başlık düğmesinin ekran okuyucu etiketi: sayaç ve kritik durumlar tek cümlede.
export function infoButtonLabel(summary: ConversationInfoSummary, open: boolean): string {
  const action = open ? 'Konuşma ayrıntılarını kapat' : 'Konuşma ayrıntılarını aç';
  const count = summary.count > 0 ? ` (${summary.count} bölüm)` : '';
  const alerts = summary.alerts.length > 0 ? ` — dikkat: ${summary.alerts.map((a) => a.label).join(', ')}` : '';
  return `${action}${count}${alerts}`;
}
