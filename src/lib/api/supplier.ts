import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Supplier (Tedarikçi) master data ─────────────────────────────────────────

export type SupplierType = 'RawMaterial' | 'Product' | 'Service';
export type SupplierRiskLevel = 'Low' | 'Medium' | 'High';
export type SupplierPriority = 'Normal' | 'Strategic' | 'Backup';
export type SupplierStatus = 'Candidate' | 'Active' | 'Inactive' | 'Blacklisted';

export interface Supplier {
  id: number;
  name: string;
  shortCode: string | null;
  taxNumber: string | null;
  taxOffice: string | null;
  tradeRegistryNumber: string | null;
  industry: string | null;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  accountingContactEmail: string | null;
  accountingContactPhone: string | null;
  country: string | null;
  city: string | null;
  district: string | null;
  addressLine: string | null;
  postCode: string | null;
  paymentTermDays: number | null;
  currency: string;
  leadTimeDays: number | null;
  minimumOrderQuantity: number | null;
  discountRate: number | null;
  creditLimit: number | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  priceListValidUntil: string | null;
  // Dış muhasebe sistemindeki (Logo/Mikro/Netsis) cari kod — bağlantı kurulunca bakiye
  // senkronu bu kodla eşleştirilir (bkz. Fatura Ayarları).
  accountingExternalCode: string | null;
  iban: string | null;
  bankName: string | null;
  bankBranchCode: string | null;
  bankAccountNumber: string | null;
  swift: string | null;
  type: SupplierType | null;
  tags: string | null;
  riskLevel: SupplierRiskLevel | null;
  priority: SupplierPriority | null;
  certifications: string | null;
  status: SupplierStatus;
  performanceRating: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Create/Update formu tek bir geniş tip paylaşır — backend'de de Create/Update DTO'ları
// aynı alan setini taşıyor (bkz. SupplierDtos.cs).
export type SupplierFormValues = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

export interface SupplierImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  warnings: string[];
}

export const supplierApi = {
  list: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Supplier[]>(`/suppliers${q}`);
  },

  getById: (id: number) => request<Supplier>(`/suppliers/${id}`),

  create: (body: SupplierFormValues) =>
    request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(body) }),

  update: (id: number, body: SupplierFormValues) =>
    request<Supplier>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  remove: (id: number) => request<void>(`/suppliers/${id}`, { method: 'DELETE' }),

  importExcel: async (file: File): Promise<SupplierImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/suppliers/import-excel`, {
      method: 'POST',
      headers: uploadHeaders(),
      body: formData,
    });
    await throwIfNotOk(res);
    return res.json();
  },
};
