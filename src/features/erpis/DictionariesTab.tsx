'use client';

import { useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import {
  useCreateErpisDictionaryEntry,
  useDeleteErpisDictionaryEntry,
  useErpisDictionaries,
  useErpisDictionaryCandidates,
  useUpdateErpisDictionaryEntry,
} from '@/hooks/erpis/useErpisCatalog';
import {
  ERPIS_CANDIDATE_KINDS,
  ERPIS_DICTIONARY_KINDS,
  ERPIS_DICTIONARY_KIND_LABELS,
  type ErpisDictionaryCandidate,
  type ErpisDictionaryEntry,
  type ErpisDictionaryKind,
} from '@/lib/api';
import { useAuthStore } from '../../stores/auth';
import { ErpisTable, type Column } from './ErpisTable';
import { ReparseButton, WRITE_ROLES } from './ReparseButton';
import { EmptyState, ErrorState, SectionCard, formatNumber } from './shared';
import { icon, palette } from '../shared/design';

// Ayrıştırma sözlükleri — "başka bir Excel gelse de çalışır" garantisinin kaynağı.
//
// Ayrıştırıcı kalıpları koda gömmek yerine buradan okuyor: yeni bir marka ya da ürün tipi
// çıktığında kod değişikliği ve dağıtım gerekmiyor.
export function DictionariesTab() {
  const [kind, setKind] = useState<ErpisDictionaryKind>('Brand');
  const [editing, setEditing] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const roles = useAuthStore((state) => state.user?.roles);
  const canWrite = roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  const entries = useErpisDictionaries(kind);
  const create = useCreateErpisDictionaryEntry();
  const update = useUpdateErpisDictionaryEntry();
  const remove = useDeleteErpisDictionaryEntry();

  const supportsCandidates = ERPIS_CANDIDATE_KINDS.includes(kind);
  const candidates = useErpisDictionaryCandidates(kind, supportsCandidates);

  const known = new Set((entries.data ?? []).map((e) => e.value.toLocaleUpperCase('tr-TR')));

  const columns: Column<ErpisDictionaryEntry>[] = [
    { key: 'value', label: 'Değer', width: 200,
      render: (e) => (
        editing === e.id
          ? <EntryEditor entry={e} saving={update.isPending}
              onCancel={() => setEditing(null)}
              onSave={async (value, aliases, isActive) => {
                await update.mutateAsync({ id: e.id, value, aliases, isActive });
                setEditing(null);
              }} />
          : (
            <button
              type="button"
              disabled={!canWrite}
              onClick={() => setEditing(e.id)}
              className="w-full text-left font-semibold disabled:cursor-default"
              style={{ opacity: e.isActive ? 1 : 0.5 }}
            >
              {e.value}
              {!e.isActive && <span className="ml-1.5 text-[10px]">(pasif)</span>}
            </button>
          )
      ) },
    { key: 'aliases', label: 'Diğer Yazımlar',
      render: (e) => (
        e.aliases.length === 0
          ? <span className="text-[var(--fg-muted)]">—</span>
          : <span className="text-[11px] text-[var(--fg-muted)]">{e.aliases.join(', ')}</span>
      ) },
    { key: 'usage', label: 'Kullanım', align: 'right', width: 90,
      render: (e) => (
        <span className="tabular-nums" style={{ color: e.usageCount === 0 ? palette.textMuted : palette.text }}>
          {formatNumber(e.usageCount)}
        </span>
      ) },
    { key: 'source', label: 'Kaynak', width: 80,
      render: (e) => (
        <span className="text-[10.5px] text-[var(--fg-muted)]">{e.isSeed ? 'Hazır' : 'Eklenen'}</span>
      ) },
    { key: 'actions', label: '', width: 40,
      render: (e) => (
        canWrite ? (
          <button
            type="button"
            onClick={() => remove.mutate(e.id)}
            aria-label={`«${e.value}» kaydını sil`}
            className="rounded-[4px] p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
          >
            <Trash2 size={icon.md} strokeWidth={icon.stroke} />
          </button>
        ) : null
      ) },
  ];

  if (entries.isError) return <ErrorState />;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div data-tour="erpis-dictionaries-kinds" className="flex flex-wrap items-center gap-1.5">
        {ERPIS_DICTIONARY_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setKind(k); setEditing(null); setAdding(false); }}
            aria-pressed={kind === k}
            className="rounded-[4px] border border-[var(--border-soft)] px-2.5 py-1 text-[12px] font-bold"
            style={kind === k
              ? { background: palette.chipBg, color: palette.text }
              : { color: palette.textMuted }}
          >
            {ERPIS_DICTIONARY_KIND_LABELS[k]}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <ReparseButton />
          {canWrite && (
            <button
              type="button"
              onClick={() => setAdding((v) => !v)}
              className="flex h-8 items-center gap-1.5 rounded-[4px] bg-[var(--fg)] px-2.5 text-[12px] font-bold text-[var(--bg)]"
            >
              <Plus size={icon.md} strokeWidth={icon.stroke} />
              Değer ekle
            </button>
          )}
        </div>
      </div>

      {adding && (
        <NewEntryForm
          kindLabel={ERPIS_DICTIONARY_KIND_LABELS[kind]}
          saving={create.isPending}
          onCancel={() => setAdding(false)}
          onSave={async (value, aliases) => {
            await create.mutateAsync({ kind, value, aliases });
            setAdding(false);
          }}
        />
      )}

      {supportsCandidates && (candidates.data?.length ?? 0) > 0 && (
        <div data-tour="erpis-dictionaries-candidates">
          <SectionCard title={`Aday Değerler (${candidates.data!.length})`}>
            <p className="text-[11.5px] text-[var(--fg-muted)]">
              Sözlükte yok ama ürün adlarının çözülemeyen kısmında sık geçiyor. Ekledikten
              sonra «Yeniden ayrıştır» ile kartlara uygulanır.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {candidates.data!
                .filter((c) => !known.has(c.value))
                .map((c) => (
                  <CandidateChip
                    key={c.value}
                    candidate={c}
                    canWrite={canWrite}
                    onAdd={() => create.mutate({ kind, value: c.value })}
                  />
                ))}
            </div>
          </SectionCard>
        </div>
      )}

      {entries.data && entries.data.length === 0 ? (
        <EmptyState
          title="Bu sözlük boş"
          hint="Aday değerlerden ekleyebilir ya da elle değer girebilirsiniz."
        />
      ) : (
        <div data-tour="erpis-dictionaries-table">
          <ErpisTable
            columns={columns}
            rows={entries.data ?? []}
            rowKey={(e) => e.id}
            sortBy={null}
            desc={false}
            onSort={() => {}}
            loading={entries.isFetching}
          />
        </div>
      )}
    </div>
  );
}

