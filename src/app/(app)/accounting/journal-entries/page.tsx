'use client';

import { localDateStr } from '../../../../utils/date';
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import {
  Plus,
  BookOpen,
  X,
  Trash2,
  Send,
  Undo2,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import {
  journalEntryApi,
  journalEntryIntegrityApi,
  ledgerAccountApi,
  type CreateJournalEntryLineBody,
  type JournalEntry,
  type JournalEntryStatus,
} from '../../../../lib/api/ledger';
import { useBillingEntitySelector } from '../../../../features/accounting/useBillingEntitySelector';
import { AccountingSubTabBar } from '../../../../components/layout/AccountingSubTabBar';
import { FilterSelect } from '../../../../components/ui/FilterSelect';
import { toast } from '../../../../lib/toast';
import { describeError } from '../../../../lib/errors';
import { useI18n } from '../../../../lib/i18n';

const STATUS_CONFIG: Record<JournalEntryStatus, { tr: string; en: string; badge: string }> = {
  Draft: { tr: 'Taslak', en: 'Draft', badge: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400' },
  Posted: { tr: 'Kesinleşti', en: 'Posted', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' },
  Reversed: { tr: 'Ters Kayıt', en: 'Reversed', badge: 'border-rose-500/30 bg-rose-500/10 text-rose-400' },
};

function fmt(n: number) {
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function CreateEntryDialog({
  billingEntityId,
  onClose,
  onSaved,
}: {
  billingEntityId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { data: accounts } = useQuery({
    queryKey: ['ledger-accounts', billingEntityId],
    queryFn: () => ledgerAccountApi.list(billingEntityId),
  });
  const postable = (accounts ?? []).filter((a) => a.isPostable && a.isActive);

  const [entryDate, setEntryDate] = useState(() => localDateStr());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<CreateJournalEntryLineBody[]>([
    { ledgerAccountId: 0, debitAmount: 0, creditAmount: 0 },
    { ledgerAccountId: 0, debitAmount: 0, creditAmount: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalDebit = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
  const balanced = totalDebit === totalCredit && totalDebit > 0;

  function updateLine(idx: number, patch: Partial<CreateJournalEntryLineBody>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function handleSave() {
    setError(null);
    if (lines.some((l) => !l.ledgerAccountId)) {
      setError(tr ? 'Her satırda bir hesap seçilmelidir.' : 'An account must be selected for each line.');
      return;
    }
    if (!balanced) {
      setError(tr ? 'Borç toplamı ile Alacak toplamı eşit olmalıdır.' : 'Debit and credit totals must balance.');
      return;
    }

    setSaving(true);
    try {
      await journalEntryApi.create({
        billingEntityId,
        entryDate,
        description: description.trim() || undefined,
        lines,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(describeError(e));
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[30001] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-[4px] border border-[var(--border)] bg-[var(--card)] shadow-xl overflow-hidden text-xs text-[var(--fg)]"
      >
        {/* Modal Başlığı */}
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5 bg-[var(--bg-subtle)]/30">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--fg)]" />
            <h2 className="text-sm font-bold text-[var(--fg)]">
              {tr ? 'Yeni Muhasebe Fişi (Taslak)' : 'New Journal Entry (Draft)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-[var(--border-soft)] text-[var(--fg-muted)] hover:bg-[var(--card-hover)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal İçeriği */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Fiş Tarihi' : 'Entry Date'}
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
                {tr ? 'Açıklama' : 'Description'}
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={tr ? 'Örn: Aylık kira tahakkuku / Nakit satış' : 'Entry description...'}
                className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
              />
            </div>
          </div>

          {/* Fiş Kalemleri */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-soft)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                {tr ? 'Fiş Satırları' : 'Journal Lines'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setLines((prev) => [...prev, { ledgerAccountId: 0, debitAmount: 0, creditAmount: 0 }])
                }
                className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              >
                <Plus size={11} /> {tr ? 'Satır Ekle' : 'Add Line'}
              </button>
            </div>

            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <select
                      value={line.ledgerAccountId || ''}
                      onChange={(e) => updateLine(idx, { ledgerAccountId: Number(e.target.value) })}
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none cursor-pointer"
                    >
                      <option value="">— {tr ? 'Hesap Seçin' : 'Select Account'} —</option>
                      {postable.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder={tr ? 'Borç (₺)' : 'Debit'}
                      value={line.debitAmount || ''}
                      onChange={(e) =>
                        updateLine(idx, {
                          debitAmount: Number(e.target.value) || 0,
                          creditAmount: 0,
                        })
                      }
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-mono text-right text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                    />
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      placeholder={tr ? 'Alacak (₺)' : 'Credit'}
                      value={line.creditAmount || ''}
                      onChange={(e) =>
                        updateLine(idx, {
                          creditAmount: Number(e.target.value) || 0,
                          debitAmount: 0,
                        })
                      }
                      className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2 text-xs font-mono text-right text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                    disabled={lines.length <= 2}
                    className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-[var(--border-soft)] text-rose-400 hover:bg-rose-500/10 transition cursor-pointer disabled:opacity-30"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Denge Özeti */}
            <div className="flex items-center justify-between rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2.5 text-xs font-semibold">
              <div className="flex items-center gap-4">
                <span>
                  {tr ? 'Borç Toplamı:' : 'Total Debit:'}{' '}
                  <strong className="font-mono text-[var(--fg)]">{fmt(totalDebit)} ₺</strong>
                </span>
                <span>
                  {tr ? 'Alacak Toplamı:' : 'Total Credit:'}{' '}
                  <strong className="font-mono text-[var(--fg)]">{fmt(totalCredit)} ₺</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {balanced ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 size={13} /> {tr ? 'Dengede ✓' : 'Balanced'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                    <AlertTriangle size={13} /> {tr ? 'Dengede Değil' : 'Unbalanced'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400">
              {error}
            </div>
          )}
        </div>

        {/* Modal Alt Aksiyon Barı */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-soft)] px-5 py-3 bg-[var(--bg-subtle)]/20">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            {tr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !balanced}
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-4 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
          >
            {saving ? (tr ? 'Kaydediliyor...' : 'Saving...') : tr ? 'Taslak Olarak Kaydet' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ReverseDialog({
  onClose,
  onConfirm,
  pending,
}: {
  onClose: () => void;
  onConfirm: (date: string) => void;
  pending: boolean;
}) {
  const { lang } = useI18n();
  const tr = lang === 'tr';
  const [date, setDate] = useState(() => localDateStr());

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[30002] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[4px] border border-[var(--border)] bg-[var(--card)] p-4 shadow-xl text-xs text-[var(--fg)]"
      >
        <div className="text-sm font-bold text-[var(--fg)] mb-2">
          {tr ? 'Ters Kayıt (İptal Fişi)' : 'Reverse Journal Entry'}
        </div>
        <p className="text-xs text-[var(--fg-muted)] mb-3">
          {tr
            ? 'Kesinleşmiş fiş silinemez. Borç ve alacak satırları ters çevrilerek iptal fişi üretilir.'
            : 'Posted entries cannot be deleted. A reverse entry will cancel out the balances.'}
        </p>
        <label className="block text-[10.5px] font-bold uppercase text-[var(--fg-muted)] mb-1">
          {tr ? 'Ters Kayıt Tarihi' : 'Reversal Date'}
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none mb-4"
        />
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 items-center justify-center rounded-[4px] border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] transition cursor-pointer"
          >
            {tr ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(date)}
            disabled={pending}
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[4px] border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-400 shadow-xs hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <Undo2 size={13} />
            <span>{pending ? (tr ? 'İşleniyor...' : 'Processing...') : tr ? 'Ters Kaydı Oluştur' : 'Confirm Reversal'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EntryRow({ entry, onChanged }: { entry: JournalEntry; onChanged: () => void }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [expanded, setExpanded] = useState(false);
  const [reversing, setReversing] = useState(false);

  const post = useMutation({
    mutationFn: () => journalEntryApi.post(entry.id),
    onSuccess: () => {
      toast.success(tr ? 'Fiş kesinleşti.' : 'Journal entry posted.');
      onChanged();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const remove = useMutation({
    mutationFn: () => journalEntryApi.remove(entry.id),
    onSuccess: () => {
      toast.success(tr ? 'Taslak fiş silindi.' : 'Draft entry deleted.');
      onChanged();
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const reverse = useMutation({
    mutationFn: (reversalDate: string) => journalEntryApi.reverse(entry.id, reversalDate),
    onSuccess: () => {
      toast.success(tr ? 'Ters kayıt fişi üretildi.' : 'Reverse entry generated.');
      onChanged();
      setReversing(false);
    },
    onError: (e) => toast.error(describeError(e)),
  });

  const totalDebit = entry.lines.reduce((s, l) => s + l.debitAmount, 0);
  const st = STATUS_CONFIG[entry.status] || STATUS_CONFIG.Draft;

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="hover:bg-[var(--bg-subtle)]/40 transition cursor-pointer"
      >
        {/* Fiş No + Genişletme İkonu */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5 font-mono font-bold text-[var(--fg)]">
            {expanded ? (
              <ChevronDown size={13} className="text-[var(--fg-muted)] shrink-0" />
            ) : (
              <ChevronRight size={13} className="text-[var(--fg-muted)] shrink-0" />
            )}
            <span>{entry.entryNumber ?? <span className="text-[var(--fg-subtle)] italic">{tr ? 'Taslak' : 'Draft'}</span>}</span>
          </div>
        </td>

        {/* Tarih */}
        <td className="px-4 py-3 text-[var(--fg-muted)] font-mono">{entry.entryDate}</td>

        {/* Açıklama & Kaynak */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[var(--fg)]">{entry.description || '—'}</span>
            {entry.sourceType !== 'Manual' && (
              <span className="rounded-[2px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/60 px-1.5 py-0.2 text-[10px] font-bold text-[var(--fg-muted)]">
                {entry.sourceType}
              </span>
            )}
          </div>
        </td>

        {/* Tutar */}
        <td className="px-4 py-3 font-mono font-bold text-[var(--fg)]">
          {fmt(totalDebit)} ₺
        </td>

        {/* Durum */}
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10.5px] font-bold ${st.badge}`}>
            {tr ? st.tr : st.en}
          </span>
        </td>

        {/* İşlemler */}
        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex items-center gap-1.5 justify-end">
            {entry.status === 'Draft' && (
              <>
                <button
                  type="button"
                  onClick={() => post.mutate()}
                  disabled={post.isPending}
                  title={tr ? 'Fişi kesinleştir' : 'Post entry'}
                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-emerald-500/30 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Send size={11} />
                  <span>{tr ? 'Kesinleştir' : 'Post'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  title={tr ? 'Taslağı sil' : 'Delete draft'}
                  className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-rose-500/30 bg-rose-500/10 px-2 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={11} />
                  <span>{tr ? 'Sil' : 'Delete'}</span>
                </button>
              </>
            )}
            {entry.status === 'Posted' && (
              <button
                type="button"
                onClick={() => setReversing(true)}
                title={tr ? 'Ters kayıt üreterek iptal et' : 'Reverse entry'}
                className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[var(--border)] bg-[var(--card)] px-2 text-[11px] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-subtle)] transition cursor-pointer"
              >
                <Undo2 size={11} />
                <span>{tr ? 'Ters Kayıt' : 'Reverse'}</span>
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Genişletilmiş Satır Detayları */}
      {expanded && (
        <tr className="bg-[var(--bg-subtle)]/20">
          <td colSpan={6} className="px-6 py-3">
            <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-soft)] bg-[var(--bg-subtle)]/40 text-[10px] font-bold uppercase text-[var(--fg-muted)]">
                    <th className="px-3 py-1.5 text-left">{tr ? 'HESAP' : 'ACCOUNT'}</th>
                    <th className="px-3 py-1.5 text-right w-28">{tr ? 'BORÇ (₺)' : 'DEBIT'}</th>
                    <th className="px-3 py-1.5 text-right w-28">{tr ? 'ALACAK (₺)' : 'CREDIT'}</th>
                    <th className="px-3 py-1.5 text-left">{tr ? 'SATIR AÇIKLAMASI' : 'DESCRIPTION'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {entry.lines.map((l) => (
                    <tr key={l.id} className="hover:bg-[var(--bg-subtle)]/30">
                      <td className="px-3 py-2 font-mono font-medium text-[var(--fg)]">
                        {l.ledgerAccountCode} — {l.ledgerAccountName}
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-bold text-[var(--fg)]">
                        {l.debitAmount > 0 ? fmt(l.debitAmount) : ''}
                      </td>
                      <td className="px-3 py-2 font-mono text-right font-bold text-[var(--fg)]">
                        {l.creditAmount > 0 ? fmt(l.creditAmount) : ''}
                      </td>
                      <td className="px-3 py-2 text-[var(--fg-muted)]">{l.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}

      {reversing && (
        <ReverseDialog
          onClose={() => setReversing(false)}
          onConfirm={(date) => reverse.mutate(date)}
          pending={reverse.isPending}
        />
      )}
    </>
  );
}

// Yevmiye numarası boşluk/tekrar denetimi (FAZ 3.5) — kesinleşmiş fişlerin sıra numarasında
// (ör. elle SQL müdahalesinden kaynaklı) boşluk, tekrar veya beklenmeyen format var mı gösterir.
function NumberIntegrityPanel({ billingEntityId }: { billingEntityId: number | null }) {
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => new Date().getFullYear());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal-entry-number-integrity', billingEntityId, year],
    queryFn: () => journalEntryIntegrityApi.check(billingEntityId!, year),
    enabled: open && billingEntityId !== null,
    staleTime: 10_000,
  });

  const hasIssues =
    !!data &&
    (data.missingSequenceNumbers.length > 0 ||
      data.duplicateEntryNumbers.length > 0 ||
      data.unparsableEntryNumbers.length > 0);

  return (
    <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-bold text-[var(--fg)] hover:bg-[var(--bg-subtle)]/40 transition cursor-pointer"
      >
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-[var(--fg-muted)]" />
          {tr ? 'Numara Denetimi' : 'Number Audit'}
        </span>
        {open ? <ChevronDown size={13} className="text-[var(--fg-muted)]" /> : <ChevronRight size={13} className="text-[var(--fg-muted)]" />}
      </button>

      {open && (
        <div className="border-t border-[var(--border-soft)] p-3.5 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-[10.5px] font-bold uppercase text-[var(--fg-muted)]">
              {tr ? 'Yıl' : 'Year'}
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || new Date().getFullYear())}
              className="h-8 w-24 rounded-[4px] border border-[var(--border)] bg-[var(--bg)] px-2.5 text-xs font-mono text-[var(--fg)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          {billingEntityId === null ? (
            <p className="text-xs text-[var(--fg-muted)]">
              {tr ? 'Önce bir şirket seçin.' : 'Select a billing entity first.'}
            </p>
          ) : isLoading ? (
            <p className="text-xs text-[var(--fg-muted)]">{tr ? 'Denetleniyor...' : 'Checking...'}</p>
          ) : isError ? (
            <p className="text-xs text-rose-400">
              {tr ? 'Denetim raporu yüklenirken hata oluştu.' : 'Failed to load the integrity report.'}
            </p>
          ) : data ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2.5">
                <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2.5">
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'Kesinleşen Fiş' : 'Posted Entries'}
                  </div>
                  <div className="text-base font-bold text-[var(--fg)] mt-0.5">{data.totalPostedEntries}</div>
                </div>
                <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)]/30 p-2.5">
                  <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
                    {tr ? 'En Yüksek Sıra No' : 'Highest Sequence'}
                  </div>
                  <div className="text-base font-bold text-[var(--fg)] mt-0.5">{data.highestSequence ?? '—'}</div>
                </div>
              </div>

              {hasIssues ? (
                <div className="space-y-2">
                  {data.missingSequenceNumbers.length > 0 && (
                    <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                      <div className="font-bold mb-1">
                        {tr ? 'Eksik Sıra Numaraları' : 'Missing Sequence Numbers'} ({data.missingSequenceNumbers.length})
                      </div>
                      <div className="font-mono">{data.missingSequenceNumbers.join(', ')}</div>
                    </div>
                  )}
                  {data.duplicateEntryNumbers.length > 0 && (
                    <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                      <div className="font-bold mb-1">
                        {tr ? 'Tekrar Eden Fiş Numaraları' : 'Duplicate Entry Numbers'} ({data.duplicateEntryNumbers.length})
                      </div>
                      <div className="font-mono">{data.duplicateEntryNumbers.join(', ')}</div>
                    </div>
                  )}
                  {data.unparsableEntryNumbers.length > 0 && (
                    <div className="rounded-[4px] border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-400">
                      <div className="font-bold mb-1">
                        {tr ? 'Format Dışı Fiş Numaraları' : 'Unparsable Entry Numbers'} ({data.unparsableEntryNumbers.length})
                      </div>
                      <div className="font-mono">{data.unparsableEntryNumbers.join(', ')}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-[4px] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-400">
                  <CheckCircle2 size={13} />
                  <span>
                    {tr
                      ? `✓ ${data.totalPostedEntries} fiş, boşluk veya tekrar yok.`
                      : `✓ ${data.totalPostedEntries} entries, no gaps or duplicates.`}
                  </span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function JournalEntriesPage() {
  const qc = useQueryClient();
  const { lang } = useI18n();
  const tr = lang === 'tr';

  const { entities, billingEntityId, setBillingEntityId } = useBillingEntitySelector();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<JournalEntryStatus | 'All'>('All');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal-entries', billingEntityId],
    queryFn: () => journalEntryApi.list(billingEntityId!),
    enabled: billingEntityId !== null,
    staleTime: 10_000,
  });

  const entries = useMemo(() => data ?? [], [data]);
  const refresh = () => void qc.invalidateQueries({ queryKey: ['journal-entries', billingEntityId] });

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (statusFilter !== 'All' && e.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const lower = search.toLowerCase();
      return (
        (e.entryNumber && e.entryNumber.toLowerCase().includes(lower)) ||
        (e.description && e.description.toLowerCase().includes(lower)) ||
        e.lines.some(
          (l) =>
            l.ledgerAccountCode.toLowerCase().includes(lower) ||
            l.ledgerAccountName.toLowerCase().includes(lower)
        )
      );
    });
  }, [entries, search, statusFilter]);

  // KPI Hesaplamaları
  const stats = useMemo(() => {
    const total = entries.length;
    const posted = entries.filter((e) => e.status === 'Posted').length;
    const draft = entries.filter((e) => e.status === 'Draft').length;
    const totalAmount = entries
      .filter((e) => e.status === 'Posted')
      .reduce((s, e) => s + e.lines.reduce((ls, l) => ls + l.debitAmount, 0), 0);
    return { total, posted, draft, totalAmount };
  }, [entries]);

  const statusOptions = [
    { value: 'All', label: tr ? 'Tüm Durumlar' : 'All Statuses' },
    { value: 'Draft', label: tr ? 'Taslak' : 'Draft' },
    { value: 'Posted', label: tr ? 'Kesinleşti' : 'Posted' },
    { value: 'Reversed', label: tr ? 'Ters Kayıt' : 'Reversed' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      {/* Üst Sekme Barı */}
      <AccountingSubTabBar />

      {/* Ana İçerik Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {/* Başlık ve Aksiyon Barı */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div data-tour="journal-header">
            <h1 className="text-base font-bold text-[var(--fg)] tracking-tight">
              {tr ? 'Muhasebe Fişleri' : 'Journal Entries'}
            </h1>
            <p className="text-xs text-[var(--fg-muted)] mt-0.5">
              {tr
                ? 'Yevmiye defteri fişleri — taslak oluşturup Borç=Alacak dengesiyle kesinleştirin.'
                : 'General journal entries — create drafts and post with balanced debits and credits.'}
            </p>
          </div>

          <div data-tour="journal-actions" className="flex items-center gap-2 flex-wrap">
            {/* Şirket Seçici FilterSelect */}
            <FilterSelect
              value={billingEntityId ? String(billingEntityId) : ''}
              placeholder={tr ? 'Şirket Seçin' : 'Select Entity'}
              onChange={(v) => setBillingEntityId(v ? Number(v) : 0)}
              options={entities.map((be) => ({ value: String(be.id), label: be.legalName }))}
              minWidth={200}
            />

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              disabled={billingEntityId === null}
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--bg-subtle)] px-3 text-xs font-bold text-[var(--fg)] shadow-xs transition hover:border-[var(--fg-muted)] cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} />
              <span>{tr ? 'Fiş Oluştur' : 'Create Entry'}</span>
            </button>
          </div>
        </div>

        {/* KPI Metrik Kartları */}
        <div data-tour="journal-kpi" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Toplam Fiş' : 'Total Entries'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.total}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Kesinleşen Fişler' : 'Posted Entries'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.posted}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Taslak Fişler' : 'Draft Entries'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">{stats.draft}</div>
          </div>

          <div className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-3 shadow-xs">
            <div className="text-[10.5px] font-semibold text-[var(--fg-muted)] uppercase tracking-wide">
              {tr ? 'Kesinleşen Toplam Hacim' : 'Posted Volume'}
            </div>
            <div className="text-base font-bold text-[var(--fg)] mt-0.5">
              {fmt(stats.totalAmount)} ₺
            </div>
          </div>
        </div>

        {/* Filtre ve Arama Çubuğu */}
        <div data-tour="journal-filters" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] p-2.5 shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr ? 'Fiş no, açıklama veya hesap adı ara...' : 'Search entry, note or account...'}
              className="h-8 w-full rounded-[4px] border border-[var(--border)] bg-[var(--bg)] pl-8 pr-3 text-xs text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:border-[var(--fg-muted)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <FilterSelect
              value={statusFilter === 'All' ? '' : statusFilter}
              placeholder={tr ? 'Tüm Durumlar' : 'All Statuses'}
              onChange={(v) => setStatusFilter((v || 'All') as JournalEntryStatus | 'All')}
              minWidth={140}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Yevmiye Numarası Denetimi */}
        <div data-tour="journal-integrity">
          <NumberIntegrityPanel billingEntityId={billingEntityId} />
        </div>

        {/* Fiş Tablosu */}
        <div data-tour="journal-table" className="rounded-[4px] border border-[var(--border-soft)] bg-[var(--card)] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)]/30 text-[10.5px] font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                  <th className="px-4 py-2.5 w-32">{tr ? 'FİŞ NO' : 'ENTRY NO'}</th>
                  <th className="px-4 py-2.5 w-28">{tr ? 'TARİH' : 'DATE'}</th>
                  <th className="px-4 py-2.5">{tr ? 'AÇIKLAMA / KAYNAK' : 'DESCRIPTION'}</th>
                  <th className="px-4 py-2.5 w-32">{tr ? 'TUTAR (₺)' : 'AMOUNT'}</th>
                  <th className="px-4 py-2.5 w-28">{tr ? 'DURUM' : 'STATUS'}</th>
                  <th className="px-4 py-2.5 text-right w-44">{tr ? 'İŞLEMLER' : 'ACTIONS'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Fişler yükleniyor...' : 'Loading journal entries...'}
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-rose-400">
                      {tr ? 'Fişler yüklenirken hata oluştu.' : 'Failed to load journal entries.'}
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--fg-muted)]">
                      {tr ? 'Görüntülenecek fiş kaydı bulunamadı.' : 'No entries found.'}
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((e) => (
                    <EntryRow key={e.id} entry={e} onChanged={refresh} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fiş Oluşturma Modalı */}
      {createOpen && billingEntityId !== null && (
        <CreateEntryDialog
          billingEntityId={billingEntityId}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            toast.success(tr ? 'Taslak fiş oluşturuldu.' : 'Draft entry created.');
            refresh();
          }}
        />
      )}
    </div>
  );
}
