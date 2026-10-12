'use client';

// P06: bu ay hangi iş (panel) hangi sağlayıcı/modelde çalıştı. Yedek modele (DeepSeekApi:FallbackModel)
// düşen çağrılar aynı panelde yedek model satırı olarak görünür.
export interface PanelUsageRow {
  panelType: string;
  provider: string;
  model: string;
  totalTokens: number;
  callCount: number;
}

interface AiUsageByPanelProps {
  rows: PanelUsageRow[] | undefined;
  lang: string;
}

export function AiUsageByPanel({ rows, lang }: AiUsageByPanelProps) {
  const tr = lang === 'tr';
  if (!rows?.length) return null;

  return (
    <div className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-xs overflow-hidden">
      <div className="px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
          {tr ? 'Panel Bazında Kullanım (Bu Ay)' : 'Usage by Panel (This Month)'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[10.5px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              <th className="px-3.5 py-2 min-w-[180px]">{tr ? 'Panel' : 'Panel'}</th>
              <th className="px-3.5 py-2 min-w-[100px]">{tr ? 'Sağlayıcı' : 'Provider'}</th>
              <th className="px-3.5 py-2 min-w-[160px]">{tr ? 'Model' : 'Model'}</th>
              <th className="px-3.5 py-2 min-w-[110px]">{tr ? 'Toplam Token' : 'Total Tokens'}</th>
              <th className="px-3.5 py-2 text-right min-w-[80px]">{tr ? 'Çağrı' : 'Calls'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
            {rows.map((row) => (
              <tr
                key={`${row.panelType}|${row.provider}|${row.model}`}
                className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
              >
                <td className="px-3.5 py-2 font-medium text-zinc-800 dark:text-zinc-200">{row.panelType}</td>
                <td className="px-3.5 py-2 text-zinc-500">{row.provider}</td>
                <td className="px-3.5 py-2 font-mono text-zinc-600 dark:text-zinc-400">{row.model}</td>
                <td className="px-3.5 py-2 font-semibold text-zinc-800 dark:text-zinc-200">
                  {row.totalTokens.toLocaleString()}
                </td>
                <td className="px-3.5 py-2 text-right text-zinc-600 dark:text-zinc-400">
                  {row.callCount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
