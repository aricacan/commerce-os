'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Pencil, X } from 'lucide-react';
import { useErpisCategories, useRenameErpisCategory } from '@/hooks/erpis/useErpisCatalog';
import type { ErpisCategoryNode } from '@/lib/api';
import { useAuthStore } from '../../stores/auth';
import { WRITE_ROLES } from './ReparseButton';
import { EmptyState, ErrorState, formatNumber } from './shared';
import { icon, palette } from '../shared/design';

// ERP kategori ağacı (ana grup → alt grup).
//
// Ana sistemdeki kategorilerle ilgisi YOK ve bilerek bağlanmadı: iki ağaç farklı amaçlara
// hizmet ediyor. Burada yalnız AD değiştirilebilir — kod ERP'nin eşleşme anahtarı.
export function CategoriesTab() {
  const categories = useErpisCategories();
  const rename = useRenameErpisCategory();

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<number | null>(null);

  const roles = useAuthStore((state) => state.user?.roles);
  const canWrite = roles?.some((r) => WRITE_ROLES.includes(r)) ?? false;

  if (categories.isError) return <ErrorState />;

  const roots = categories.data ?? [];

  function toggle(id: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
      {categories.isLoading ? (
        <p className="text-[12px] text-[var(--fg-muted)]">Yükleniyor…</p>
      ) : roots.length === 0 ? (
        <EmptyState
          title="Kategori yok"
          hint="Kategoriler stok kartı dosyası yüklendiğinde ERP ağacından oluşturulur."
        />
      ) : (
        <div data-tour="erpis-categories-tree" className="overflow-x-auto rounded-[4px] border border-[var(--border-soft)]">
          {roots.map((node) => (
            <CategoryRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              editing={editing}
              canWrite={canWrite}
              saving={rename.isPending}
              onToggle={toggle}
              onEdit={setEditing}
              onSave={async (id, name) => {
                await rename.mutateAsync({ id, name });
                setEditing(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface RowProps {
  node: ErpisCategoryNode;
  depth: number;
  expanded: Set<number>;
  editing: number | null;
  canWrite: boolean;
  saving: boolean;
  onToggle: (id: number) => void;
  onEdit: (id: number | null) => void;
  onSave: (id: number, name: string) => void;
}

function CategoryRow(props: RowProps) {
  const { node, depth, expanded, editing, canWrite, saving, onToggle, onEdit, onSave } = props;
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  // Alt grupların kartları ana grupta görünmüyor (kart tek bir düğüme bağlı); toplam
  // sayı ağacın altındaki her şeyi kapsasın diye burada toplanıyor.
  const totalItems = node.itemCount + node.children.reduce((sum, c) => sum + c.itemCount, 0);

  return (
    <>
      <div
        className="flex items-center gap-2 border-b border-[var(--border-soft)] px-2 py-1.5 last:border-0"
        style={{ paddingLeft: 8 + depth * 20 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggle(node.id)}
            aria-expanded={isOpen}
            aria-label={`${node.name} alt gruplarını ${isOpen ? 'gizle' : 'göster'}`}
            className="rounded-[4px] p-0.5 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
          >
            {isOpen
              ? <ChevronDown size={icon.md} strokeWidth={icon.stroke} />
              : <ChevronRight size={icon.md} strokeWidth={icon.stroke} />}
          </button>
        ) : (
          <span className="w-[19px]" />
        )}

        {editing === node.id ? (
          <NameEditor
            initial={node.name}
            saving={saving}
            onCancel={() => onEdit(null)}
            onSave={(name) => onSave(node.id, name)}
          />
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[var(--fg)]">
              {node.name}
            </span>

            {node.source === 'Manual' && (
              <span
                className="rounded-full px-1.5 py-0.5 text-[9.5px] font-extrabold"
                style={{ background: palette.chipBg, color: palette.textMuted }}
              >
                Elle
              </span>
            )}

            <span className="shrink-0 text-[11px] tabular-nums text-[var(--fg-muted)]">
              {formatNumber(totalItems)} kart
            </span>

            {canWrite && (
              <button
                type="button"
                onClick={() => onEdit(node.id)}
                aria-label={`${node.name} adını düzenle`}
                className="rounded-[4px] p-1 text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)]"
              >
                <Pencil size={icon.sm} strokeWidth={icon.stroke} />
              </button>
            )}
          </>
        )}
      </div>

      {isOpen && node.children.map((child) => (
        <CategoryRow {...props} key={child.id} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

function NameEditor({ initial, saving, onCancel, onSave }: {
  initial: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initial);

  return (
    <div
      className="flex flex-1 items-center gap-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancel();
        if (e.key === 'Enter' && name.trim()) onSave(name.trim());
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Kategori adı"
        className="h-7 flex-1 rounded-[4px] border border-[var(--border)] bg-[var(--bg-subtle)] px-1.5 text-[12px] text-[var(--fg)] outline-none"
      />
      <button
        type="button"
        disabled={saving || !name.trim()}
        onClick={() => onSave(name.trim())}
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
