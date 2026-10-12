import {
  MAIL_INTERVAL_DAILY,
  MAIL_INTERVAL_HOURLY,
  MAIL_INTERVAL_MONTHLY,
  MAIL_INTERVAL_WEEKLY,
  type UserMailReportType,
  type UserMailScheduleInterval,
} from '../../lib/api/user-mail';

import { automationUi, t, formatDateTime, type Lang } from '../shared/automation-ui';

// Ortak kabuk jetonları shared/automation-ui'de — Slack paneli de aynılarını kullanır.
export { automationUi as mailUi, t, formatDateTime };
export type { Lang };

export const intervalLabel = (lang: Lang, interval: UserMailScheduleInterval) => {
  switch (interval) {
    case MAIL_INTERVAL_DAILY:
      return t(lang, 'Her Gün', 'Daily');
    case MAIL_INTERVAL_WEEKLY:
      return t(lang, 'Her Hafta (Pzt)', 'Weekly (Mon)');
    case MAIL_INTERVAL_HOURLY:
      return t(lang, 'Saatlik', 'Hourly');
    case MAIL_INTERVAL_MONTHLY:
      return t(lang, 'Her Ay (1.)', 'Monthly (1st)');
    default:
      return '';
  }
};

/**
 * Rapor türü seçenekleri — sıra backend enum'una sabitlenmiştir, değiştirmeyin.
 * Etiket kısa tutulur, içerik `hint` alanına düşer; uzun tek parça etiketler açılır
 * listede kırpılıyordu.
 */
export const reportTypeOptions = (
  lang: Lang
): { value: UserMailReportType; label: string }[] => [
  {
    value: 0,
    label: t(lang, 'Günlük Satış Özeti (V1)', 'Daily Sales Summary (V1)'),
  },
  {
    value: 5,
    label: t(lang, 'Günlük Satış Özeti (V2)', 'Daily Sales Summary (V2)'),
  },
  {
    value: 6,
    label: t(lang, 'Günlük Satış Özeti (V3)', 'Daily Sales Summary (V3)'),
  },
  {
    value: 1,
    label: t(lang, 'Haftalık Performans', 'Weekly Performance'),
  },
  {
    value: 2,
    label: t(lang, 'Aylık Kârlılık (P&L)', 'Monthly P&L'),
  },
  {
    value: 3,
    label: t(lang, 'Kargolandı Bilgilendirmesi', 'Shipped Notice'),
  },
  {
    value: 4,
    label: t(lang, 'Özel Şablon', 'Custom Template'),
  },
];
