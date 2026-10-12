// Devir özetinin yapılandırılmış okunuşu. Backend (HandoffSummaryBuilder) özeti dört satır yazar:
// "İstek: …", "Yapılan: …", "Açık kalan: …", "Duygu: …". Eski/elle yazılmış özette bu satırlar yoksa null döner ve
// özet olduğu gibi gösterilir.

export interface HandoffSummaryParts {
  request: string | null;
  done: string | null;
  open: string | null;
  mood: string | null;
}

const FIELD_BY_LABEL: Record<string, keyof HandoffSummaryParts> = {
  'istek': 'request',
  'yapılan': 'done',
  'açık kalan': 'open',
  'duygu': 'mood',
};

// "- İstek: …" ve "**İstek:** …" gibi biçim süsleri de kabul edilir.
const LINE_PATTERN = /^[\s\-*•]*([^:*]+?)\**\s*:\s*\**\s*(.*)$/u;
// Model "yok" anlamında tire yazar.
const EMPTY_VALUES = new Set(['', '-', '—', '–', 'yok']);

export function parseHandoffSummary(summary: string | null | undefined): HandoffSummaryParts | null {
  const parts: HandoffSummaryParts = { request: null, done: null, open: null, mood: null };
  for (const line of (summary ?? '').split(/\r?\n/)) {
    const match = LINE_PATTERN.exec(line);
    if (!match) continue;
    const field = FIELD_BY_LABEL[match[1].trim().toLocaleLowerCase('tr-TR')];
    const value = match[2].trim();
    if (field && !EMPTY_VALUES.has(value.toLocaleLowerCase('tr-TR'))) parts[field] = value;
  }
  return parts.request || parts.done ? parts : null;
}
