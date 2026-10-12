'use client';

import { useState } from 'react';
import { Check, Search, Wand2, X } from 'lucide-react';
import { useErpisSegments, useUpdateErpisSegment } from '@/hooks/erpis/useErpisCatalog';
import type { ErpisSkuSegment } from '@/lib/api';
import { useAuthStore } from '../../stores/auth';
import { ErpisTable, TablePager, type Column } from './ErpisTable';
import { EmptyState, ErrorState, formatNumber } from './shared';
import { WRITE_ROLES } from './ReparseButton';
import { icon, palette } from '../shared/design';

const PAGE_SIZE = 50;
const POSITIONS = [1, 2, 3] as const;

// SKU Sözlüğü — 8-6-8 kodunun üç parçasının anlamı.
//
// Segmentler kodlanmış anlam taşıyor ama anlamı YALNIZ kullanıcı biliyor. Sistem kodu
// sayar ve altındaki ürünlerden bir etiket önerir; kullanıcı tek tıkla kabul eder ya da
// kendi yazar. Etiket panodaki kırılımlarda kodun yerine geçer.
export function SegmentsTab() {
  const [position, setPosition] = useState<number>(1);
  const [onlyUnlabeled, setOnlyUnlabeled] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<number | null>(null);

  const roles = useAuthStore((state) => state.user?.roles);
  const canWrite = roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  const segments = useErpisSegments({
    position, onlyUnlabeled, search: search || null, page, pageSize: PAGE_SIZE,
  });
  const update = useUpdateErpisSegment();

  function change(next: () => void) {
    setPage(1);
    next();
  }

  const columns: Column<ErpisSkuSegment>[] = [
    { key: 'code', label: 'Kod', width: 110,
      render: (s) => <span className="font-bold tabular-nums">{s.code}</span> },
    { key: 'itemCount', label: 'Kart', align: 'right', width: 70,
      render: (s) => <span className="tabular-nums">{formatNumber(s.itemCount)}</span> },
    { key: 'suggested', label: 'Önerilen Etiket', width: 200,
      render: (s) => <Suggestion segment={s} canWrite={canWrite} onApply={applyLabel} /> },
    { key: 'label', label: 'Etiket', width: 230,
      render: (s) => (
        editing === s.id
          ? <LabelEditor segment={s} saving={update.isPending}
              onCancel={() => setEditing(null)}
              onSave={(label, kind) => save(s.id, label, kind)} />
          : <LabelCell segment={s} canWrite={canWrite} onEdit={() => setEditing(s.id)} />
      ) },
    { key: 'samples', label: 'Örnek Ürünler',
      render: (s) => (
        <div className="flex flex-col text-[10.5px] text-[var(--fg-muted)]">
          {s.samples.length === 0 ? '—' : s.samples.map((sample) => (
            <span key={sample} className="line-clamp-1">{sample}</span>
          ))}
        </div>
      ) },
  ];

  async function save(id: number, label: string | null, kind: string | null) {
    await update.mutateAsync({ id, label, kind });
    setEditing(null);
  }

  async function applyLabel(segment: ErpisSkuSegment) {
    await update.mutateAsync({ id: segment.id, label: segment.suggestedLabel, kind: segment.kind });
  }

  if (segments.isError) return <ErrorState />;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div data-tour="erpis-segments-controls" className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-[4px] border border-[var(--border-soft)] p-0.5">
          {POSITIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => change(() => setPosition(p))}
              aria-pressed={position === p}
              className="rounded-[3px] px-3 py-1 text-[12px] font-bold"
              style={position === p
                ? { background: palette.chipBg, color: palette.text }
                : { color: palette.textMuted }}
            >
              Segment {p}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search
            size={icon.md}
            strokeWidth={icon.stroke}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--fg-muted)]"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => change(() => setSearch(e.target.value))}
            placeholder="Kod ya da etiket…"
            aria-label="Segment ara"
            className="h-8 w-52 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] pl-8 pr-2 text-[12px] text-[var(--fg)] outline-none focus:border-[var(--border)]"
          />
        </div>

        <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-2.5 text-[12px] font-semibold text-[var(--fg)]">
          <input
            type="checkbox"
            checked={onlyUnlabeled}
            onChange={(e) => change(() => setOnlyUnlabeled(e.target.checked))}
            className="h-3.5 w-3.5 accent-[var(--fg)]"
          />
          Sadece etiketsiz
        </label>

        <span className="ml-auto text-[11.5px] text-[var(--fg-muted)]">
          Etiket, pano kırılımlarında kodun yerine geçer.
        </span>
      </div>

      {segments.data && segments.data.total === 0 ? (
        <EmptyState
          title="Bu filtreye uyan segment yok"
          hint="Segmentler stok kartı dosyası yüklendiğinde otomatik çıkarılır."
        />
      ) : (
        <div data-tour="erpis-segments-table" className="flex flex-col gap-2">
          <ErpisTable
            columns={columns}
            rows={segments.data?.items ?? []}
            rowKey={(s) => s.id}
            sortBy={null}
            desc={false}
            onSort={() => {}}
            loading={segments.isFetching}
          />
          <TablePager page={page} pageSize={PAGE_SIZE} total={segments.data?.total ?? 0} onPage={setPage} />
        </div>
      )}
    </div>
  );
}

