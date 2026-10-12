'use client';

/**
 * Analitik sayfalarında üstte görünen sekme çubuğu.
 * product-analysis, anomaly, cohort-analytics, cannibalization, return-analytics
 * sayfalarının tümü bu bileşeni kullanır.
 *
 * Bkz. SystemSectionTabBar — sekmeler sol paneldeki grubun tek kaynağından türetilir.
 */

import { SectionTabBar } from './SectionTabBar';
import { useI18n } from '../../lib/i18n';
import { groupTabItems } from '../../lib/nav-groups';

export function AnalyticsSectionTabBar() {
  const { t } = useI18n();
  const tabs = groupTabItems('nav_analytics').map((item) => ({
    href: item.href,
    label: t(item.key),
    Icon: item.Icon,
  }));

  return <SectionTabBar tabs={tabs} />;
}