// Aday, kaç kartta geçtiğiyle ve bir örnek ürünle gösterilir: kullanıcı eklemeden önce
// değerin gerçekten bir marka/ürün tipi mi yoksa rastgele bir kelime mi olduğunu görmeli.
function CandidateChip({ candidate, canWrite, onAdd }: {
  candidate: ErpisDictionaryCandidate;
  canWrite: boolean;
  onAdd: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!canWrite}
      onClick={onAdd}
      title={candidate.samples[0] ?? undefined}
      className="flex items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] px-2 py-1 text-[11.5px] font-semibold text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:cursor-default disabled:opacity-60"
    >
      {canWrite && <Plus size={icon.sm} strokeWidth={icon.stroke} />}
      {candidate.value}
      <span className="text-[10px] text-[var(--fg-muted)]">{formatNumber(candidate.occurrences)}</span>
    </button>
  );
}

function NewEntryForm({ kindLabel, saving, onCancel, onSave }: {
  kindLabel: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (value: string, aliases: string[]) => void;
}) {
  const [value, setValue] = useState('');
  const [aliases, setAliases] = useState('');

  return (
    <form
      className="flex flex-wrap items-end gap-2 rounded-[4px] border border-[var(--border-soft)] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave(value.trim(), parseAliases(aliases));
      }}
    >
      <Field label={kindLabel} value={value} onChange={setValue} autoFocus width={200} />
      <Field
        label="Diğer yazımlar (virgülle)"
        value={aliases}
        onChange={setAliases}
        width={260}
      />
      <button
        type="submit"
        disabled={saving || !value.trim()}
        className="h-8 rounded-[4px] bg-[var(--fg)] px-3 text-[12px] font-bold text-[var(--bg)] disabled:opacity-50"
      >
        Ekle
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="h-8 rounded-[4px] border border-[var(--border-soft)] px-3 text-[12px] font-bold text-[var(--fg)]"
      >
        Vazgeç
      </button>
    </form>
  );
}

function EntryEditor({ entry, saving, onCancel, onSave }: {
  entry: ErpisDictionaryEntry;
  saving: boolean;
  onCancel: () => void;
  onSave: (value: string, aliases: string[], isActive: boolean) => void;
}) {
  const [value, setValue] = useState(entry.value);
  const [aliases, setAliases] = useState(entry.aliases.join(', '));
  const [isActive, setIsActive] = useState(entry.isActive);

  return (
    <div
      className="flex items-center gap-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter') onSave(value, parseAliases(aliases), isActive);
      }}
    >
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Sözlük değeri"
        className="h-7 w-24 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-1.5 text-[12px] text-[var(--fg)] outline-none"
      />
      <input
        value={aliases}
        onChange={(e) => setAliases(e.target.value)}
        placeholder="alias"
        aria-label="Diğer yazımlar"
        className="h-7 w-24 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 text-[12px] text-[var(--fg)] outline-none"
      />
      <label className="flex items-center gap-1 text-[10.5px] text-[var(--fg-muted)]">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="h-3 w-3 accent-[var(--fg)]"
        />
        aktif
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(value, parseAliases(aliases), isActive)}
        aria-label="Kaydet"
        className="rounded-[4px] p-1 text-[var(--fg)] hover:bg-[var(--bg-subtle)] disabled:opacity-40"
      >
        <Check size={icon.md} strokeWidth={icon.stroke} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Vazgeç"
        className="rounded-[4px] p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
      >
        <X size={icon.md} strokeWidth={icon.stroke} />
      </button>
    </div>
  );
}

function Field({ label, value, onChange, width, autoFocus }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  width: number;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.02em] text-[var(--fg-muted)]">
        {label}
      </span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width }}
        className="h-8 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2 text-[12px] text-[var(--fg)] outline-none focus:border-[var(--border)]"
      />
    </label>
  );
}

function parseAliases(text: string): string[] {
  return text.split(',').map((a) => a.trim()).filter(Boolean);
}
