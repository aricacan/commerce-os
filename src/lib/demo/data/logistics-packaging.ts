// Koli (ambalaj) kataloğu ve ürün-koli eşleşmesi: kurgusal ölçüler.
import type { BoxInfo } from '../../api/packaging';
import { DEMO_PRODUCTS, type DemoProduct } from './core';

const DESI_DIVISOR = 3000;
const MATCHED_PRODUCT_RATIO = 0.82;

interface BoxSeed {
  boxCode: string;
  name: string;
  width: number;
  length: number;
  height: number;
  price: number;
}

const BOX_SEEDS: BoxSeed[] = [
  { boxCode: 'KL-01', name: 'Küçük Zarf Kutu', width: 20, length: 30, height: 8, price: 4.5 },
  { boxCode: 'KL-02', name: 'Aksesuar Kutusu S', width: 25, length: 35, height: 15, price: 6.8 },
  { boxCode: 'KL-03', name: 'Aksesuar Kutusu M', width: 35, length: 45, height: 20, price: 9.4 },
  { boxCode: 'KL-04', name: 'Paspas Kutusu', width: 45, length: 70, height: 12, price: 14.5 },
  { boxCode: 'KL-05', name: 'Bagaj Havuzu Kutusu', width: 60, length: 100, height: 18, price: 22 },
  { boxCode: 'KL-06', name: 'Koltuk Kılıfı Kutusu', width: 50, length: 60, height: 30, price: 18.2 },
  { boxCode: 'KL-07', name: 'Tavan Barı Kutusu', width: 15, length: 140, height: 15, price: 26.5 },
  { boxCode: 'KL-08', name: 'Elektronik Kutu', width: 22, length: 28, height: 14, price: 7.9 },
  { boxCode: 'KL-09', name: 'Bakım Seti Kutusu', width: 30, length: 30, height: 25, price: 8.6 },
  { boxCode: 'KL-10', name: 'Büyük Koli', width: 60, length: 80, height: 40, price: 31 },
];

const desiOf = (seed: BoxSeed): number => Number(((seed.width * seed.length * seed.height) / DESI_DIVISOR).toFixed(2));

/** Ürünün koliyle eşleşip eşleşmediği ve hangi koliye düştüğü (deterministik). */
export function boxIndexOf(product: DemoProduct): number | null {
  const matched = (product.id % 100) / 100 < MATCHED_PRODUCT_RATIO;
  return matched ? product.id % BOX_SEEDS.length : null;
}

export const DEMO_BOXES: BoxInfo[] = BOX_SEEDS.map((seed, index) => ({
  id: index + 1,
  boxCode: seed.boxCode,
  name: seed.name,
  width: seed.width,
  length: seed.length,
  height: seed.height,
  manualDesi: null,
  price: seed.price,
  desi: desiOf(seed),
  productCount: DEMO_PRODUCTS.filter((product) => boxIndexOf(product) === index).length,
}));
