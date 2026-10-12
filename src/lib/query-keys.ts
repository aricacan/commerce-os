export type OrderListFilters = {
  from?: string;
  to?: string;
  search?: string;
  categoryId?: number;
  status?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  campaignUploadId?: number;
};

export type ProductListFilters = {
  categoryId?: number;
  search?: string;
  sortBy?: string;
  brand?: string;
  model?: string;
  modelYear?: string;
  page: number;
  pageSize: number;
  storeCode?: string;
};

export const queryKeys = {
  search: {
    global: (search: string) => ['search', 'global', search] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => ['orders', 'list'] as const,
    list: (filters: OrderListFilters) => ['orders', 'list', filters] as const,
    detail: (id: number) => ['orders', 'detail', id] as const,
  },
  products: {
    all: ['products'] as const,
    lists: () => ['products', 'list'] as const,
    list: (filters: ProductListFilters) => ['products', 'list', filters] as const,
    brands: ['products', 'brands'] as const,
    models: (brand: string) => ['products', 'models', brand] as const,
  },
  fitment: {
    all: ['fitment'] as const,
    batches: ['fitment', 'batches'] as const,
    rowsAll: ['fitment', 'rows'] as const,
    rows: (filters: { batchId?: number; status?: string; search?: string; page: number }) => ['fitment', 'rows', filters] as const,
    productsAll: ['fitment', 'products'] as const,
    products: (filters: { search?: string; page: number }) => ['fitment', 'products', filters] as const,
    productDetails: ['fitment', 'product-detail'] as const,
    productDetail: (productId: number | null) => ['fitment', 'product-detail', productId] as const,
    productSearch: (search: string, categoryId?: number) => ['fitment', 'product-search', { search, categoryId }] as const,
    categoryMaps: ['fitment', 'category-maps'] as const,
  },
  widgets: {
    all: ['widgets'] as const,
    saved: ['widgets', 'saved'] as const,
    preview: (slot: number, request: unknown) => ['widgets', 'preview', slot, request] as const,
  },
  system: {
    integrations: ['system', 'integrations'] as const,
    users: ['system', 'users'] as const,
    roles: ['system', 'roles'] as const,
    permissions: ['system', 'permissions'] as const,
    aiUsageSummary: ['system', 'ai', 'usage-summary'] as const,
    categoryAiProvider: ['system', 'ai', 'category-provider'] as const,
    moduleFlags: ['system', 'module-flags'] as const,
    moduleAccess: ['system', 'module-access'] as const,
    notifications: ['system', 'notifications'] as const,
    notificationSettings: ['system', 'notification-settings'] as const,
    partnerHubClients: ['system', 'partnerhub-clients'] as const,
    partnerHubActivity: (from: string, to: string) => ['system', 'partnerhub-activity', from, to] as const,
    tenants: ['system', 'tenants'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
  },
  syntheticChecks: {
    access: ['synthetic-checks', 'access'] as const,
    overview: ['synthetic-checks', 'overview'] as const,
    histories: ['synthetic-checks', 'history'] as const,
    history: (key: string) => ['synthetic-checks', 'history', key] as const,
  },
  reference: {
    categories: ['reference', 'categories'] as const,
    platforms: ['reference', 'platforms'] as const,
  },
} as const;
