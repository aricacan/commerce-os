'use client';

import { ChevronDown, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AccountHealthDto } from '../../lib/api/omnichannel';
import { AccountHealthCard } from './AccountHealthCard';
import { MaintenanceCard } from './MaintenanceCard';
import { summarizeSystemHealth, type SystemHealthTone } from './systemHealthRules';
import type { Resource } from './useResource';

export const SYSTEM_HEALTH_SECTION_ID = 'system-health';

const TONE_META: Record<SystemHealthTone, { Icon: LucideIcon; badge: string }> = {
  ok: { Icon: ShieldCheck, badge: 'bg-bg-subtle text-success' },
  warning: { Icon: ShieldAlert, badge: 'bg-warning-soft text-warning' },
  critical: { Icon: ShieldAlert, badge: 'bg-danger-soft text-danger' },
  unknown: { Icon: ShieldQuestion, badge: 'bg-bg-subtle text-fg-muted' },
};

interface Props {
  health: Resource<AccountHealthDto>;
  open: boolean;
  onToggle: () => void;
  onReloadHealth: () => void;
  onNavigate: (tab: string) => void;
}

// Sayfanın altındaki katlanır bölüm: kapalıyken tek satır özet (sorun sayısı rozeti), açıkken Hesap sağlığı
// bulguları ve Bakım işleri. Panodaki asıl içeriği (KPI, grafikler) aşağı itmesin diye varsayılan kapalıdır.
export function SystemHealthSection({ health, open, onToggle, onReloadHealth, onNavigate }: Props) {
  const summary = summarizeSystemHealth(health);
  const { Icon, badge } = TONE_META[summary.tone];

  return (
    <section id={SYSTEM_HEALTH_SECTION_ID} aria-label="Bakım ve sistem sağlığı" className="flex flex-col gap-3 rounded-md border border-border-soft bg-card">
      <button
        type="button" onClick={onToggle} aria-expanded={open} aria-controls={`${SYSTEM_HEALTH_SECTION_ID}-panel`}
        className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent p-3 text-left"
      >
        <Icon size={16} aria-hidden className="shrink-0 text-fg-muted" />
        <span className="flex-1 text-ui-md font-bold text-fg">Bakım ve sistem sağlığı</span>
        <span className={`rounded-md px-2 py-0.5 text-ui-xs font-semibold ${badge}`}>{summary.text}</span>
        <ChevronDown size={16} aria-hidden className={`shrink-0 text-fg-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={`${SYSTEM_HEALTH_SECTION_ID}-panel`} className="flex flex-col gap-3 px-3 pb-3">
          <AccountHealthCard health={health} onReload={onReloadHealth} onNavigate={onNavigate} />
          <MaintenanceCard />
        </div>
      )}
    </section>
  );
}

// Sayfa başlığındaki küçük "Sistem sağlığı" rozeti: sorun sayısını gösterir, tıklanınca alttaki bölümü açar.
export function SystemHealthBadge({ health, onClick }: { health: Resource<AccountHealthDto>; onClick: () => void }) {
  const summary = summarizeSystemHealth(health);
  const { Icon, badge } = TONE_META[summary.tone];

  return (
    <button
      type="button" onClick={onClick} title="Bakım ve sistem sağlığını aç"
      className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-soft px-2.5 text-ui-xs font-semibold sm:h-8 ${badge}`}
    >
      <Icon size={13} aria-hidden />
      Sistem sağlığı · {summary.text}
    </button>
  );
}
