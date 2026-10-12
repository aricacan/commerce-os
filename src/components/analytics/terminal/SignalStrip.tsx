'use client';

import { useMemo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { IndicatorValue } from '../../../types/forecast';

/** Kaç sinyal gösterilir. Şerit tek satırda kalmalı; fazlası "+N" olur. */
const MAX_VISIBLE = 6;

/** Kötü sinyaller önce, sonra uyarılar. Ölçülemeyenler şeritte YER ALMAZ. */
const SEVERITY_RANK: Record<string, number> = { bad: 0, warn: 1 };

interface Props {
  indicators: IndicatorValue[];
  onOpenIndicators: () => void;
}

/**
 * Dikkat şeridi — grafiğin hemen altında, HER ZAMAN görünür.
 *
 * NEDEN VAR: 20 gösterge dock'ta duruyor ama kullanıcı sekmeyi açmadıkça
 * hiçbirini görmüyordu. Terminalin işi "burada bir sorun var" demektir;
 * ayrıntı ikinci adımdır. Bu şerit yalnızca UYARI ve KÖTÜ olanları alır —
 * her şeyi göstermek hiçbir şey göstermemekle aynı sonucu verir.
 *
 * ⛔ Ölçülemeyen gösterge (value=null) BURAYA GİRMEZ: "bilinmiyor" bir uyarı
 * değildir, ayrı bir durumdur ve gösterge panelinde kendi süzgeci var.
 */
export function SignalStrip({ indicators, onOpenIndicators }: Props) {
  const signals = useMemo(
    () =>
      indicators
        .filter((i) => (i.status === 'bad' || i.status === 'warn') && i.value !== null)
        .sort((a, b) => (SEVERITY_RANK[a.status] ?? 9) - (SEVERITY_RANK[b.status] ?? 9)),
    [indicators],
  );

  if (indicators.length === 0) return null;

  if (signals.length === 0) {
    return (
      <div className="flex items-center gap-1.5 border-b border-border-soft px-3 py-1.5">
        <CheckCircle2 size={12} className="shrink-0 text-success" />
        <span className="text-[10.5px] text-fg-muted">
          {indicators.length} göstergenin hiçbiri uyarı vermiyor.
        </span>
      </div>
    );
  }

  const visible = signals.slice(0, MAX_VISIBLE);
  const hidden = signals.length - visible.length;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-border-soft px-3 py-1.5">
      <span className="text-[9.5px] font-bold uppercase tracking-wider text-fg-subtle shrink-0 pr-0.5">
        Dikkat
      </span>
      {visible.map((s) => (
        <button
          key={s.code}
          type="button"
          onClick={onOpenIndicators}
          title={s.text ?? s.label}
          className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[4px] border border-border-soft px-1.5 py-0.5 text-[10.5px] font-medium text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
        >
          {/* Renk TEK bir noktada: altı çipin hepsi kırmızı/amber zeminliyken
              şerit bir uyarı tablosu gibi görünüyor ve hiçbiri öne çıkmıyordu.
              Nokta ciddiyeti söyler, çip nötr kalır. */}
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.status === 'bad' ? 'bg-danger' : 'bg-warning'}`} />
          <span className="whitespace-nowrap">{s.label}</span>
          <span className="tabular-nums text-fg">{s.value!.toFixed(1)}</span>
        </button>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={onOpenIndicators}
          className="shrink-0 text-[10.5px] font-semibold text-fg hover:underline cursor-pointer"
        >
          +{hidden} daha
        </button>
      )}
    </div>
  );
}