// Öneri tek tıkla kabul edilir: 4.400 segmenti elle yazmak pratik değil, ama öneriyi
// otomatik uygulamak da yanlış — anlamı yalnız kullanıcı biliyor.
function Suggestion({ segment, canWrite, onApply }: {
  segment: ErpisSkuSegment;
  canWrite: boolean;
  onApply: (segment: ErpisSkuSegment) => void;
}) {
  if (!segment.suggestedLabel) return <span className="text-[var(--fg-muted)]">—</span>;

  const alreadyApplied = segment.label === segment.suggestedLabel;

  return (
    <div className="flex items-center gap-1.5">
      <span className="line-clamp-1 text-[var(--fg-muted)]">{segment.suggestedLabel}</span>
      {canWrite && !alreadyApplied && (
        <button
          type="button"
          onClick={() => onApply(segment)}
          title="Öneriyi etiket olarak uygula"
          aria-label={`«${segment.suggestedLabel}» önerisini uygula`}
          className="shrink-0 rounded-[4px] border border-[var(--border-soft)] p-1 text-[var(--fg)] hover:bg-[var(--bg-subtle)]"
        >
          <Wand2 size={icon.sm} strokeWidth={icon.stroke} />
        </button>
      )}
    </div>
  );
}

function LabelCell({ segment, canWrite, onEdit }: {
  segment: ErpisSkuSegment;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const content = segment.label
    ? <span className="font-semibold">{segment.label}</span>
    : <span className="text-[var(--fg-muted)]">Etiketsiz</span>;

  if (!canWrite) return content;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full rounded-[4px] px-1 py-0.5 text-left hover:bg-[var(--bg-subtle)]"
      aria-label={`«${segment.code}» etiketini düzenle`}
    >
      {content}
      {segment.kind && (
        <span className="ml-1.5 text-[10px] text-[var(--fg-muted)]">({segment.kind})</span>
      )}
    </button>
  );
}

function LabelEditor({ segment, saving, onCancel, onSave }: {
  segment: ErpisSkuSegment;
  saving: boolean;
  onCancel: () => void;
  onSave: (label: string | null, kind: string | null) => void;
}) {
  const [label, setLabel] = useState(segment.label ?? segment.suggestedLabel ?? '');
  const [kind, setKind] = useState(segment.kind ?? '');

  return (
    <div
      className="flex items-center gap-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter') onSave(label || null, kind || null);
      }}
    >
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Etiket"
        aria-label="Segment etiketi"
        className="h-7 w-28 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-1.5 text-[12px] text-[var(--fg)] outline-none"
      />
      <input
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        placeholder="Sınıf"
        aria-label="Segment sınıfı"
        className="h-7 w-20 rounded-[4px] border border-[var(--border-soft)] bg-[var(--bg-subtle)] px-1.5 text-[12px] text-[var(--fg)] outline-none"
      />
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(label || null, kind || null)}
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
