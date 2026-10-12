'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, Info, TriangleAlert, CircleAlert, RefreshCw, Send, BotMessageSquare } from 'lucide-react';
import { forecastApi } from '../../lib/api/forecast';
import type { AgentEvidence, AgentReport } from '../../types/forecast';

type AgentKey = 'demand' | 'anomaly' | 'price' | 'copilot';

const AGENTS: { key: AgentKey; label: string; hint: string }[] = [
  { key: 'demand', label: 'Talep Analisti', hint: 'Bu hafta ne oldu, neden oldu?' },
  { key: 'anomaly', label: 'Anomali Dedektifi', hint: 'Bu sapmanın kök nedeni ne?' },
  { key: 'price', label: 'Fiyat Stratejisti', hint: 'Fiyat/marj tarafında ne oluyor?' },
  { key: 'copilot', label: 'Co-Pilot (Serbest Soru)', hint: 'Terminaldeki canlı veriye doğrudan soru sor' },
];

const COPILOT_PRESETS = [
  'En kritik stoksuzluk riskleri neler?',
  'Bu haftaki ciro ve talep hareketlerinin özeti',
  'Kanal ve pazaryeri bazlı düşüşler var mı?',
  'Hangi ürünlerde marj sıkışması yaşanıyor?',
];

const SEVERITY_ICON = { info: Info, warn: TriangleAlert, bad: CircleAlert } as const;

const SEVERITY_CLASS = {
  info: 'text-fg-subtle',
  warn: 'text-warning',
  bad: 'text-danger',
} as const;

/**
 * I1 + I4 + I3 + I5 — yapay zekâ analistleri ve Terminal Co-Pilot.
 *
 * ⛔ AGENT SAYI ÜRETMEZ. Kanıtlar (göstergeler, olaylar, stok, kanal kırılımı)
 * deterministik olarak sunucuda toplanır; yapay zekâ yalnızca onları anlatır.
 * LLM erişilemezse kanıt listesi yine gösterilir ve durum açıkça yazılır.
 */
