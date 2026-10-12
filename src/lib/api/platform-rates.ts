import { request } from './core';
import type { PlatformRateInfo } from './integrations';

// (Platform, Mağaza) çifti için manuel komisyon/KDV/hizmet bedeli oranını yazar — bkz.
// backend PlatformRatesController. Entegrasyon ağacındaki satır içi düzenleme buradan gider;
// bu her zaman Source=Manual bir kayıt üretir/günceller (ingest edilmiş oran varsa bile).
export const platformRatesApi = {
  save: (body: { platformId: number; storeId: number; commissionRate?: number; vatRate?: number; serviceFee?: number }) =>
    request<PlatformRateInfo>('/platform-rates', { method: 'PUT', body: JSON.stringify(body) }),
};
