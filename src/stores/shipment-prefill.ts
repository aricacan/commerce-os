import { create } from 'zustand';

export interface ShipmentPrefill {
  orderNumber?: string;
  weightKg?: number;
  desi?: number;
}

interface ShipmentPrefillState {
  prefill: ShipmentPrefill | null;
  setPrefill: (p: ShipmentPrefill) => void;
  consumePrefill: () => ShipmentPrefill | null;
}

// Fiziksel Depo → Kargo modülleri arası tek yönlü köprü: Depo modülü gerçek alıcı
// adresini bilmiyor (kasıtlı — Order/Customer entegrasyonu bu modülün kapsamı
// dışı), o yüzden otomatik gönderi OLUŞTURMAK yerine sadece bildiği alanları
// (sipariş no, ağırlık/desi) Kargo'nun "Yeni Gönderi" formuna taşır; alıcı bilgisini
// kullanıcı elle girer. "Tüket" deseni: bir kere okunur, hemen temizlenir — panel
// tekrar açıldığında eski veriyi tekrar doldurmasın diye.
export const useShipmentPrefill = create<ShipmentPrefillState>((set, get) => ({
  prefill: null,
  setPrefill: (p) => set({ prefill: p }),
  consumePrefill: () => {
    const current = get().prefill;
    if (current) set({ prefill: null });
    return current;
  },
}));
