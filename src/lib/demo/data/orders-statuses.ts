// Sipariş durumları: pazaryeri durumu (UniversalStatus) ve bizim operasyon durumlarımız.
import type { OperationStatus } from '../../api/orderStatuses';

export const STATUS_NEW = 'Yeni';
export const STATUS_AWAITING = 'Onay Bekliyor';
export const STATUS_APPROVED = 'Onaylandı';
export const STATUS_SOURCING = 'Tedarik Sürecinde';
export const STATUS_PREPARING = 'Hazırlanıyor';
export const STATUS_SHIPPED = 'Kargolandı';
export const STATUS_DELIVERED = 'Teslim Edildi';
export const STATUS_CANCELLED = 'İptal';
export const STATUS_RETURNED = 'İade';

/** Kapanmış (artık ilerlemeyen) pazaryeri durumları. */
export const FINAL_STATUSES: readonly string[] = [STATUS_DELIVERED, STATUS_CANCELLED, STATUS_RETURNED];

type OperationStatusSeed = Pick<OperationStatus, 'id' | 'name' | 'color' | 'statusText'> &
  Partial<Pick<OperationStatus, 'isDefault' | 'isFinal' | 'isCancelled'>>;

const OPERATION_STATUS_SEEDS: OperationStatusSeed[] = [
  { id: 1, name: 'Yeni', color: '#3b82f6', statusText: 'Sipariş alındı', isDefault: true },
  { id: 2, name: 'Onaylandı', color: '#10b981', statusText: 'Sipariş onaylandı' },
  { id: 3, name: 'Tedarik Sürecinde', color: '#f59e0b', statusText: 'Ürün tedarik ediliyor' },
  { id: 4, name: 'Hazırlanıyor', color: '#8b5cf6', statusText: 'Paketleme aşamasında' },
  { id: 5, name: 'Kargoya Verildi', color: '#06b6d4', statusText: 'Kargo firmasına teslim edildi' },
  { id: 6, name: 'Tamamlandı', color: '#14b8a6', statusText: 'Teslim edildi', isFinal: true },
  { id: 7, name: 'İptal', color: '#f43f5e', statusText: 'Sipariş iptal edildi', isFinal: true, isCancelled: true },
  { id: 8, name: 'İade', color: '#fb923c', statusText: 'İade süreci', isFinal: true },
];

/** orderCount çağıran tarafından doldurulur (siparişlerden hesaplanır). */
export const OPERATION_STATUS_DEFINITIONS: Omit<OperationStatus, 'orderCount'>[] = OPERATION_STATUS_SEEDS.map(
  (seed, index) => ({
    groupId: null,
    sortOrder: index + 1,
    isDefault: false,
    isFinal: false,
    isCancelled: false,
    notifyEmail: seed.id === 5,
    notifySlack: false,
    notifyPush: seed.id <= 2,
    isActive: true,
    ...seed,
  }),
);

export const OPERATION_STATUS_BY_UNIVERSAL: Record<string, number> = {
  [STATUS_NEW]: 1,
  [STATUS_AWAITING]: 1,
  [STATUS_APPROVED]: 2,
  [STATUS_SOURCING]: 3,
  [STATUS_PREPARING]: 4,
  [STATUS_SHIPPED]: 5,
  [STATUS_DELIVERED]: 6,
  [STATUS_CANCELLED]: 7,
  [STATUS_RETURNED]: 8,
};
