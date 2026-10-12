// Tüm mock alanlarının ortak kullandığı kurgusal çekirdek veri.
// Gerçek firma, mağaza, müşteri veya ürün bilgisi İÇERMEZ.
import { createRng } from '../seed';

const rng = createRng();

export const DEMO_COMPANY = 'Demo Oto Aksesuar';

export interface DemoStore {
  code: string;
  name: string;
  country: 'TR' | 'UK';
  currency: 'TRY' | 'GBP';
}

export const DEMO_STORES: DemoStore[] = [
  { code: 'store-a', name: 'Mağaza A', country: 'TR', currency: 'TRY' },
  { code: 'store-b', name: 'Mağaza B', country: 'TR', currency: 'TRY' },
  { code: 'store-c', name: 'Store C (UK)', country: 'UK', currency: 'GBP' },
];

export const DEMO_PLATFORMS = ['Trendyol', 'Hepsiburada', 'Amazon', 'Web Sitesi', 'eBay'] as const;

const FIRST_NAMES = ['Ahmet', 'Elif', 'Mehmet', 'Zeynep', 'Mustafa', 'Ayşe', 'Emre', 'Selin', 'Burak', 'Deniz', 'Can', 'Ece', 'Oliver', 'Amelia', 'Jack', 'Sophie'];
const LAST_NAMES = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Aydın', 'Arslan', 'Koç', 'Taylor', 'Brown', 'Wilson', 'Evans'];
const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Konya', 'Adana', 'Gaziantep', 'London', 'Manchester', 'Leeds'];

export interface DemoCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  city: string;
}

export const DEMO_CUSTOMERS: DemoCustomer[] = Array.from({ length: 60 }, (_, index) => {
  const first = rng.pick(FIRST_NAMES);
  const last = rng.pick(LAST_NAMES);
  return {
    id: index + 1,
    name: `${first} ${last}`,
    email: `${first}.${last}${index + 1}@example.com`.toLocaleLowerCase('en').replace(/[çğıöşü]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' })[c] ?? c),
    phone: `+90 5${rng.int(30, 59)} ${rng.int(100, 999)} ${rng.int(10, 99)} ${rng.int(10, 99)}`,
    city: rng.pick(CITIES),
  };
});

const PRODUCT_KINDS = [
  { name: 'Araç Paspası 3D', category: 'Paspas', price: [450, 1200] },
  { name: 'Bagaj Havuzu', category: 'Bagaj', price: [600, 1500] },
  { name: 'Direksiyon Kılıfı', category: 'İç Aksesuar', price: [120, 350] },
  { name: 'Koltuk Kılıfı Seti', category: 'İç Aksesuar', price: [900, 2400] },
  { name: 'Silecek Takımı', category: 'Bakım', price: [180, 520] },
  { name: 'LED Far Ampulü', category: 'Aydınlatma', price: [250, 800] },
  { name: 'Araç Telefon Tutucu', category: 'Elektronik', price: [90, 380] },
  { name: 'Oto Kokusu', category: 'Bakım', price: [40, 160] },
  { name: 'Çamurluk Paspası', category: 'Dış Aksesuar', price: [220, 640] },
  { name: 'Tavan Barı', category: 'Dış Aksesuar', price: [1100, 3200] },
  { name: 'Geri Görüş Kamerası', category: 'Elektronik', price: [350, 1400] },
  { name: 'Lastik Parlatıcı', category: 'Bakım', price: [60, 210] },
];
const BRANDS = ['AeroLine', 'TrackPro', 'NovaDrive', 'UrbanFit', 'ClearView'];

export interface DemoProduct {
  id: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
}

export const DEMO_PRODUCTS: DemoProduct[] = Array.from({ length: 120 }, (_, index) => {
  const kind = PRODUCT_KINDS[index % PRODUCT_KINDS.length];
  const brand = rng.pick(BRANDS);
  const price = rng.int(kind.price[0], kind.price[1]);
  return {
    id: index + 1,
    sku: `DM-${String(1000 + index)}`,
    name: `${brand} ${kind.name} ${rng.pick(['Siyah', 'Gri', 'Bej', 'Universal', 'Premium'])}`,
    brand,
    category: kind.category,
    price,
    cost: Math.round(price * rng.float(0.45, 0.7)),
    stock: rng.int(0, 240),
  };
});
