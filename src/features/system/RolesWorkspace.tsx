'use client';

import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  rolesApi,
  type PermissionCatalogItem,
  type RoleDetail,
  type RoleResponse,
} from '@/lib/api/roles';

const ACTION_LABELS: Record<string, string> = {
  view: 'Görüntüle',
  create: 'Oluştur',
  update: 'Düzenle',
  delete: 'Sil',
  approve: 'Onayla',
  cancel: 'İptal',
  export: 'Dışa aktar',
  viewSensitive: 'Maliyet/Kâr',
};

/** groupKey → featureKey → o özelliğin aksiyonları. Saf; test edilebilir. */
export function groupCatalog(catalog: readonly PermissionCatalogItem[]) {
  const groups = new Map<string, Map<string, PermissionCatalogItem[]>>();

  for (const item of catalog) {
    let features = groups.get(item.groupKey);
    if (!features) {
      features = new Map();
      groups.set(item.groupKey, features);
    }

    const list = features.get(item.featureKey);
    if (list) list.push(item);
    else features.set(item.featureKey, [item]);
  }

  return groups;
}

export function RolesWorkspace() {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [selected, setSelected] = useState<RoleDetail | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([rolesApi.list(), rolesApi.catalog()])
      .then(([roleList, catalogItems]) => {
        setRoles(roleList);
        setCatalog(catalogItems);
      })
      .catch(() => setError('Roller yüklenemedi.'));
  }, []);

  const grouped = useMemo(() => groupCatalog(catalog), [catalog]);

  async function selectRole(id: number) {
    try {
      const detail = await rolesApi.get(id);
      setSelected(detail);
      setChecked(new Set(detail.permissionKeys));
      setError(null);
    } catch {
      setError('Rol yüklenemedi.');
    }
  }

  function toggle(key: string) {
    setChecked((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      await rolesApi.setPermissions(selected.id, [...checked]);
      setRoles(await rolesApi.list());
      setError(null);
    } catch {
      setError('İzinler kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="flex w-full flex-col gap-2 lg:w-64">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => selectRole(role.id)}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
              selected?.id === role.id ? 'border-primary bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <span className="flex items-center gap-2">
              {role.isSystem && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
              {role.name}
            </span>
            <span className="text-xs text-muted-foreground">{role.permissionCount}</span>
          </button>
        ))}
      </aside>

      <section className="flex flex-1 flex-col gap-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {!selected && (
          <p className="text-sm text-muted-foreground">
            İzinlerini düzenlemek için soldan bir rol seçin.
          </p>
        )}

        {selected && (
          <>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">{selected.name}</h2>
                {selected.isSystem && (
                  <p className="text-xs text-muted-foreground">
                    Sistem rolü — adı değiştirilemez, silinemez, pasifleştirilemez.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </header>

            <div className="flex flex-col gap-6">
              {[...grouped.entries()].map(([groupKey, features]) => (
                <div key={groupKey} className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">{groupKey}</h3>

                  {[...features.entries()].map(([featureKey, items]) => (
                    <div
                      key={featureKey}
                      className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
                    >
                      <span className="w-full font-mono text-xs sm:w-48">{featureKey}</span>

                      <div className="flex flex-wrap gap-3">
                        {items.map((item) => (
                          <label key={item.key} className="flex items-center gap-1.5 text-sm">
                            <input
                              type="checkbox"
                              checked={checked.has(item.key)}
                              onChange={() => toggle(item.key)}
                              className="h-4 w-4 rounded border-input"
                            />
                            {ACTION_LABELS[item.actionKey] ?? item.actionKey}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
