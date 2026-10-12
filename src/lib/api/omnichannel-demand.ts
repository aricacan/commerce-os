import { request } from './core';

// ─── Omnichannel › Talep Sinyalleri (FAZ 5.4) ─────────────────────────────────────
//
// Backend: OmnichannelDemandSignalsController. Botun "bizde yok" dediği aramalar araç + ürün türü bazında
// gruplanır; satın alma listesi. Frontend backend'den önce yayına çıkar: uç henüz yoksa (404) null döner ve
// sayfa nazik bir boş durum gösterir.

const BASE = '/omnichannel/demand-signals';

export type DemandOutcome =
  | 'ModelNoProducts' | 'VehicleUnknown' | 'OtherGenerationsOnly' | 'PartNotForVehicle' | 'NoResults';

export interface DemandSignalFilter {
  days: number;
  country: string | null;
  channelId: number | null;
  outcome: DemandOutcome | null;
}

export interface DemandSignalSampleDto {
  conversationId: number;
  query: string;
  createdAt: string;
}

export interface DemandSignalGroupDto {
  make: string | null;
  model: string | null;
  generation: string | null;
  categoryName: string | null;
  count: number;
  uniqueCustomers: number;
  lastAt: string;
  years: number[];
  outcomes: DemandOutcome[];
  countries: string[];
  samples: DemandSignalSampleDto[];
}

export interface DemandSignalReportDto {
  sinceUtc: string;
  untilUtc: string;
  totalSignals: number;
  truncated: boolean;
  groups: DemandSignalGroupDto[];
}

export function demandSignalQuery(filter: DemandSignalFilter): string {
  const q = new URLSearchParams({ days: String(filter.days) });
  if (filter.country) q.set('country', filter.country);
  if (filter.channelId !== null) q.set('channelId', String(filter.channelId));
  if (filter.outcome) q.set('outcome', filter.outcome);
  return q.toString();
}

export const demandSignalsApi = {
  // null = sunucu bu raporu henüz tanımıyor (backend deploy edilmedi).
  get: async (filter: DemandSignalFilter): Promise<DemandSignalReportDto | null> => {
    try {
      return await request<DemandSignalReportDto>(`${BASE}?${demandSignalQuery(filter)}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('404')) return null;
      throw e;
    }
  },
};