export function AgentContent() {
  const [agent, setAgent] = useState<AgentKey>('demand');
  const [question, setQuestion] = useState('');
  const [copilotResult, setCopilotResult] = useState<AgentReport | null>(null);

  const copilotMutation = useMutation({
    mutationFn: (q: string) => forecastApi.agent.ask(q),
    onSuccess: (res) => setCopilotResult(res),
  });

  const { data: standardData, isLoading: standardLoading, isError: standardError, isFetching, refetch } = useQuery({
    queryKey: ['forecast-agent', agent],
    queryFn: () =>
      agent === 'demand'
        ? forecastApi.agent.demandAnalysis()
        : agent === 'anomaly'
          ? forecastApi.agent.anomaly()
          : forecastApi.agent.priceStrategy(),
    enabled: agent !== 'copilot',
    staleTime: 10 * 60_000,
  });

  const isCopilot = agent === 'copilot';
  const data = isCopilot ? copilotResult : standardData;
  const isLoading = isCopilot ? copilotMutation.isPending : standardLoading;
  const isError = isCopilot ? copilotMutation.isError : standardError;

  function handleAsk(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    copilotMutation.mutate(q);
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border-soft shrink-0">
        {AGENTS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAgent(a.key)}
            title={a.hint}
            className={`px-2.5 py-1 text-ui-xs font-semibold rounded-[5px] transition-colors cursor-pointer ${
              agent === a.key
                ? 'bg-fg text-bg'
                : 'text-fg-muted hover:bg-bg-subtle'
            }`}
          >
            {a.label}
          </button>
        ))}

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          title="Yeniden çalıştır"
          className="ml-auto flex items-center gap-1 px-2 py-1 text-ui-xs font-semibold rounded-[5px] border border-border-soft text-fg-muted hover:bg-bg-subtle disabled:opacity-40 cursor-pointer"
        >
          <RefreshCw size={11} className={isFetching ? 'animate-spin' : ''} />
          Yenile
        </button>
      </div>

      <div>
        {isCopilot && (
          <div className="p-3 border-b border-border-soft bg-bg-subtle/40 flex flex-col gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(question);
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Co-Pilot'a terminal verisiyle ilgili bir soru sorun..."
                  className="w-full h-8 pl-8 pr-3 text-ui-xs rounded-[5px] border border-border-soft bg-card text-fg placeholder:text-fg-subtle outline-none focus:border-fg"
                />
                <BotMessageSquare size={14} className="absolute left-2.5 top-2 text-fg-subtle" />
              </div>
              <button
                type="submit"
                disabled={!question.trim() || isLoading}
                className="flex items-center gap-1 h-8 px-3 text-ui-xs font-bold rounded-[5px] bg-fg text-bg hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
              >
                <Send size={11} />
                <span>{isLoading ? 'Analiz...' : 'Sor'}</span>
              </button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-ui-2xs text-fg-subtle font-semibold">Örnek Sorular:</span>
              {COPILOT_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleAsk(p)}
                  disabled={isLoading}
                  className="px-2 py-0.5 text-ui-2xs rounded-[4px] border border-border-soft bg-card hover:bg-bg-subtle text-fg-muted transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && <p className="px-3 py-6 m-0 text-ui-xs text-fg-subtle text-center">Kanıtlar toplanıyor ve analiz ediliyor…</p>}
        {isError && <p className="px-3 py-6 m-0 text-ui-xs text-danger">Rapor üretilemedi.</p>}
        {isCopilot && !data && !isLoading && (
          <p className="px-3 py-6 m-0 text-ui-xs text-fg-subtle text-center">
            Yukarıdaki kutudan dilediğiniz soruyu sorabilir veya hazır önerilerden birini seçebilirsiniz.
          </p>
        )}

        {data && (
          <>
            {data.narrative && (
              <div className="px-3 py-3 border-b border-border-soft bg-bg-subtle">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles size={11} className="text-fg" />
                  <span className="text-ui-2xs font-bold uppercase tracking-wider text-fg">
                    Yapay zekâ yorumu — sayılar aşağıdaki kanıtlardan, yapay zekâdan DEĞİL
                  </span>
                </div>
                <p className="m-0 text-ui-xs leading-relaxed text-fg whitespace-pre-wrap">
                  {data.narrative}
                </p>
              </div>
            )}

            {data.notice && (
              <div className="flex items-start gap-2 px-3 py-2 border-b border-border-soft text-ui-xs text-warning bg-warning-soft">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>{data.notice}</span>
              </div>
            )}

            <div className="px-3 py-2.5">
              <div className="text-ui-2xs font-bold uppercase tracking-wider text-fg-subtle mb-2">
                {data.title} · {data.evidence.length} kanıt
              </div>
              {data.evidence.length === 0 ? (
                <p className="m-0 py-4 text-ui-xs text-fg-subtle text-center">
                  Kanıt bulunamadı — bu dönem için yeterli veri yok.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 m-0 p-0 list-none">
                  {data.evidence.map((e, i) => (
                    <EvidenceRow key={i} evidence={e} />
                  ))}
                </ul>
              )}
            </div>

            <div className="px-3 py-2 text-ui-2xs text-fg-subtle border-t border-border-soft">
              Kanıtlar sunucuda deterministik hesaplanır. Yapay zekâ yalnızca bunları
              yorumlar — yeni sayı üretmez. Yapay zekâya ulaşılamazsa kanıtlar yine geçerlidir.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: AgentEvidence }) {
  const Icon = SEVERITY_ICON[evidence.severity] ?? Info;
  return (
    <li className="flex items-start gap-2 py-1 border-b border-border-soft last:border-0">
      <Icon size={12} className={`mt-0.5 shrink-0 ${SEVERITY_CLASS[evidence.severity] ?? SEVERITY_CLASS.info}`} />
      <span className="text-ui-2xs font-semibold uppercase tracking-wider text-fg-subtle shrink-0 w-[62px] pt-0.5">
        {evidence.kind}
      </span>
      <span className="text-ui-xs leading-relaxed text-fg">{evidence.text}</span>
    </li>
  );
}
