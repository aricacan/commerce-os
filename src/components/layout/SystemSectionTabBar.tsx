'use client';

import { SectionTabBar } from './SectionTabBar';
import { useI18n } from '../../lib/i18n';
import { groupTabItems } from '../../lib/nav-groups';

// Sekmeler sol paneldeki Ayarlar grubundan TÜRETİLİR — etiketler de aynı çeviri
// anahtarından okunur, dolayısıyla sol panel ile sekme çubuğu birbirinden ayrışamaz.
// (Önceden etiketler burada elle yazılıydı ve 8 yerde sol panelle çelişiyordu; ayrıca
// /system/erp-import hiçbir sekmede yer almadığı için masaüstünden erişilemiyordu.)
export function SystemSectionTabBar() {
  const { t } = useI18n();
  const tabs = groupTabItems('nav_system').map((item) => ({
    href: item.href,
    label: t(item.key),
    Icon: item.Icon,
  }));

  return <SectionTabBar tabs={tabs} />;
}
