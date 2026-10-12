import {
  Activity, Bot, Clock, HeartPulse, LayoutGrid, Lightbulb, ListChecks, LogIn,
  MousePointerClick, PackageSearch, ShieldAlert, ShieldCheck, Workflow, Timer,
} from 'lucide-react';
import type { WorkspaceTab } from '../shared/ModuleWorkspace';

// Sistem İzleme sol paneli — TEK KAYNAK (bkz. docs/PLAN-MONITORING-V2.md "Yeni yapı").
// Sıra, ekranın sorduğu sıradır: önce özet, sonra "kim ne yaptı", sonra "sistem çalışıyor
// mu", en sonda eyleme dönük kuyruk ve güvenlik izi. Anahtar aynı zamanda URL segmentidir
// (/monitoring/sessions) — değiştirilirse kayıtlı linkler varsayılan sekmeye düşer.
export const MONITORING_TABS = [
  { key: 'overview', label: 'Genel Bakış', Icon: Activity },
  { key: 'insights', label: 'Öneriler', Icon: Lightbulb },
  { key: 'sessions', label: 'Oturumlar', Icon: LogIn, group: 'Kullanıcılar' },
  { key: 'activity', label: 'Aktivite Akışı', Icon: ListChecks, group: 'Kullanıcılar' },
  { key: 'page-usage', label: 'Sayfa Kullanımı', Icon: MousePointerClick, group: 'Kullanıcılar' },
  { key: 'health-checks', label: 'Modüller', Icon: HeartPulse, group: 'Sistem Sağlığı' },
  { key: 'pages', label: 'Sayfalar', Icon: LayoutGrid, group: 'Sistem Sağlığı' },
  { key: 'synthetic-checks', label: 'Sentetik Kontroller', Icon: Bot, group: 'Sistem Sağlığı' },
  { key: 'slow-requests', label: 'Yavaş Uçlar', Icon: Clock, group: 'Sistem Sağlığı' },
  { key: 'exceptions', label: 'Hatalar', Icon: ShieldAlert, group: 'Sistem Sağlığı' },
  { key: 'operations', label: 'İş Kuyruğu', Icon: PackageSearch, group: 'Operasyon' },
  // Arka plan işleri (Hangfire) — eski ayrı /hangfire modülü (7 Eki 2026).
  { key: 'jobs', label: 'Arka Plan İşleri', Icon: Workflow, group: 'Operasyon' },
  { key: 'jobs-runtime', label: 'Şu an çalışanlar', Icon: Timer, group: 'Operasyon' },
  { key: 'security', label: 'Güvenlik Kaydı', Icon: ShieldCheck, group: 'Güvenlik' },
] as const satisfies readonly WorkspaceTab[];

export type MonitoringTabKey = (typeof MONITORING_TABS)[number]['key'];

// Öneriler kişi adı ve kişi bazlı kullanım içerir — backend uçları yalnız SuperAdmin'e açık,
// sekme de yalnız ona görünür (adres /monitoring/insights olsa bile kabuk bilinmeyen sekmeyi yok sayar).
const SUPER_ADMIN_ONLY_TABS: ReadonlySet<MonitoringTabKey> = new Set<MonitoringTabKey>(['insights']);
// Sentetik kontroller platformun kendisini dener — yalnız platform işletmecisine (sahip
// kiracıda SuperAdmin) açık. Kiracı SuperAdmin'i bunu göremez; karar sunucudan gelir
// (/api/synthetic-checks/access), rolden türetilmez.
const SYNTHETIC_ONLY_TABS: ReadonlySet<MonitoringTabKey> = new Set<MonitoringTabKey>(['synthetic-checks']);

export interface MonitoringTabAccess {
  isSuperAdmin: boolean;
  canViewSynthetic: boolean;
}

export function visibleMonitoringTabs({ isSuperAdmin, canViewSynthetic }: MonitoringTabAccess) {
  return MONITORING_TABS.filter((tab) => {
    if (SUPER_ADMIN_ONLY_TABS.has(tab.key)) return isSuperAdmin;
    if (SYNTHETIC_ONLY_TABS.has(tab.key)) return canViewSynthetic;
    return true;
  });
}

export function isMonitoringTabKey(value: string | null): value is MonitoringTabKey {
  return MONITORING_TABS.some((tab) => tab.key === value);
}
