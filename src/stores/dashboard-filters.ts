import { create } from 'zustand';
import { localDateStr, resolveDatePreset, type DatePreset } from '../utils/date';

export type DateRange = Exclude<DatePreset, 'all'>;

// Platform (pazaryeri) filtresi artık burada DEĞİL — Topbar'daki ambient Platform
// seçiciye taşındı (bkz. store-selector.ts selectedPlatformIds, X-Platform header).
// Tek bir sayfaya özel değil, tüm veri sorgularını aynı anda etkiliyor.

export type RoleView = 'all' | 'executive' | 'finance' | 'operations';

interface DashboardFilterState {
  dateRange: DateRange;
  customFrom: string;
  customTo: string;
  categoryId: number | undefined;
  roleView: RoleView;
  setDateRange: (range: DateRange) => void;
  setCustomDates: (from: string, to: string) => void;
  setCategoryId: (id: number | undefined) => void;
  setRoleView: (role: RoleView) => void;
  getDateParams: () => { from: string; to: string; days: number };
}

export const useDashboardFilters = create<DashboardFilterState>((set, get) => {
  const todayStr = localDateStr();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = localDateStr(thirtyDaysAgo);

  const getInitialRange = (): DateRange => {
    if (typeof window === 'undefined') return 'month';
    try {
      const saved = localStorage.getItem('dashboard_date_range');
      if (saved) return saved as DateRange;
    } catch {}
    return 'month';
  };

  const getInitialCustomFrom = (): string => {
    if (typeof window === 'undefined') return thirtyDaysAgoStr;
    try {
      const saved = localStorage.getItem('dashboard_custom_from');
      if (saved) return saved;
    } catch {}
    return thirtyDaysAgoStr;
  };

  const getInitialCustomTo = (): string => {
    if (typeof window === 'undefined') return todayStr;
    try {
      const saved = localStorage.getItem('dashboard_custom_to');
      if (saved) return saved;
    } catch {}
    return todayStr;
  };

  const getInitialCategoryId = (): number | undefined => {
    if (typeof window === 'undefined') return undefined;
    try {
      const saved = localStorage.getItem('dashboard_category_id');
      if (saved) return Number(saved);
    } catch {}
    return undefined;
  };

  const getInitialRoleView = (): RoleView => {
    if (typeof window === 'undefined') return 'all';
    try {
      const saved = localStorage.getItem('dashboard_role_view');
      if (saved) return saved as RoleView;
    } catch {}
    return 'all';
  };

  return {
    dateRange: getInitialRange(),
    customFrom: getInitialCustomFrom(),
    customTo: getInitialCustomTo(),
    categoryId: getInitialCategoryId(),
    roleView: getInitialRoleView(),
    setDateRange: (range) => {
      try { localStorage.setItem('dashboard_date_range', range); } catch {}
      set({ dateRange: range });
    },
    setCustomDates: (from, to) => {
      try {
        localStorage.setItem('dashboard_custom_from', from);
        localStorage.setItem('dashboard_custom_to', to);
        localStorage.setItem('dashboard_date_range', 'custom');
      } catch {}
      set({ customFrom: from, customTo: to, dateRange: 'custom' });
    },
    setCategoryId: (id) => {
      try {
        if (id === undefined) localStorage.removeItem('dashboard_category_id');
        else localStorage.setItem('dashboard_category_id', String(id));
      } catch {}
      set({ categoryId: id });
    },
    setRoleView: (role) => {
      try { localStorage.setItem('dashboard_role_view', role); } catch {}
      set({ roleView: role });
    },
    getDateParams: () => resolveDatePreset(get().dateRange, get().customFrom, get().customTo),
  };
});
