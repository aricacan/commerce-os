import type { ErpisErpField } from '@/lib/api';
import { formatDate } from './shared';

// Stok kartı dosyasının ham kolon adları → okunur Türkçe etiket.
//
// Listede olmayan kolon kendi adıyla gösterilir: dosyaya yeni kolon eklenirse kaybolmaz,
// yalnız etiketi ham kalır.
const LABELS: Record<string, string> = {
  stokkodu: 'Stok Kodu',
  stokadi_1: 'Stok Adı',
  stokadi_2: 'Stok Adı 2',
  stokadi_ing: 'İngilizce Ad',
  aktifpasif: 'Aktif / Pasif',
  yururluluktenkalkis_poz: 'Yürürlükten Kalktı mı',
  yururluluktenkalkistarihi_d: 'Yürürlükten Kalkış Tarihi',
  yururluluktenkalkisnedeni: 'Yürürlükten Kalkış Nedeni',
  kayittarihi_d: 'Kayıt Tarihi',
  kmodiftar: 'Son Değişiklik Tarihi',
  kmodifno: 'Değişiklik No',
  Ean_barkod: 'EAN Barkod',
  gtipno: 'GTİP No',
  anagrupkodu: 'Ana Grup Kodu',
  anagrupadi: 'Ana Grup',
  altgrupkodu: 'Alt Grup Kodu',
  altgrupadi: 'Alt Grup',
  stoktipi: 'Stok Tipi',
  tipiadi: 'Tip Adı',
  kalemtipi: 'Kalem Tipi',
  islemvaryoksayi: 'İşlem Sayısı',
  tsatismiktari: 'Toplam Satış Miktarı',
  olcubirimi: 'Ölçü Birimi',
  montaj_urmsu_sn: 'Montaj Süresi (sn)',
  montajmi: 'Montaj Tipi',
  ambalajkodu: 'Ambalaj Kodu',
  ambalajdakimiktar: 'Ambalajdaki Miktar',
  kdvorani: 'KDV Oranı',
  bitmisurungramaji: 'Bitmiş Ürün Ağırlığı',
  toplam_agirlik: 'Toplam Ağırlık',
  agirlik_adet: 'Ağırlık (Adet)',
  agirlik_kacadeticin: 'Ağırlık Kaç Adet İçin',
  birmetreninagr: 'Bir Metrenin Ağırlığı',
  agr_metre: 'Ağırlık Metre',
  agr_metre_kacmt: 'Ağırlık Kaç Metre İçin',
  parca_eni: 'Parça Eni (mm)',
  parca_boyu: 'Parça Boyu (mm)',
  parca_kalinligi: 'Parça Kalınlığı (mm)',
  hacmi_dm: 'Hacim (dm³)',
  yuzey_dm: 'Yüzey (dm²)',
  parcaadeti: 'Parça Adedi',
  sagsol: 'Sağ / Sol',
  leadtime: 'Temin Süresi (gün)',
  minimumstokmiktari: 'Minimum Stok',
  maksimumstokmiktari: 'Maksimum Stok',
  abc: 'ABC Sınıfı',
  satis_abc: 'Satış ABC Sınıfı',
  omursuresi_gun: 'Ömür Süresi (gün)',
  kullanimdurumu: 'Kullanım Durumu',
  ResimVarYok: 'Resim',
  resimno: 'Resim No',
  urunaci: 'Ürün Açıklaması',
  urunaci1: 'Ürün Açıklaması 2',
  satissozlesmesi: 'Satış Sözleşmesi',
  alissozlesmesi: 'Alış Sözleşmesi',
  kalipkodu: 'Kalıp Kodu',
  kalipkodu1: 'Kalıp Kodu 2',
  KalipBilgisi: 'Kalıp Bilgisi',
  makinakodu: 'Makine Kodu',
  makinakodu1: 'Makine Kodu 2',
  proses: 'Proses',
  te_firmakodu: 'Tedarikçi Kodu',
  te_firmaadi: 'Tedarikçi',
  te_firmaadi1: 'Tedarikçi 2',
  alismasano: 'Alış Masası',
  satismasano: 'Satış Masası',
  alismasagrupkodu: 'Alış Masası Grubu',
  satismasagrupkodu: 'Satış Masası Grubu',
  satishesapkodu: 'Satış Hesap Kodu',
  satisiadehesapkodu: 'Satış İade Hesap Kodu',
  alishesapkodu: 'Alış Hesap Kodu',
  alisiadehesapkodu: 'Alış İade Hesap Kodu',
  exphesapkodu: 'İhracat Hesap Kodu',
  exphesapkodu_ik: 'İhracat Hesap Kodu (İK)',
  exphesapkodu_sb: 'İhracat Hesap Kodu (SB)',
  exp_iade_kodu: 'İhracat İade Kodu',
  imphesapkodu_ik: 'İthalat Hesap Kodu (İK)',
  imp_mhk_kodu: 'İthalat MHK Kodu',
  ob_satishesapkodu: 'ÖB Satış Hesap Kodu',
  alis_fason_mhk: 'Alış Fason MHK',
  satis_fason_mhk: 'Satış Fason MHK',
  kurfarki_ahkodu: 'Kur Farkı AH Kodu',
  kurfarki_shkodu: 'Kur Farkı SH Kodu',
  kurfarki_aihkodu: 'Kur Farkı AİH Kodu',
  kurfarki_sihkodu: 'Kur Farkı SİH Kodu',
  fiyatfarki_ahkodu: 'Fiyat Farkı AH Kodu',
  fiyatfarki_shkodu: 'Fiyat Farkı SH Kodu',
  fiyatfarki_aihkodu: 'Fiyat Farkı AİH Kodu',
  fiyatfarki_sihkodu: 'Fiyat Farkı SİH Kodu',
  kontrolmuhasebe_1: 'Muhasebe Kontrol',
};

// Ham değer sayı mı? ERP ondalığı noktayla ve bol sıfırla yazıyor ("4.9470000000").
const NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

export interface ErpFieldRow {
  column: string;
  label: string;
  value: string;
  isBlank: boolean;
}

export function toErpFieldRows(fields: ErpisErpField[]): ErpFieldRow[] {
  return fields.map((f) => {
    const raw = f.value.trim();
    const isNumber = NUMBER_PATTERN.test(raw);
    return {
      column: f.column,
      label: LABELS[f.column] ?? f.column,
      value: formatValue(raw, isNumber),
      // ERP boş alanı çoğu zaman 0 yazıyor; "boşları gizle" bunları da saklar.
      isBlank: raw.length === 0 || (isNumber && Number(raw) === 0),
    };
  });
}

function formatValue(raw: string, isNumber: boolean): string {
  if (raw.length === 0) return '—';
  if (isNumber) return Number(raw).toLocaleString('tr-TR', { maximumFractionDigits: 4 });
  if (ISO_DATE_PATTERN.test(raw)) return formatDate(raw.slice(0, 10));
  return raw;
}
