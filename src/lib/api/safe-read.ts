// Sunucu yanıtını güvenli okuma yardımcıları. Ön yüz backend'den önce yayına çıkar: alan eksik ya da yanlış türde
// gelebilir; her okuma güvenli varsayılana düşer (normalize* fonksiyonları bunlarla kurulur).

export type Raw = Record<string, unknown>;

export const asRecord = (value: unknown): Raw => (typeof value === 'object' && value !== null ? value as Raw : {});
export const num = (value: unknown, fallback = 0): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);
export const numOrNull = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
export const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
export const strOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);
export const bool = (value: unknown): boolean => value === true;
export const boolOrNull = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
export const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
