import { request, BASE, uploadHeaders, throwIfNotOk } from './core';

// ─── Finans Modülü (Kargo Tarifeleri + Giderler + Net Kâr) ────────────────────
export const financeApi = {
  shippingRates: {
    // region verilmezse tüm bölgeler döner; UI her zaman açık bölge gönderir.
    list: (region?: string) =>
      request<import('../../types/api').ShippingRate[]>(
        region ? `/shipping-rates?region=${encodeURIComponent(region)}` : '/shipping-rates'),
    extraFees: () => request<import('../../types/api').ShippingExtraFee[]>('/shipping-rates/extra-fees'),
    // Aras'ın Türkiye fiyat listesi (desi matrisi + ek bedeller) — kendi biçimindeki dosya.
    importArasPriceList: async (file: File): Promise<{ message: string }> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${BASE}/shipping-rates/import`, {
        method: 'POST',
        headers: uploadHeaders(),
        body: formData,
      });
      await throwIfNotOk(res);
      return res.json();
    },
    // Taşıyıcının bölgedeki desi tarifesini kaydeder. applyTo=FromToday yeni sürüm açar (eski
    // siparişler eski fiyatta kalır), AllOrders tüm sürümleri değiştirir. Boş liste tarifeyi siler.
    saveBands: (
      region: string,
      carrier: string,
      bands: import('../../types/api').ShippingRateBandBody[],
      applyTo: import('./shipping-policies').ShippingPolicyApplyTo,
    ) =>
      request<void>(
        `/shipping-rates/bands?region=${encodeURIComponent(region)}&carrier=${encodeURIComponent(carrier)}&applyTo=${applyTo}`,
        { method: 'PUT', body: JSON.stringify(bands) }),
    // Tarife sürümlerinin başlangıç günleri (yyyy-MM-dd; null = en baştan), en yeni önce.
    versions: (region: string, carrier: string) =>
      request<(string | null)[]>(`/shipping-rates/versions?region=${encodeURIComponent(region)}&carrier=${encodeURIComponent(carrier)}`),
    removeVersion: (region: string, carrier: string, validFrom: string | null) =>
      request<void>(
        `/shipping-rates/versions?region=${encodeURIComponent(region)}&carrier=${encodeURIComponent(carrier)}${validFrom ? `&validFrom=${validFrom}` : ''}`,
        { method: 'DELETE' }),
  },
  expenses: {
    list: (period: { year: number; month: number } | { from: string; to: string }) => {
      const qs = 'year' in period
        ? `year=${period.year}&month=${period.month}`
        : `from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;
      return request<import('../../types/api').FinanceExpense[]>(`/finance/expenses?${qs}`);
    },
    // Ortak giderde mağaza başına BİR satır üretilir; bu yüzden dönüş her zaman listedir.
    create: (body: import('../../types/api').SaveFinanceExpense) =>
      request<import('../../types/api').FinanceExpense[]>('/finance/expenses', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: import('../../types/api').SaveFinanceExpense) =>
      request<import('../../types/api').FinanceExpense>(`/finance/expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: number) => request<void>(`/finance/expenses/${id}`, { method: 'DELETE' }),
    // Ortak giderin TÜM payları + grup toplamı. Yalnızca düzenleme formu, yalnızca ortak
    // bir gider açıldığında çağırır; liste ucu bu ayrıntıyı taşımaz (her satırda tekrar
    // ederdi). Gider ortak değilse ya da backend eski sürümse 404 döner — çağıran taraf
    // bunu "grup yok" diye okur ve tek-pay davranışına düşer.
    sharedGroup: (id: number) =>
      request<import('../../types/api').SharedExpenseGroup>(`/finance/expenses/${id}/shared-group`),
  },
  // Tekrarlayan / yillik / ortak gider sablonlari. Sablon kaydedilince backend kapsadigi
  // her ay icin gercek gider satirlari uretir (bkz. ExpenseTemplateExpander).
  expenseTemplates: {
    list: () => request<import('../../types/api').FinanceExpenseTemplate[]>('/finance/expense-templates'),
    create: (body: import('../../types/api').SaveFinanceExpenseTemplate) =>
      request<import('../../types/api').FinanceExpenseTemplate>('/finance/expense-templates', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: import('../../types/api').SaveFinanceExpenseTemplate) =>
      request<import('../../types/api').FinanceExpenseTemplate>(`/finance/expense-templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: number) => request<void>(`/finance/expense-templates/${id}`, { method: 'DELETE' }),
  },
  netProfit: (period: { year: number; month: number } | { from: string; to: string }) => {
    const qs = 'year' in period
      ? `year=${period.year}&month=${period.month}`
      : `from=${encodeURIComponent(period.from)}&to=${encodeURIComponent(period.to)}`;
    return request<import('../../types/api').NetProfitSummary>(`/finance/net-profit?${qs}`);
  },
  // Sistem geneli KDV davranisi (bkz. FinanceVatMode). Kar rakamlarini degistirir.
  vatMode: {
    get: () => request<{ mode: import('../../types/api').VatMode }>('/finance/vat-mode'),
    set: (mode: import('../../types/api').VatMode) =>
      request<{ mode: import('../../types/api').VatMode }>('/finance/vat-mode', {
        method: 'PUT',
        body: JSON.stringify({ mode }),
      }),
  },
  pnl: (year: number) =>
    request<import('../../types/api').PnlResponse>(`/finance/pnl?year=${year}`),
  lossProducts: (from: string, to: string) =>
    request<import('../../types/api').LossProductsResponse>(
      `/finance/loss-products?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    ),
};
