'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Info, Loader2, Repeat, Trash2 } from 'lucide-react';
import { financeApi } from '../../lib/api';
import { FINANCE_MONTHS } from '../../lib/constants/finance';
import { useI18n } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { FinanceExpenseTemplate } from '../../types/api';

// Tekrarlayan/ortak giderlerin YÖNETİM listesi. Ekleme burada YAPILMAZ — tek bir
// "Yeni Gider Ekle" butonu var (bkz. ExpenseFormModal). Bu panel yalnızca daha önce
// tanımlanmış tekrarlayan giderleri görüp düzenlemek/silmek için durur; aksi halde
// kullanıcı bir kez tanımladığı kirayı bir daha bulamazdı.
export function ExpenseTemplatesPanel({ onEdit }: { onEdit: (template: FinanceExpenseTemplate) => void }) {
  const { t, lang } = useI18n();
  const isTr = lang === 'tr';
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['finance-expense-templates'],
    queryFn: () => financeApi.expenseTemplates.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => financeApi.expenseTemplates.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-expense-templates'] });
      queryClient.invalidateQueries({ queryKey: ['finance-data'] });
      queryClient.invalidateQueries({ queryKey: ['finance-pnl'] });
      toast.success(isTr ? 'Tekrarlayan gider ve yazdığı aylar silindi.' : 'Recurring expense and its months deleted.');
    },
    onError: () => toast.error(isTr ? 'Silinemedi.' : 'Delete failed.'),
  });

  const monthLabel = (month: number) => FINANCE_MONTHS.find((m) => m.val === month)?.label ?? String(month);

  // Hiç tanımlı tekrarlayan gider yoksa panel gösterilmez — boş bir kutu, kullanıcıya
  // yapması gereken bir iş varmış izlenimi verirdi. Ekleme zaten üstteki tek butondan.
  if (!isLoading && templates.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col overflow-hidden rounded-[6px] border border-[var(--border-soft)] bg-[var(--card)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border-soft)] p-3">
        <Repeat size={13} className="text-[var(--fg-muted)]" />
        <span className="text-xs font-bold text-[var(--fg)]">
          {isTr ? 'Tekrarlayan Giderler' : 'Recurring Expenses'}
        </span>
        <span className="inline-flex items-center gap-1 text-[10.5px] text-[var(--fg-muted)]">
          <Info size={11} />
          {isTr
            ? 'Bir kez tanımlanır, seçilen ay aralığındaki her aya otomatik yazılır. Buradan düzenlersen tüm aylar güncellenir.'
            : 'Defined once, written into every month of the range. Editing here updates all months.'}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin text-[var(--fg)]" size={18} />
        </div>
      ) : (
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)] text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
            <tr>
              <th className="px-4 py-2.5">{t('expenses_col_name')}</th>
              <th className="px-4 py-2.5">{t('expenses_col_amount')}</th>
              <th className="px-4 py-2.5">{isTr ? 'Dönem' : 'Period'}</th>
              <th className="px-4 py-2.5">{isTr ? 'Dağılım' : 'Allocation'}</th>
              <th className="px-4 py-2.5 text-right">{t('expenses_col_actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-soft)]">
            {templates.map((template) => (
              <tr key={template.id} className="transition hover:bg-[var(--bg-subtle)]/40">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[var(--fg)]">{template.name}</span>
                    {template.category === 1 && (
                      <span className="rounded-[3px] bg-amber-500/10 px-1.5 py-px text-[9.5px] font-bold text-amber-600 dark:text-amber-400">
                        {template.adPlatform || (isTr ? 'Reklam' : 'Ads')}
                      </span>
                    )}
                    {template.recurrence === 1 && (
                      <span className="rounded-[3px] bg-[var(--bg-subtle)] px-1.5 py-px text-[9.5px] font-bold text-[var(--fg-muted)]">
                        {isTr ? 'Yıllık toplam' : 'Annual total'}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[10.5px] text-[var(--fg-muted)]">
                    {template.generatedExpenseCount} {isTr ? 'aya yazıldı' : 'months written'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono font-bold text-red-500/90">
                  (₺{template.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})
                  <span className="ml-1 text-[10px] font-normal text-[var(--fg-muted)]">
                    {template.recurrence === 1 ? (isTr ? '/ dönem' : '/ period') : isTr ? '/ ay' : '/ month'}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-[11px] text-[var(--fg-muted)]">
                  {monthLabel(template.startMonth)} {template.startYear} — {monthLabel(template.endMonth)}{' '}
                  {template.endYear}
                </td>
                <td className="px-4 py-3 text-[11px] text-[var(--fg-muted)]">
                  {template.allocations.map((a) => `${a.storeName} %${a.percentage}`).join(' · ')}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(template)}
                      className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
                      title={isTr ? 'Düzenle' : 'Edit'}
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(template.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-[3px] border border-[var(--border-soft)] bg-[var(--card)] text-[var(--fg-muted)] transition hover:text-red-500"
                      title={isTr ? 'Sil (yazdığı tüm aylar silinir)' : 'Delete (removes all written months)'}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
