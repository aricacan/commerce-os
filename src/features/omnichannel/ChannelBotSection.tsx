import type { ReactNode } from 'react';
import { ScopeBadge } from './ScopeBadge';

interface Props {
  title: string;
  description: string;
  /** true = bölüm bu kanala özel değer taşıyor. */
  custom: boolean;
  /** Özel durumundaki rozet metni; varsayılan “Bu kanala özel”. */
  customLabel?: string;
  /** Başlık satırının sağındaki düğmeler. */
  actions?: ReactNode;
  children: ReactNode;
}

// Kanal Merkezi › Bot altındaki üç bölümün (Eşikler / Menü / Metinler) ortak kabuğu: başlık, kapsam rozeti, düğmeler.
export function ChannelBotSection({ title, description, custom, customLabel = 'Bu kanala özel', actions, children }: Props) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--card)] p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-xs font-bold text-[var(--fg)]">{title}</h3>
            <ScopeBadge label={custom ? customLabel : 'Hesap geneli'} tone={custom ? 'bot' : 'neutral'} />
          </div>
          <p className="m-0 mt-0.5 break-words text-[11px] text-[var(--fg-muted)]">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
