'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export type RecentPage = {
  path: string;
  title: string;
  timestamp: number;
};

const PAGE_TITLES: Record<string, { tr: string; en: string }> = {
  '/dashboard': { tr: 'Gösterge Paneli', en: 'Dashboard' },
  '/products': { tr: 'Ürün Yönetimi', en: 'Product Management' },
  '/orders': { tr: 'Siparişler', en: 'Orders' },
  '/products/categories/catalog': { tr: 'Kategori Kataloğu', en: 'Category Catalog' },
  '/products/categories/rules': { tr: 'Kategori Kuralları', en: 'Category Rules' },
  '/products/categories/matching': { tr: 'Kategori Eşleştirme', en: 'Category Matching' },
  '/products/categories/mismatches': { tr: 'Kategori Uyuşmazlıkları', en: 'Category Mismatches' },
  '/boxes': { tr: 'Kutular', en: 'Boxes' },
  '/fitment': { tr: 'Uyum / Fitment', en: 'Fitment' },
  '/finance': { tr: 'Finans Özeti', en: 'Finance Overview' },
  '/finance/pnl': { tr: 'P&L Raporu', en: 'P&L Report' },
  '/loss-products': { tr: 'Zarar Eden Ürünler', en: 'Loss-Making Products' },
  '/trendyol/uploads': { tr: 'Trendyol Fatura Yükleme', en: 'Trendyol Invoice Upload' },
  '/trendyol/reports': { tr: 'Trendyol Raporları', en: 'Trendyol Reports' },
  '/trendyol/campaigns': { tr: 'Kampanyalar', en: 'Campaigns' },
  '/product-costs': { tr: 'Maliyet Yönetimi', en: 'Cost Management' },
  
  '/system/stores': { tr: 'Mağazalar', en: 'Stores' },
};

const STORAGE_KEY = 'demo_recent_pages';

export function useRecentPages() {
  const pathname = usePathname();
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentPages(JSON.parse(stored));
      }
    } catch {
      // Ignore storage read error
    }
  }, []);

  useEffect(() => {
    if (!pathname || pathname === '/login') return;

    const pageInfo = PAGE_TITLES[pathname] ?? {
      tr: pathname.split('/').pop()?.toUpperCase() ?? pathname,
      en: pathname.split('/').pop()?.toUpperCase() ?? pathname,
    };

    const newEntry: RecentPage = {
      path: pathname,
      title: pageInfo.tr,
      timestamp: Date.now(),
    };

    setRecentPages((prev) => {
      const filtered = prev.filter((p) => p.path !== pathname);
      const updated = [newEntry, ...filtered].slice(0, 5);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage write error
      }
      return updated;
    });
  }, [pathname]);

  return { recentPages };
}
