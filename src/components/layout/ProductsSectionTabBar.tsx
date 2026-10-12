'use client';

import { SectionTabBar } from './SectionTabBar';
import { useI18n } from '../../lib/i18n';
import { groupTabItems } from '../../lib/nav-groups';

export function ProductsSectionTabBar() {
  const { t } = useI18n();
  const tabs = groupTabItems('nav_products').map((item) => ({
    href: item.href,
    label: t(item.key),
    Icon: item.Icon,
  }));

  return <SectionTabBar tabs={tabs} />;
}
