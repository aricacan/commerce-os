import { MonitoringStat } from './MonitoringParts';
import type { DeltaTone, KpiCard } from './monitoringRules';

const DELTA_CLASS: Record<DeltaTone, string> = {
  good: 'text-success',
  bad: 'text-danger',
  flat: 'text-fg-muted',
};

// Ana göstergeler + önceki eşit dönemle kıyas. Kıyas verisi yoksa (önceki dönemde bot turu yok) satır çizilmez.
export function MonitoringKpiGrid({ cards }: { cards: readonly KpiCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.key} className="flex min-w-0 flex-col">
          <MonitoringStat label={card.label} value={card.value} hint={card.hint} danger={!card.ok} />
          {card.delta && <p className={`m-0 px-1 pt-1 text-ui-2xs ${DELTA_CLASS[card.delta.tone]}`}>{card.delta.text}</p>}
        </div>
      ))}
    </div>
  );
}
