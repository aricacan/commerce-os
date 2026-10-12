import type { CustomerTagDto } from '../../lib/api/customers';

// Sistem etiketleri (P23: "Tekrar müşteri", "Açık sipariş"...) kurallarla yönetilir:
// elle eklenmez, kaldırılmaz, silinmez. Eski backend alanı göndermez → elle yönetilen etiket.
export const SYSTEM_TAG_HINT = 'Otomatik etiket — kurallarla güncellenir';

export const isSystemTag = (tag: Pick<CustomerTagDto, 'isSystem'>): boolean => tag.isSystem === true;

// Elle eklenebilecek etiketler: müşteriye bağlı olmayan ve sistem etiketi olmayanlar.
export function attachableTags(catalog: CustomerTagDto[], attachedIds: ReadonlySet<number>): CustomerTagDto[] {
  return catalog.filter((t) => !attachedIds.has(t.id) && !isSystemTag(t));
}
