'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import {
  aiSettingsApi, toCategoryAiProvider, type CategoryAiProvider,
} from '../../lib/api/intelligent';
import { queryKeys } from '../../lib/query-keys';
import { toast } from '../../lib/toast';
import { useI18n } from '../../lib/i18n';
import { Select, type SelectOption } from '../../components/ui/Select';
import { AiUsageByPanel } from './AiUsageByPanel';

// Tek LLM sağlayıcısı sunucuda sabittir (DeepSeek); model ve yedek model sunucu yapılandırmasındadır
// (DeepSeekApi:Model / PanelModels / FallbackModel), bu ekrandan değiştirilmez.
const LLM_PROVIDER_LABEL = 'DeepSeek';

export function AiWorkspace() {
  const { lang } = useI18n();
  const queryClient = useQueryClient();

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: usageSummary, refetch: refetchUsage } = useQuery({
    queryKey: queryKeys.system.aiUsageSummary,
    queryFn: () => aiSettingsApi.usageSummary(),
    staleTime: 0,
  });

  const { data: categoryAiProvider, refetch: refetchCategoryProvider } = useQuery({
    queryKey: queryKeys.system.categoryAiProvider,
    queryFn: () => aiSettingsApi.getCategoryAiProvider(),
    staleTime: 0,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const categoryAiMutation = useMutation({
    mutationFn: (provider: CategoryAiProvider) => aiSettingsApi.setCategoryAiProvider(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.system.categoryAiProvider });
      toast.success(lang === 'tr' ? 'Sağlayıcı güncellendi.' : 'Provider updated.');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Güncellenemedi.');
    },
  });

  const handleRefreshAll = () => {
    refetchUsage();
    refetchCategoryProvider();
  };

  const categoryProviderOptions: SelectOption<CategoryAiProvider>[] = [
    { value: 'DeepSeek', label: 'DeepSeek (Cloud)' },
    { value: 'Ollama', label: 'Fartai (Local)' },
  ];

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-y-auto p-4 space-y-3.5 bg-transparent">
      {/* ── Üst Kontrol Barı (Statik Değil, Doğal Akışta) ───────────────────── */}
      <div data-tour="ai-global-models" className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] px-3.5 py-2.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sol: Tarih Dropdown Stili Select Seçiciler */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {lang === 'tr' ? 'Sağlayıcı:' : 'Provider:'}
              </span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{LLM_PROVIDER_LABEL}</span>
            </div>

            <div className="flex items-center gap-2 border-l border-zinc-200 dark:border-zinc-800 pl-3">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                {lang === 'tr' ? 'Kategori Motoru:' : 'Category:'}
              </span>
              <Select
                size="sm"
                value={toCategoryAiProvider(categoryAiProvider?.provider)}
                options={categoryProviderOptions}
                onChange={(val) => categoryAiMutation.mutate(val)}
              />
            </div>
          </div>

          {/* Sağ: Sayaç & Yenile */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>
                {lang === 'tr' ? 'Bugün:' : 'Today:'}{' '}
                <strong className="text-zinc-800 dark:text-zinc-200">
                  {usageSummary?.todayTokens ? usageSummary.todayTokens.toLocaleString() : '0'}
                </strong>{' '}
                token
              </span>
            </div>

            <button
              onClick={handleRefreshAll}
              className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              title={lang === 'tr' ? 'Yenile' : 'Refresh'}
            >
              <RotateCcw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Model Bazlı Token Dağılımı ──────────────────────────────────────── */}
      <div className="rounded-[4px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18191e] shadow-xs overflow-hidden">
        <div className="px-3.5 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
            {lang === 'tr' ? 'Model Token Telemetrisi' : 'Model Token Telemetry'}
          </span>
          <span className="text-[11px] text-zinc-400 font-medium">
            {lang === 'tr'
              ? `Bu Ay: ${usageSummary?.monthTokens ? usageSummary.monthTokens.toLocaleString() : '0'} token`
              : `This Month: ${usageSummary?.monthTokens ? usageSummary.monthTokens.toLocaleString() : '0'} tokens`}
          </span>
        </div>

        {usageSummary?.byModel && usageSummary.byModel.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[10.5px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  <th className="px-3.5 py-2 min-w-[200px]">{lang === 'tr' ? 'Model' : 'Model'}</th>
                  <th className="px-3.5 py-2 min-w-[120px]">{lang === 'tr' ? 'Sağlayıcı' : 'Provider'}</th>
                  <th className="px-3.5 py-2 min-w-[120px]">{lang === 'tr' ? 'Toplam Token' : 'Total Tokens'}</th>
                  <th className="px-3.5 py-2 text-right min-w-[90px]">{lang === 'tr' ? 'Çağrı Sayısı' : 'Calls'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/80 dark:divide-zinc-800">
                {usageSummary.byModel.map((item) => (
                  <tr
                    key={item.model}
                    className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
                  >
                    <td className="px-3.5 py-2 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {item.model}
                    </td>
                    <td className="px-3.5 py-2 text-zinc-500">{item.provider}</td>
                    <td className="px-3.5 py-2 font-semibold text-zinc-800 dark:text-zinc-200">
                      {item.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-3.5 py-2 text-right text-zinc-600 dark:text-zinc-400">
                      {item.callCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-zinc-400">
            {lang === 'tr' ? 'Kullanım verisi kaydedilmedi.' : 'No usage data.'}
          </div>
        )}
      </div>

      <AiUsageByPanel rows={usageSummary?.byPanel} lang={lang} />
    </div>
  );
}
