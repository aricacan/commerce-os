'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { listViewsApi, type SavedListView } from '@/lib/api/list-views';
import * as ui from '@/features/shared/panel';

/** Backend `SavedListViewRule.IgnoredKeys` ile aynı liste. */
const IGNORED_KEYS = new Set(['page']);

/**
 * Backend `SavedListViewRule.NormalizeQueryString` ile AYNI kural.
 *
 * Ekranda ve sunucuda farklı normalize edersek "bu görünüm zaten kayıtlı mı" kontrolü
 * yanlış cevap verir: kullanıcı aynı filtreyi ikinci kez kaydetmeye çalışır, sunucu 409 döner
 * ve ekran sebebini açıklayamaz.
 *
 * `page` atılır (7. sayfada kaydedilen görünüm her açılışta 7. sayfaya düşerdi), boş değerler
 * atılır, anahtarlar sıralanır. Değerler DEĞİŞTİRİLMEZ.
 */
export function normalizeQueryString(raw: string | null | undefined): string {
  if (!raw) return '';
  const trimmed = raw.trim().replace(/^\?/, '');
  if (!trimmed) return '';

  const pairs: Array<[string, string]> = [];
  for (const part of trimmed.split('&')) {
    if (!part) continue;
    const separator = part.indexOf('=');
    const key = separator < 0 ? part : part.slice(0, separator);
    const value = separator < 0 ? '' : part.slice(separator + 1);
    if (!key || !value || IGNORED_KEYS.has(key)) continue;
    pairs.push([key, value]);
  }

  return pairs
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

/** Aynı filtreyi ikinci kez kaydetmeye çalışmadan önce uyarabilmek için. */
export function findMatchingView(
  views: readonly SavedListView[],
  queryString: string,
): SavedListView | undefined {
  const normalized = normalizeQueryString(queryString);
  return views.find((v) => v.queryString === normalized);
}

/** Sayfa filtresiz açıldığında uygulanacak görünüm. Yoksa undefined. */
export function resolveDefaultView(
  views: readonly SavedListView[],
  currentQueryString: string,
): SavedListView | undefined {
  // Varsayılan YALNIZCA filtre tamamen boşken uygulanır: aksi halde kullanıcının paylaştığı
  // filtreli linki ezerdi.
  if (normalizeQueryString(currentQueryString) !== '') return undefined;
  return views.find((v) => v.isDefault && v.isOwn);
}

interface Props {
  /** Ekranın kimliği: "orders", "products"… */
  pageKey: string;
  /** Görünür kolon anahtarları; görünüm kaydedilirken saklanır. */
  columns?: string[];
  /** Kayıtlı görünüm kolon taşıyorsa ekran bunu uygular. */
  onApplyColumns?: (columns: string[]) => void;
}

/**
 * Kayıtlı görünüm çubuğu (FAZ 6).
 *
 * Filtre durumu zaten URL'de olduğu için görünüm uygulamak = o query string'e gitmek.
 * Ekranın kendi filtre mantığına HİÇ dokunulmaz.
 */
export function ListViewBar({ pageKey, columns, onApplyColumns }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.toString();

  const [views, setViews] = useState<SavedListView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [defaultApplied, setDefaultApplied] = useState(false);

  const reload = useCallback(async () => {
    try {
      setViews(await listViewsApi.list(pageKey));
      setError(null);
    } catch {
      // Görünümler yüklenemedi diye listenin kendisi kullanılamaz olmamalı.
      setError('Kayıtlı görünümler yüklenemedi.');
    }
  }, [pageKey]);

  useEffect(() => { void reload(); }, [reload]);

  // Varsayılan görünüm, sayfa filtresiz açıldığında BİR KEZ uygulanır. Tekrar uygulamak,
  // kullanıcının filtreleri temizlemesini imkânsız hale getirirdi.
  useEffect(() => {
    if (defaultApplied || views.length === 0) return;
    setDefaultApplied(true);

    const fallback = resolveDefaultView(views, currentQuery);
    if (fallback) apply(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [views, defaultApplied]);

  function apply(view: SavedListView) {
    router.replace(view.queryString ? `${pathname}?${view.queryString}` : pathname, { scroll: false });
    if (view.columns?.length && onApplyColumns) onApplyColumns(view.columns);
  }

  async function save() {
    const trimmed = name.trim();
    if (!trimmed) { setError('Görünüm adı boş olamaz.'); return; }

    try {
      await listViewsApi.create({
        pageKey,
        name: trimmed,
        queryString: normalizeQueryString(currentQuery),
        columns: columns?.length ? columns : null,
        isShared: false,
        isDefault: false,
      });
      setName('');
      setNaming(false);
      await reload();
    } catch {
      setError('Görünüm kaydedilemedi (aynı adda bir görünüm olabilir).');
    }
  }

  async function remove(view: SavedListView) {
    try {
      await listViewsApi.remove(view.id);
      await reload();
    } catch {
      setError('Görünüm silinemedi.');
    }
  }

  async function toggleDefault(view: SavedListView) {
    try {
      await listViewsApi.update(view.id, {
        pageKey: view.pageKey,
        name: view.name,
        queryString: view.queryString,
        columns: view.columns,
        isShared: view.isShared,
        isDefault: !view.isDefault,
      });
      await reload();
    } catch {
      setError('Varsayılan güncellenemedi.');
    }
  }

  const active = findMatchingView(views, currentQuery);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {views.map((view) => (
        <span
          key={view.id}
          className={`flex items-center gap-1 rounded-[2px] border px-2 py-1 text-[11px] font-semibold transition ${
            active?.id === view.id
              ? 'border-[var(--fg)] bg-[var(--bg-subtle)] text-[var(--fg)]'
              : 'border-[var(--border)] bg-[var(--card)] text-[var(--fg-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]'
          }`}
        >
          <button type="button" onClick={() => apply(view)} className="max-w-[14rem] truncate">
            {view.name}
          </button>
          {view.isOwn && (
            <>
              <button
                type="button"
                onClick={() => void toggleDefault(view)}
                title={view.isDefault ? 'Varsayılanı kaldır' : 'Varsayılan yap'}
                className="cursor-pointer text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
              >
                {view.isDefault ? '★' : '☆'}
              </button>
              <button
                type="button"
                onClick={() => void remove(view)}
                title="Görünümü sil"
                className="cursor-pointer text-[var(--fg-muted)] transition hover:text-[var(--danger)]"
              >
                ×
              </button>
            </>
          )}
        </span>
      ))}

      {naming ? (
        <span className="flex items-center gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') setNaming(false); }}
            placeholder="Görünüm adı"
            className={`${ui.input} w-40 rounded-[2px]`}
          />
          <button type="button" onClick={() => void save()} className={`${ui.button} rounded-[2px]`}>
            Kaydet
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => { setNaming(true); setError(null); }}
          className="cursor-pointer rounded-[2px] border border-dashed border-[var(--border)] px-2 py-0.5 text-[11px] font-medium text-[var(--fg-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--fg)]"
        >
          + Görünümü kaydet
        </button>
      )}

      {error && <span className={ui.errorText}>{error}</span>}
    </div>
  );
}
