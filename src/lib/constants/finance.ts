export const FINANCE_YEARS = [2024, 2025, 2026, 2027];

export const FINANCE_MONTHS = [
  { val: 1, label: 'Ocak' },
  { val: 2, label: 'Şubat' },
  { val: 3, label: 'Mart' },
  { val: 4, label: 'Nisan' },
  { val: 5, label: 'Mayıs' },
  { val: 6, label: 'Haziran' },
  { val: 7, label: 'Temmuz' },
  { val: 8, label: 'Ağustos' },
  { val: 9, label: 'Eylül' },
  { val: 10, label: 'Ekim' },
  { val: 11, label: 'Kasım' },
  { val: 12, label: 'Aralık' },
];

// Reklam gideri KANALA göre kırılır — P&L'de "Reklam" tek satır olarak toplanınca hangi
// kanalın para yaktığı görünmüyordu. Liste serbest metin DEĞİL: aynı kanalın "Meta",
// "meta ads", "Facebook" gibi üç ayrı satır olarak dağılmasını önler.
export const AD_PLATFORMS = ['Google', 'Meta', 'eBay', 'TikTok', 'Amazon', 'Diğer'] as const;

// İşletme gideri adları. Reklam artık AYRI bir kategori olduğu için bu listeden çıkarıldı.
export const EXPENSE_NAME_PRESETS = [
  'Personel',
  'Kira',
  'Nakliye (TR-UK)',
  'Ofis Giderleri',
  'Vergi / SGK',
  'Muhasebe / Danışmanlık',
  'Yazılım / Abonelik',
  'Diğer',
];
