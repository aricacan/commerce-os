'use client';

import { useState } from 'react';
import { AlertOctagon, AlertTriangle, ArrowRight, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { HEALTH_SEVERITY, type AccountHealthDto, type HealthFindingDto, type HealthSeverity } from '../../lib/api/omnichannel';
import type { Resource } from './useResource';

interface Props {
  health: Resource<AccountHealthDto>;
  // Yeniden denetle düğmesi.
  onReload: () => void;
  // Bulgunun düzeltileceği Omnichannel sekmesine geç.
  onNavigate: (tab: string) => void;
}

const SEVERITY_META: Record<HealthSeverity, { label: string; Icon: LucideIcon; tone: string }> = {
  [HEALTH_SEVERITY.Critical]: { label: 'Kritik', Icon: AlertOctagon, tone: 'text-danger' },
  [HEALTH_SEVERITY.Warning]: { label: 'Uyarı', Icon: AlertTriangle, tone: 'text-warning' },
  [HEALTH_SEVERITY.Info]: { label: 'Öneri', Icon: Info, tone: 'text-info' },
};

// Bu kadar bulgudan fazlası "tümünü göster"in arkasında: en ciddiler hep görünür kalır.
const COLLAPSED_COUNT = 4;

// Hesap sağlığı: kurulumdaki eksik/bozuk şeyler (IBAN yok, kanal kopuk, devir bildirilmiyor...) ve her birinin
// düzeltileceği yere kısayol. Sorun yoksa bunu da açıkça söyler. Veriyi üst bileşen yükler (başlıktaki rozet de kullanır).
export function AccountHealthCard({ health: state, onReload, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const health = state.data;

  if (state.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-border-soft p-3 text-danger">
        <span>{state.error}</span>
        <button type="button" onClick={onReload} className={ACTION_CLASS}>Yeniden dene</button>
      </div>
    );
  }
  if (!health) return <Skeleton className="h-24 w-full rounded-md" />;

  const shown = expanded ? health.findings : health.findings.slice(0, COLLAPSED_COUNT);
  const hidden = health.findings.length - shown.length;

  return (
    <section aria-label="Hesap sağlığı" className="flex flex-col gap-3 rounded-md border border-border-soft bg-card p-3">
      <header className="flex items-center gap-2">
        <h3 className="m-0 flex-1 text-ui-md font-bold text-fg">Hesap sağlığı</h3>
        <span className="text-ui-xs text-fg-muted">{health.checksTotal} kontrolden {health.checksTotal - health.checksFailed} tanesi tamam</span>
        <button
          type="button" aria-label="Yeniden denetle" title="Yeniden denetle" onClick={onReload}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md border border-border bg-transparent text-fg-muted hover:bg-bg-subtle"
        >
          <RefreshCw size={12} aria-hidden />
        </button>
      </header>

      {health.findings.length === 0 ? (
        <p className="m-0 flex items-center gap-2 text-ui-sm text-fg">
          <CheckCircle2 size={16} className="shrink-0 text-success" aria-hidden />
          Kurulum eksiksiz görünüyor: kanallar bağlı, ödeme ve devir ayarları tamam.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {shown.map((finding, index) => (
            <FindingRow key={`${finding.ruleId}-${index}`} finding={finding} onNavigate={onNavigate} />
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <button
          type="button" onClick={() => setExpanded(true)}
          className="cursor-pointer self-start border-0 bg-transparent p-0 text-ui-xs font-semibold text-fg-muted hover:text-fg"
        >
          {hidden} bulguyu daha göster
        </button>
      )}
    </section>
  );
}

function FindingRow({ finding, onNavigate }: { finding: HealthFindingDto; onNavigate: (tab: string) => void }) {
  const { label, Icon, tone } = SEVERITY_META[finding.severity];
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1.5 rounded-md bg-bg-subtle p-2.5">
      <Icon size={16} className={`mt-0.5 shrink-0 ${tone}`} aria-label={label} />
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
        <span className="text-ui-sm font-semibold text-fg">{finding.title}</span>
        <span className="text-ui-xs text-fg-muted">{finding.detail}</span>
      </div>
      <FixAction finding={finding} onNavigate={onNavigate} />
    </li>
  );
}

const ACTION_CLASS = 'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-border bg-card px-2.5 text-ui-xs font-semibold text-fg no-underline hover:bg-bg-subtle';

function FixAction({ finding, onNavigate }: { finding: HealthFindingDto; onNavigate: (tab: string) => void }) {
  if (finding.actionTab) {
    return (
      <button type="button" className={ACTION_CLASS} onClick={() => onNavigate(finding.actionTab!)}>
        Düzelt <ArrowRight size={12} aria-hidden />
      </button>
    );
  }
  if (finding.actionHref) {
    return <a href={finding.actionHref} className={ACTION_CLASS}>Aç <ArrowRight size={12} aria-hidden /></a>;
  }
  return null;
}
