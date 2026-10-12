import { COPILOT_STATE, type AgentCopilotDto } from '../../lib/api/copilot';

// Devir sonrası temsilci yardımcısının saf kuralları (FAZ 7).

// Backend CopilotOptionRules ile aynı: köşeli parantezli kısa boşluk ("[kargo süresi]").
const BLANK_PATTERN = /\[[^[\]\n]{1,40}\]/;

export const hasBlanks = (text: string) => BLANK_PATTERN.test(text);

// İlk boşluğun yeri: seçenek yazma alanına alınınca imleç oraya konur.
export function firstBlank(text: string): { start: number; end: number } | null {
  const match = BLANK_PATTERN.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

// Kart görünür mü: yalnız devirdeki konuşmada ve özellik açıkken.
export function copilotVisible(dto: AgentCopilotDto | null): boolean {
  if (dto === null) return false;
  return dto.state !== COPILOT_STATE.Disabled && dto.state !== COPILOT_STATE.NotHandedOff
    && dto.state !== COPILOT_STATE.NothingToAnswer;
}

// Yeni müşteri mesajı geldi (son gelen id değişti) ve öneri eski mesaj için: yeniden üretilmeli.
export function needsRefresh(dto: AgentCopilotDto | null, lastInboundMessageId: number | null): boolean {
  if (dto === null || !copilotVisible(dto)) return false;
  if (dto.state === COPILOT_STATE.Stale) return true;
  return lastInboundMessageId !== null && dto.forMessageId !== null && lastInboundMessageId > dto.forMessageId;
}
