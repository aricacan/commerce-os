// Tedarikçi ve hammadde ana verisi (kurgusal). Satın alma, cari hesap, reçete ve ürün-tedarikçi
// mock'ları aynı kayıtları kullanır.
import type { RawMaterial } from '../../api/raw-material';
import type { Supplier, SupplierPriority, SupplierRiskLevel, SupplierStatus, SupplierType } from '../../api/supplier';
import { ago, dayAgo } from '../seed';

interface SupplierSeed {
  name: string;
  shortCode: string;
  city: string;
  country: 'TR' | 'UK';
  type: SupplierType;
  currency: string;
  leadTimeDays: number;
  paymentTermDays: number;
  riskLevel: SupplierRiskLevel;
  priority: SupplierPriority;
  status: SupplierStatus;
  rating: number;
}

const SUPPLIER_SEEDS: SupplierSeed[] = [
  { name: 'Örnek Paspas Üretim Ltd.', shortCode: 'ORN', city: 'Bursa', country: 'TR', type: 'Product', currency: 'TRY', leadTimeDays: 7, paymentTermDays: 30, riskLevel: 'Low', priority: 'Strategic', status: 'Active', rating: 4.6 },
  { name: 'Delta Aksesuar San.', shortCode: 'DLT', city: 'İstanbul', country: 'TR', type: 'Product', currency: 'TRY', leadTimeDays: 5, paymentTermDays: 45, riskLevel: 'Low', priority: 'Normal', status: 'Active', rating: 4.2 },
  { name: 'Kuzey Kauçuk A.Ş.', shortCode: 'KZY', city: 'Kocaeli', country: 'TR', type: 'RawMaterial', currency: 'TRY', leadTimeDays: 10, paymentTermDays: 60, riskLevel: 'Medium', priority: 'Strategic', status: 'Active', rating: 3.9 },
  { name: 'Meridyen Elektronik Ltd.', shortCode: 'MRD', city: 'İzmir', country: 'TR', type: 'Product', currency: 'USD', leadTimeDays: 21, paymentTermDays: 30, riskLevel: 'Medium', priority: 'Normal', status: 'Active', rating: 4.0 },
  { name: 'Ege Tekstil Kaplama', shortCode: 'EGT', city: 'Denizli', country: 'TR', type: 'RawMaterial', currency: 'TRY', leadTimeDays: 8, paymentTermDays: 30, riskLevel: 'Low', priority: 'Backup', status: 'Active', rating: 4.4 },
  { name: 'Northgate Auto Parts Ltd', shortCode: 'NGT', city: 'Manchester', country: 'UK', type: 'Product', currency: 'GBP', leadTimeDays: 12, paymentTermDays: 30, riskLevel: 'Low', priority: 'Strategic', status: 'Active', rating: 4.7 },
  { name: 'Mavi Lojistik Hizmetleri', shortCode: 'MVL', city: 'Ankara', country: 'TR', type: 'Service', currency: 'TRY', leadTimeDays: 2, paymentTermDays: 15, riskLevel: 'Low', priority: 'Normal', status: 'Active', rating: 4.1 },
  { name: 'Yeni Aday Plastik', shortCode: 'YAP', city: 'Gaziantep', country: 'TR', type: 'RawMaterial', currency: 'TRY', leadTimeDays: 14, paymentTermDays: 0, riskLevel: 'High', priority: 'Backup', status: 'Candidate', rating: 3.2 },
];

const CREATED_DAYS_AGO = 300;
const UPDATED_DAYS_AGO = 12;

function toSupplier(seed: SupplierSeed, index: number): Supplier {
  const id = index + 1;
  return {
    id,
    name: seed.name,
    shortCode: seed.shortCode,
    taxNumber: `100000${String(id).padStart(4, '0')}`,
    taxOffice: seed.country === 'TR' ? 'Demo Vergi Dairesi' : null,
    tradeRegistryNumber: null,
    industry: 'Oto Yan Sanayi',
    contactPerson: `Yetkili ${id}`,
    phone: `+90 212 000 00 ${String(10 + id)}`,
    email: `satis${id}@example.com`,
    website: `https://tedarikci${id}.example.com`,
    accountingContactEmail: `muhasebe${id}@example.com`,
    accountingContactPhone: null,
    country: seed.country,
    city: seed.city,
    district: null,
    addressLine: 'Örnek Sanayi Sitesi No: 12',
    postCode: null,
    paymentTermDays: seed.paymentTermDays,
    currency: seed.currency,
    leadTimeDays: seed.leadTimeDays,
    minimumOrderQuantity: 50,
    discountRate: id % 3 === 0 ? 5 : null,
    creditLimit: 250000,
    contractStartDate: dayAgo(240),
    contractEndDate: dayAgo(-125),
    priceListValidUntil: dayAgo(-60),
    accountingExternalCode: `320.${String(id).padStart(3, '0')}`,
    iban: null,
    bankName: 'Demo Banka',
    bankBranchCode: null,
    bankAccountNumber: null,
    swift: null,
    type: seed.type,
    tags: seed.type === 'RawMaterial' ? 'hammadde' : 'ürün',
    riskLevel: seed.riskLevel,
    priority: seed.priority,
    certifications: 'ISO 9001',
    status: seed.status,
    performanceRating: seed.rating,
    notes: null,
    createdAt: ago(CREATED_DAYS_AGO - id * 11),
    updatedAt: ago(UPDATED_DAYS_AGO - (id % 5)),
  };
}

export const DEMO_SUPPLIERS: Supplier[] = SUPPLIER_SEEDS.map(toSupplier);

const RAW_MATERIAL_SEEDS: { name: string; code: string; unit: string; unitCost: number; supplierId: number }[] = [
  { name: 'PVC Granül', code: 'HM-001', unit: 'kg', unitCost: 38, supplierId: 8 },
  { name: 'Kauçuk Levha 3 mm', code: 'HM-002', unit: 'm²', unitCost: 124, supplierId: 3 },
  { name: 'Suni Deri', code: 'HM-003', unit: 'm', unitCost: 96, supplierId: 5 },
  { name: 'Naylon Kumaş', code: 'HM-004', unit: 'm', unitCost: 54, supplierId: 5 },
  { name: 'Dikiş İpliği', code: 'HM-005', unit: 'bobin', unitCost: 12, supplierId: 5 },
  { name: 'Sünger 10 mm', code: 'HM-006', unit: 'm²', unitCost: 47, supplierId: 3 },
  { name: 'Metal Klips', code: 'HM-007', unit: 'adet', unitCost: 2.4, supplierId: 2 },
  { name: 'LED Çip', code: 'HM-008', unit: 'adet', unitCost: 0.35, supplierId: 4 },
  { name: 'Koli Bandı', code: 'HM-009', unit: 'rulo', unitCost: 18, supplierId: 7 },
  { name: 'Silikon Yağ', code: 'HM-010', unit: 'lt', unitCost: 66, supplierId: 8 },
];

const MATERIAL_CREATED_DAYS_AGO = 200;

export const DEMO_RAW_MATERIALS: RawMaterial[] = RAW_MATERIAL_SEEDS.map((seed, index) => ({
  id: index + 1,
  name: seed.name,
  code: seed.code,
  unit: seed.unit,
  unitCost: seed.unitCost,
  currency: 'TRY',
  supplierId: seed.supplierId,
  supplierName: DEMO_SUPPLIERS[seed.supplierId - 1].name,
  notes: null,
  createdAt: ago(MATERIAL_CREATED_DAYS_AGO - index * 7),
  updatedAt: ago(UPDATED_DAYS_AGO + index),
}));
