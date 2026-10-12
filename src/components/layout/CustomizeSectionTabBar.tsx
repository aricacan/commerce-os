'use client';

import { SectionTabBar } from './SectionTabBar';
import { useI18n } from '../../lib/i18n';
import { groupTabItems } from '../../lib/nav-groups';

export function CustomizeSectionTabBar() {
  const { t } = useI18n();
  const tabs = groupTabItems('nav_customize').map((item) => ({
    href: item.href,
    label: t(item.key),
  }));

  return <SectionTabBar tabs={tabs} />;
}
