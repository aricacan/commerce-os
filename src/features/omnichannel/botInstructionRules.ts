import {
  APPLY_OUTCOME, INSTRUCTION_MODE, INSTRUCTION_SCOPE,
  type ConversationInstructionCreateResponse, type ConversationInstructionDto, type InstructionMode, type InstructionScope,
} from '../../lib/api/omnichannel-instructions';
import type { ThreadNote } from './chatThread';

// "Bota talimat ver"in saf kuralları: etiketler, sohbet akışı notu ve gönderim sonucu mesajı.

// Backend ConversationInstructionRules.TextMaxLength ile aynı.
export const INSTRUCTION_MAX_LENGTH = 1000;

// Sayaç yalnız sınıra yaklaşınca görünür: panel kısa kalsın.
export const INSTRUCTION_COUNTER_VISIBLE_FROM = 800;

export const INSTRUCTION_MODE_LABELS: Record<InstructionMode, string> = {
  [INSTRUCTION_MODE.Persistent]: 'Kalıcı',
  [INSTRUCTION_MODE.OneShot]: 'Tek sefer',
};

export const INSTRUCTION_MODE_HINTS: Record<InstructionMode, string> = {
  [INSTRUCTION_MODE.Persistent]: 'Bu konuşmada bundan sonra hep uygulanır.',
  [INSTRUCTION_MODE.OneShot]: 'Yalnız bir sonraki bot cevabında uygulanır.',
};

const FALLBACK_AUTHOR = 'Temsilci';

// Sohbet akışında yalnız panelde görünen not: "Enes bota talimat verdi: …".
export function instructionNotes(instructions: ConversationInstructionDto[]): ThreadNote[] {
  // Başka konuşmada geniş kapsamla verilen talimat bu konuşmanın akışında not olarak görünmez.
  return instructions.filter((instruction) => !instruction.inherited).map((instruction) => ({
    id: instruction.id,
    createdAt: instruction.createdAt,
    text: `${instruction.createdByName ?? FALLBACK_AUTHOR} bota talimat verdi: ${instruction.text}`,
  }));
}

export const activeInstructions = (instructions: ConversationInstructionDto[]) =>
  instructions.filter((instruction) => instruction.isActive);

export interface InstructionNotice {
  tone: 'success' | 'info';
  message: string;
}

// Kayıttan sonra temsilciye gösterilecek tek satır. Talimat her durumda kaydedilmiştir.
export function instructionNotice(response: ConversationInstructionCreateResponse): InstructionNotice {
  if (response.applyOutcome === APPLY_OUTCOME.Sent) return { tone: 'success', message: 'Talimat kaydedildi, bot cevabı müşteriye gönderdi.' };
  if (response.applyOutcome === APPLY_OUTCOME.NotRequested) return { tone: 'success', message: 'Talimat kaydedildi.' };
  return { tone: 'info', message: response.detail ?? 'Talimat kaydedildi; cevap gönderilmedi.' };
}

// ── FAZ 7: kapsam ve süre ─────────────────────────────────────────────────────

export const INSTRUCTION_SCOPE_LABELS: Record<InstructionScope, string> = {
  [INSTRUCTION_SCOPE.Conversation]: 'Bu konuşma',
  [INSTRUCTION_SCOPE.Customer]: 'Bu müşteri',
  [INSTRUCTION_SCOPE.Channel]: 'Bu kanal',
  [INSTRUCTION_SCOPE.Account]: 'Tüm hesap',
};

export const INSTRUCTION_SCOPE_HINTS: Record<InstructionScope, string> = {
  [INSTRUCTION_SCOPE.Conversation]: 'Yalnız bu konuşmada uygulanır.',
  [INSTRUCTION_SCOPE.Customer]: 'Müşterinin tüm kanallardaki konuşmalarında uygulanır.',
  [INSTRUCTION_SCOPE.Channel]: 'Bu kanalın tüm konuşmalarında uygulanır.',
  [INSTRUCTION_SCOPE.Account]: 'Hesabın tüm konuşmalarında uygulanır (yalnız yönetici).',
};

// Backend ConversationInstructionRules.DefaultPersistentLifetime ile aynı.
export const DEFAULT_PERSISTENT_DAYS = 7;
const DAY_MS = 86_400_000;
const DATE_INPUT_LENGTH = 10;

// Seçilebilir kapsamlar: tek seferlik talimat yalnız konuşma için; hesap geneli yalnız yönetici.
export function scopeOptions(mode: InstructionMode, isAdmin: boolean): InstructionScope[] {
  if (mode === INSTRUCTION_MODE.OneShot) return [INSTRUCTION_SCOPE.Conversation];
  const scopes: InstructionScope[] = [INSTRUCTION_SCOPE.Conversation, INSTRUCTION_SCOPE.Customer, INSTRUCTION_SCOPE.Channel];
  return isAdmin ? [...scopes, INSTRUCTION_SCOPE.Account] : scopes;
}

// <input type="date"> varsayılanı: bugünden DEFAULT_PERSISTENT_DAYS sonrası (yyyy-mm-dd).
export const defaultExpiryInput = (nowMs: number) =>
  new Date(nowMs + DEFAULT_PERSISTENT_DAYS * DAY_MS).toISOString().slice(0, DATE_INPUT_LENGTH);

// Seçilen günün sonu (UTC) — talimat o gün boyunca geçerli kalır. Boş tarih = varsayılan ömür (null).
export const expiryFromInput = (value: string): string | null => (value ? `${value}T23:59:59Z` : null);
